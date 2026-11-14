-- Additive lifecycle state shared by every submission of one farm.
create table public.farmshield_farm_state (
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_farm_id uuid not null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  primary key(owner_id,local_farm_id)
);
insert into public.farmshield_farm_state(owner_id,local_farm_id)
select distinct owner_id,local_farm_id from public.farmshield_registrations;
alter table public.farmshield_farm_state enable row level security;
revoke all on public.farmshield_farm_state from anon,authenticated;
grant select on public.farmshield_farm_state to authenticated;
grant update(deleted_at) on public.farmshield_farm_state to authenticated;
create policy farm_state_read_own_or_admin on public.farmshield_farm_state for select to authenticated using (
 owner_id=(select auth.uid()) or exists(select 1 from public.farmshield_admins a where a.user_id=(select auth.uid()))
);
create policy farm_state_update_own_or_admin on public.farmshield_farm_state for update to authenticated using (
 owner_id=(select auth.uid()) or exists(select 1 from public.farmshield_admins a where a.user_id=(select auth.uid()))
) with check (
 owner_id=(select auth.uid()) or exists(select 1 from public.farmshield_admins a where a.user_id=(select auth.uid()))
);
alter table public.farmshield_registrations add constraint registrations_farm_state_fk
 foreign key(owner_id,local_farm_id) references public.farmshield_farm_state(owner_id,local_farm_id);

-- Client callers cannot create state rows or set another actor/timestamp.
-- This private trigger only creates the caller's state when submitting their farm.
create function farmshield_private.ensure_farm_state() returns trigger
language plpgsql security definer set search_path='' as $$
declare deleted timestamptz;
begin
 if auth.uid() is null or new.owner_id<>auth.uid() then raise exception 'Submit only your own farm' using errcode='42501'; end if;
 insert into public.farmshield_farm_state(owner_id,local_farm_id) values(new.owner_id,new.local_farm_id) on conflict do nothing;
 select deleted_at into deleted from public.farmshield_farm_state where owner_id=new.owner_id and local_farm_id=new.local_farm_id for share;
 if deleted is not null then raise exception 'Restore this deleted farm before submitting again'; end if;
 return new;
end $$;
revoke all on function farmshield_private.ensure_farm_state() from public,anon,authenticated;
create trigger ensure_farm_state before insert on public.farmshield_registrations for each row execute function farmshield_private.ensure_farm_state();

create function farmshield_private.stamp_farm_deletion() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to change farm state' using errcode='42501'; end if;
 if new.deleted_at is null then new.deleted_by:=null;
 elsif old.deleted_at is null then new.deleted_at:=clock_timestamp();new.deleted_by:=auth.uid();
 else new.deleted_at:=old.deleted_at;new.deleted_by:=old.deleted_by;
 end if;
 return new;
end $$;
revoke all on function farmshield_private.stamp_farm_deletion() from public,anon,authenticated;
create trigger stamp_farm_deletion before update on public.farmshield_farm_state for each row execute function farmshield_private.stamp_farm_deletion();

create function farmshield_private.require_active_review() returns trigger
language plpgsql security invoker set search_path='' as $$
declare deleted timestamptz;
begin
 select s.deleted_at into deleted from public.farmshield_farm_state s
 join public.farmshield_registrations r using(owner_id,local_farm_id)
 where r.id=new.registration_id for share of s;
 if not found or deleted is not null then raise exception 'Deleted farms cannot be reviewed. Restore the farm first.'; end if;
 return new;
end $$;
revoke all on function farmshield_private.require_active_review() from public,anon,authenticated;
create trigger require_active_review before insert on public.farmshield_reviews for each row execute function farmshield_private.require_active_review();
