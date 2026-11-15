create table public.farmshield_journal (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 local_farm_id uuid not null,
 kind text not null check(kind in ('planting','watering','fertiliser','pests','harvest','field-check','other')),
 entry_date date not null check(entry_date>='2000-01-01'::date and entry_date<='2100-12-31'::date),
 notes text not null check(length(trim(notes)) between 1 and 4000),
 photo_paths text[] not null default '{}' check(cardinality(photo_paths)<=4),
 archived boolean not null default false,
 revision bigint not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 foreign key(owner_id,local_farm_id) references public.farmshield_farms(owner_id,local_farm_id) on delete cascade
);
create index journal_owner_farm_date on public.farmshield_journal(owner_id,local_farm_id,entry_date desc,id);
create table public.farmshield_tasks (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 local_farm_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 160),
 due_date date not null check(due_date>='2000-01-01'::date and due_date<='2100-12-31'::date),
 remind_on date not null check(remind_on<=due_date and remind_on>='2000-01-01'::date),
 priority text not null default 'normal' check(priority in ('normal','high')),
 completed boolean not null default false,
 completed_at timestamptz,
 archived boolean not null default false,
 source_alert_key text check(source_alert_key is null or length(source_alert_key) between 1 and 100),
 revision bigint not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 foreign key(owner_id,local_farm_id) references public.farmshield_farms(owner_id,local_farm_id) on delete cascade,
 unique(owner_id,local_farm_id,source_alert_key)
);
create index tasks_owner_farm_due on public.farmshield_tasks(owner_id,local_farm_id,due_date,id);
alter table public.farmshield_journal enable row level security;
alter table public.farmshield_tasks enable row level security;
revoke all on public.farmshield_journal,public.farmshield_tasks from anon,authenticated;
grant select on public.farmshield_journal,public.farmshield_tasks to authenticated;
grant insert(id,owner_id,local_farm_id,kind,entry_date,notes,photo_paths) on public.farmshield_journal to authenticated;
grant update(kind,entry_date,notes,photo_paths,archived) on public.farmshield_journal to authenticated;
grant insert(id,owner_id,local_farm_id,title,due_date,remind_on,priority,source_alert_key) on public.farmshield_tasks to authenticated;
grant update(title,due_date,remind_on,priority,completed,archived) on public.farmshield_tasks to authenticated;
create policy journal_owner_read on public.farmshield_journal for select to authenticated using(owner_id=(select auth.uid()));
create policy tasks_owner_read on public.farmshield_tasks for select to authenticated using(owner_id=(select auth.uid()));
create policy journal_owner_insert on public.farmshield_journal for insert to authenticated with check(owner_id=(select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false')='false' and exists(select 1 from public.farmshield_farms f join public.farmshield_farm_state s using(owner_id,local_farm_id) where f.owner_id=farmshield_journal.owner_id and f.local_farm_id=farmshield_journal.local_farm_id and s.deleted_at is null));
create policy tasks_owner_insert on public.farmshield_tasks for insert to authenticated with check(owner_id=(select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false')='false' and exists(select 1 from public.farmshield_farms f join public.farmshield_farm_state s using(owner_id,local_farm_id) where f.owner_id=farmshield_tasks.owner_id and f.local_farm_id=farmshield_tasks.local_farm_id and s.deleted_at is null));
create policy journal_owner_update on public.farmshield_journal for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and exists(select 1 from public.farmshield_farm_state s where s.owner_id=farmshield_journal.owner_id and s.local_farm_id=farmshield_journal.local_farm_id and s.deleted_at is null));
create policy tasks_owner_update on public.farmshield_tasks for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and exists(select 1 from public.farmshield_farm_state s where s.owner_id=farmshield_tasks.owner_id and s.local_farm_id=farmshield_tasks.local_farm_id and s.deleted_at is null));
create function farmshield_private.validate_activity() returns trigger language plpgsql security invoker set search_path='' as $$
declare path text;expected text;
begin
 if tg_op='UPDATE' then
  if (new.id,new.owner_id,new.local_farm_id,new.created_at) is distinct from (old.id,old.owner_id,old.local_farm_id,old.created_at) then raise exception 'Activity identity cannot change';end if;
  new.revision:=old.revision+1;new.updated_at:=clock_timestamp();
 end if;
 if tg_table_name='farmshield_journal' then
  if new.entry_date>(now() at time zone 'Africa/Lagos')::date then raise exception 'Journal dates cannot be in the future';end if;
  expected:=new.owner_id::text||'/'||new.local_farm_id::text||'/'||new.id::text||'/';
  foreach path in array new.photo_paths loop
   if path is null or left(path,length(expected))<>expected or substring(path from length(expected)+1)!~'^[0-9a-f-]{36}\.jpg$' then raise exception 'Invalid private photo path';end if;
  end loop;
 else
  if tg_op='UPDATE' then
   if new.source_alert_key is distinct from old.source_alert_key then raise exception 'Task source cannot change';end if;
   if new.completed is distinct from old.completed then new.completed_at:=case when new.completed then clock_timestamp() else null end;end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function farmshield_private.validate_activity() from public,anon,authenticated;
create trigger journal_validate before insert or update on public.farmshield_journal for each row execute function farmshield_private.validate_activity();
create trigger tasks_validate before insert or update on public.farmshield_tasks for each row execute function farmshield_private.validate_activity();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('farmshield-journal','farmshield-journal',false,2097152,array['image/jpeg']);
create policy journal_photos_read on storage.objects for select to authenticated using(bucket_id='farmshield-journal' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy journal_photos_insert on storage.objects for insert to authenticated with check(bucket_id='farmshield-journal' and (storage.foldername(name))[1]=(select auth.uid())::text and name~'^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' and coalesce((select auth.jwt())->>'is_anonymous','false')='false' and exists(select 1 from public.farmshield_farms f join public.farmshield_farm_state s using(owner_id,local_farm_id) where f.owner_id=(select auth.uid()) and f.local_farm_id::text=(storage.foldername(name))[2] and s.deleted_at is null));
create policy journal_photos_cleanup on storage.objects for delete to authenticated using(bucket_id='farmshield-journal' and (storage.foldername(name))[1]=(select auth.uid())::text);
