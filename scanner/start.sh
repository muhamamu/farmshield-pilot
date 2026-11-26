#!/bin/sh
set -eu

mkdir -p /var/lib/clamav /run/clamav
chown -R clamav:clamav /var/lib/clamav /run/clamav

# An up-to-date database is required. Do not start the HTTP endpoint if the
# initial signature update failed or no database is available.
gosu clamav freshclam --stdout --quiet
test -s /var/lib/clamav/main.cvd -o -s /var/lib/clamav/main.cld

gosu clamav clamd --foreground --config-file=/etc/clamav/clamd.conf &
clamd_pid=$!

# Refresh signatures periodically while this instance is warm. Clamd reloads
# the database during its normal self-check after freshclam replaces it.
(
  while sleep 7200; do
    gosu clamav freshclam --stdout --quiet || echo "ClamAV signature refresh failed"
  done
) &
refresh_pid=$!

node /app/server.mjs &
server_pid=$!
trap 'kill "$server_pid" "$clamd_pid" "$refresh_pid" 2>/dev/null || true' EXIT TERM INT
wait "$server_pid"

