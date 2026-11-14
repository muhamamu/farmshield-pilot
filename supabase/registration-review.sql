-- Apply with Supabase apply_migration as farm_registration_reviews.
-- Submissions and decisions are immutable snapshots. Admin membership is provisioned
-- only through a trusted database operator; neither farmers nor admins can grant it.
create table public.farmshield_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.farmshield_admins enable row level security;
revoke all on public.farmshield_admins from anon, authenticated;
grant select on public.farmshield_admins to authenticated;
create policy admins_read_own_membership on public.farmshield_admins
  for select to authenticated using (user_id=(select auth.uid()));

create table public.farmshield_registrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  local_farm_id uuid not null,
  farm_name text not null check (length(trim(farm_name)) between 1 and 80),
  crop text not null check (length(trim(crop)) between 1 and 60),
  area_ha double precision not null check (area_ha>0 and area_ha<'Infinity'::float8),
  location text not null check (length(trim(location)) between 1 and 300),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  boundary jsonb not null default '[]'::jsonb check (jsonb_typeof(boundary)='array' and jsonb_array_length(boundary)<=1000),
  farmer_name text not null check (length(trim(farmer_name)) between 2 and 100),
  phone text not null check (phone ~ '^[+0-9 ()-]{7,30}$'),
  created_at timestamptz not null default clock_timestamp()
);
create index farmshield_registrations_owner_farm_idx on public.farmshield_registrations(owner_id,local_farm_id,created_at desc);
create index farmshield_registrations_created_idx on public.farmshield_registrations(created_at desc);
alter table public.farmshield_registrations enable row level security;
revoke all on public.farmshield_registrations from anon, authenticated;
grant select on public.farmshield_registrations to authenticated;
grant insert (owner_id,local_farm_id,farm_name,crop,area_ha,location,latitude,longitude,boundary,farmer_name,phone) on public.farmshield_registrations to authenticated;
create policy registrations_read_own_or_admin on public.farmshield_registrations
  for select to authenticated using (
    owner_id=(select auth.uid()) or exists(select 1 from public.farmshield_admins where user_id=(select auth.uid()))
  );
create policy registrations_submit_own on public.farmshield_registrations
  for insert to authenticated with check (owner_id=(select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false')='false');

create table public.farmshield_reviews (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.farmshield_registrations(id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references auth.users(id),
  status text not null check (status in ('approved','rejected','changes_requested')),
  notes text not null check (length(trim(notes)) between 1 and 2000),
  location_checked boolean not null default false,
  details_checked boolean not null default false,
  contact_checked boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  constraint approval_requires_checks check (status<>'approved' or (location_checked and details_checked and contact_checked))
);
create index farmshield_reviews_reviewer_idx on public.farmshield_reviews(reviewer_id);
alter table public.farmshield_reviews enable row level security;
revoke all on public.farmshield_reviews from anon, authenticated;
grant select on public.farmshield_reviews to authenticated;
grant insert (registration_id,reviewer_id,status,notes,location_checked,details_checked,contact_checked) on public.farmshield_reviews to authenticated;
create policy reviews_read_visible_registrations on public.farmshield_reviews
  for select to authenticated using (
    exists(select 1 from public.farmshield_registrations r
      where r.id=farmshield_reviews.registration_id and r.owner_id=(select auth.uid()))
    or exists(select 1 from public.farmshield_admins a where a.user_id=(select auth.uid()))
  );
create policy reviews_admin_insert on public.farmshield_reviews
  for insert to authenticated with check (reviewer_id=(select auth.uid()) and exists(select 1 from public.farmshield_admins where user_id=(select auth.uid())));

-- Validate outline shape on the server, including non-browser submissions.
create schema if not exists farmshield_private;
revoke all on schema farmshield_private from public, anon, authenticated;
create function farmshield_private.validate_registration_boundary() returns trigger
language plpgsql security invoker set search_path='' as $$
declare corner jsonb;
begin
  if jsonb_array_length(new.boundary) between 1 and 2 then
    raise exception 'A land outline needs at least three corners';
  end if;
  for corner in select value from jsonb_array_elements(new.boundary) loop
    if jsonb_typeof(corner)<>'array' then raise exception 'Invalid outline corner'; end if;
    if jsonb_array_length(corner)<>2 then raise exception 'Invalid outline corner'; end if;
    if jsonb_typeof(corner->0)<>'number' or jsonb_typeof(corner->1)<>'number' then raise exception 'Invalid outline coordinates'; end if;
    if not ((corner->>0)::double precision between -90 and 90 and (corner->>1)::double precision between -180 and 180) then raise exception 'Outline coordinates out of range'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function farmshield_private.validate_registration_boundary() from public,anon,authenticated;
create trigger validate_registration_boundary before insert on public.farmshield_registrations
  for each row execute function farmshield_private.validate_registration_boundary();
