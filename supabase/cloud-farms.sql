create table public.farmshield_farms (
 owner_id uuid not null references auth.users(id) on delete cascade,
 local_farm_id uuid not null,
 payload jsonb not null,
 revision bigint not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(owner_id,local_farm_id),
 foreign key(owner_id,local_farm_id) references public.farmshield_farm_state(owner_id,local_farm_id),
 check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=512000)
);
-- Preserve the latest real submission, including deleted farms, before adding guards.
insert into public.farmshield_farms(owner_id,local_farm_id,payload,created_at,updated_at)
select distinct on(owner_id,local_farm_id) owner_id,local_farm_id,
 jsonb_build_object('id',local_farm_id::text,'name',farm_name,'crop',crop,'size',area_ha,'location',location,
 'point',jsonb_build_object('lat',latitude,'lon',longitude),'boundary',boundary,'_migrationSource','registration'),created_at,created_at
from public.farmshield_registrations order by owner_id,local_farm_id,created_at desc;
alter table public.farmshield_farms enable row level security;
revoke all on public.farmshield_farms from anon,authenticated;
grant select on public.farmshield_farms to authenticated;
grant insert(owner_id,local_farm_id,payload) on public.farmshield_farms to authenticated;
grant update(payload) on public.farmshield_farms to authenticated;
create policy farms_read_own on public.farmshield_farms for select to authenticated using(owner_id=(select auth.uid()));
create policy farms_insert_own on public.farmshield_farms for insert to authenticated with check(owner_id=(select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy farms_update_own on public.farmshield_farms for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create trigger ensure_cloud_farm_state before insert on public.farmshield_farms for each row execute function farmshield_private.ensure_farm_state();
create function farmshield_private.validate_cloud_farm() returns trigger
language plpgsql security invoker set search_path='' as $$
declare data jsonb:=new.payload;corner jsonb;deleted timestamptz;
begin
 if data->>'id' is distinct from new.local_farm_id::text then raise exception 'Farm ID must match its cloud record';end if;
 if jsonb_typeof(data->'name') is distinct from 'string' or length(trim(data->>'name')) not between 1 and 80 then raise exception 'Invalid farm name';end if;
 if jsonb_typeof(data->'crop') is distinct from 'string' or length(trim(data->>'crop')) not between 1 and 60 then raise exception 'Invalid crop';end if;
 if jsonb_typeof(data->'location') is distinct from 'string' or length(trim(data->>'location')) not between 1 and 300 then raise exception 'Invalid farm location';end if;
 if jsonb_typeof(data->'size') is distinct from 'number' then raise exception 'Invalid farm area';end if;
 if not ((data->>'size')::float8>0 and (data->>'size')::float8<'Infinity'::float8) then raise exception 'Invalid farm area';end if;
 if data?'point' and data->'point'<>'null'::jsonb then
  if jsonb_typeof(data->'point'->'lat') is distinct from 'number' or jsonb_typeof(data->'point'->'lon') is distinct from 'number' then raise exception 'Invalid farm pin';end if;
  if not ((data->'point'->>'lat')::float8 between -90 and 90 and (data->'point'->>'lon')::float8 between -180 and 180) then raise exception 'Invalid farm pin';end if;
 end if;
 if data?'boundary' then
  if jsonb_typeof(data->'boundary') is distinct from 'array' then raise exception 'Invalid farm outline';end if;
  if jsonb_array_length(data->'boundary') between 1 and 2 or jsonb_array_length(data->'boundary')>1000 then raise exception 'Invalid farm outline';end if;
  for corner in select value from jsonb_array_elements(data->'boundary') loop
   if jsonb_typeof(corner)<>'array' then raise exception 'Invalid outline corner';end if;
   if jsonb_array_length(corner)<>2 then raise exception 'Invalid outline corner';end if;
   if jsonb_typeof(corner->0) is distinct from 'number' or jsonb_typeof(corner->1) is distinct from 'number' then raise exception 'Invalid outline coordinates';end if;
   if not ((corner->>0)::float8 between -90 and 90 and (corner->>1)::float8 between -180 and 180) then raise exception 'Invalid outline coordinates';end if;
  end loop;
 end if;
 select deleted_at into deleted from public.farmshield_farm_state where owner_id=new.owner_id and local_farm_id=new.local_farm_id for share;
 if deleted is not null then raise exception 'Restore the farm before editing it';end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1;new.updated_at:=clock_timestamp();end if;
 return new;
end $$;
revoke all on function farmshield_private.validate_cloud_farm() from public,anon,authenticated;
create trigger validate_cloud_farm before insert or update on public.farmshield_farms for each row execute function farmshield_private.validate_cloud_farm();

-- Legacy imports are atomic and never overwrite an edited cloud farm.
create or replace function public.farmshield_import_farm(farm_data jsonb,was_deleted boolean default false) returns boolean
language plpgsql security invoker set search_path='' as $$
declare farm_id uuid:=(farm_data->>'id')::uuid;saved public.farmshield_farms%rowtype;deleted timestamptz;
begin
 if auth.uid() is null then raise exception 'Sign in to import farms' using errcode='42501';end if;
 if farm_data->>'_importOwner' is distinct from auth.uid()::text then raise exception 'The account changed. Restart this import.' using errcode='42501';end if;
 farm_data:=farm_data-'_importOwner';
 select * into saved from public.farmshield_farms where owner_id=auth.uid() and local_farm_id=farm_id for update;
 if found then
  select deleted_at into deleted from public.farmshield_farm_state where owner_id=auth.uid() and local_farm_id=farm_id;
  if saved.revision<>1 or saved.payload->>'_migrationSource' is distinct from 'registration' or deleted is not null then return false;end if;
  update public.farmshield_farms set payload=farm_data where owner_id=auth.uid() and local_farm_id=farm_id;
 else
  insert into public.farmshield_farms(owner_id,local_farm_id,payload) values(auth.uid(),farm_id,farm_data);
 end if;
 if was_deleted then update public.farmshield_farm_state set deleted_at=clock_timestamp() where owner_id=auth.uid() and local_farm_id=farm_id;end if;
 return true;
end $$;
revoke all on function public.farmshield_import_farm(jsonb,boolean) from public,anon;
grant execute on function public.farmshield_import_farm(jsonb,boolean) to authenticated;

-- Keep submissions from still-open older clients available in the cloud store.
create function farmshield_private.preserve_submitted_farm() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.farmshield_farms(owner_id,local_farm_id,payload)
 values(new.owner_id,new.local_farm_id,jsonb_build_object('id',new.local_farm_id::text,'name',new.farm_name,'crop',new.crop,'size',new.area_ha,'location',new.location,
 'point',jsonb_build_object('lat',new.latitude,'lon',new.longitude),'boundary',new.boundary,'_migrationSource','registration')) on conflict do nothing;
 return new;
end $$;
revoke all on function farmshield_private.preserve_submitted_farm() from public,anon,authenticated;
create trigger preserve_submitted_farm after insert on public.farmshield_registrations for each row execute function farmshield_private.preserve_submitted_farm();
