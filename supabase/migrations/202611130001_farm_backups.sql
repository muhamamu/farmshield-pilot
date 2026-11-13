-- Private account backups. Apply only to the selected FarmShield project.
create table public.farmshield_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint backup_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint backup_payload_version check (payload @> '{"version":1}'::jsonb),
  constraint backup_payload_size check (octet_length(payload::text) <= 1048576)
);

alter table public.farmshield_backups enable row level security;
revoke all on public.farmshield_backups from anon, authenticated;
grant select, insert, update on public.farmshield_backups to authenticated;

create policy "Read own backup" on public.farmshield_backups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own backup" on public.farmshield_backups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own backup" on public.farmshield_backups
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
