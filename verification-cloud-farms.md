# Account farm storage verification

The map and workspace use farmshield_farms in Supabase as the primary record store.
There are no seeded farmers, field alerts, activities, sample selectors or reset-demo actions.
Farms load for the current authenticated account; the map remains usable without signing in.
Updates use the last loaded server revision and only report success after the write finishes.

## Checks

- All 80 Node tests pass, including cloud write failures, stale revision conflicts,
  account filtering, payload filtering and legacy import ownership.
- Production build passes and preserves both Vercel and Sites package outputs.
- tests/cloud-farms-access.sql passes in a rolled-back transaction: owner-only
  access, private notes hidden from other farmers and admins, server revision
  protection, deleted-farm editing protection, atomic legacy imports and account binding.
- Existing registration and deletion access scripts remain part of database checks.
- Existing submitted farm records were copied into the primary store. Older device
  details are offered through an explicit import, and old cloud snapshots remain readable.

## Limits

Browser interaction and visual verification require a connected browser and remain unverified.
Live regional forecasts require the existing Open-Meteo server configuration. The weather
panel shows a short unavailable state and retry action rather than developer setup text.

## Approved admin map and Data tools

Admins have an approved-farm layer with pins for every active, currently approved submission, outlines where supplied, safe text popups, refresh and Show all on map. It reads verification snapshots only and clears on account/role changes. Admins can zoom out to fit approved locations beyond Kano; the normal map stays focused on Kano.

Data tools previously crashed with ReferenceError: useAuth is not defined. The unused call is removed. tests/regional-render.test.mjs reproduces that failure against the real component and now renders both forecast and satellite panels. A boundary keeps a future panel failure from blanking the workspace. All 86 tests pass; browser visual verification remains unavailable.
