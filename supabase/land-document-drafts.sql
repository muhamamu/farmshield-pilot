-- Private draft intake. Apply after land-documents-policy-fix.sql.
-- Draft files retain their object keys when submitted; no public URLs or copies.
create table public.farmshield_land_document_drafts (
 id uuid primary key,
 owner_id uuid not null references auth.users(id),
 local_farm_id uuid not null,
 object_path text not null unique,
 document_type text not null check(document_type in ('occupancy','assignment','lease','survey','other')),
 rights_basis text not null check(rights_basis in ('owner','tenant','customary','joint','other')),
 retention_choice text not null check(retention_choice in ('remove_after_review','retain_for_future')),
 created_at timestamptz not null default clock_timestamp(),
 foreign key(owner_id,local_farm_id) references public.farmshield_farms(owner_id,local_farm_id),
 check(object_path ~ ('^'||owner_id::text||'/drafts/'||local_farm_id::text||'/'||document_type||'-'||id::text||'\.(pdf|jpg|png)$'))
);
alter table public.farmshield_land_document_drafts enable row level security;
revoke all on public.farmshield_land_document_drafts from public,anon,authenticated;
grant select,delete on public.farmshield_land_document_drafts to authenticated;
grant insert(id,owner_id,local_farm_id,object_path,document_type,rights_basis,retention_choice) on public.farmshield_land_document_drafts to authenticated;
create policy land_drafts_read_own on public.farmshield_land_document_drafts for select to authenticated using(owner_id=auth.uid());
create policy land_drafts_delete_own on public.farmshield_land_document_drafts for delete to authenticated using(owner_id=auth.uid());
create policy land_drafts_insert_own on public.farmshield_land_document_drafts for insert to authenticated with check(
 owner_id=auth.uid() and coalesce(auth.jwt()->>'is_anonymous','false')='false'
 and exists(select 1 from public.farmshield_farms f join public.farmshield_farm_state s using(owner_id,local_farm_id) where f.owner_id=auth.uid() and f.local_farm_id=farmshield_land_document_drafts.local_farm_id and s.deleted_at is null)
 and farmshield_private.land_object_exists_for_owner(object_path)
);
create policy land_draft_objects_upload on storage.objects for insert to authenticated with check(
 bucket_id='farmshield-land-documents' and coalesce(auth.jwt()->>'is_anonymous','false')='false'
 and name ~ '^[0-9a-f-]{36}/drafts/[0-9a-f-]{36}/(occupancy|assignment|lease|survey|other)-[0-9a-f-]{36}\.(pdf|jpg|png)$'
 and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.farmshield_farms f join public.farmshield_farm_state s using(owner_id,local_farm_id) where f.owner_id=auth.uid() and f.local_farm_id::text=(storage.foldername(name))[3] and s.deleted_at is null)
);
create policy land_draft_objects_read on storage.objects for select to authenticated using(
 bucket_id='farmshield-land-documents' and (storage.foldername(name))[2]='drafts' and (
 (storage.foldername(name))[1]=auth.uid()::text or
 (exists(select 1 from public.farmshield_admins a where a.user_id=auth.uid()) and exists(select 1 from public.farmshield_land_documents d where d.object_path=storage.objects.name))
 )
);
-- Extend the legacy path check to permit a finalized draft. The insert policy
-- below binds the draft to the exact owner, farm, document and registration.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.farmshield_land_documents'::regclass and contype='c' and pg_get_constraintdef(oid) like '%object_path%' loop
  execute format('alter table public.farmshield_land_documents drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.farmshield_land_documents add constraint land_documents_object_path_check check(
 object_path ~ ('^'||owner_id::text||'/'||registration_id::text||'/'||document_type||'-'||id::text||'\.(pdf|jpg|png)$') or
 object_path ~ ('^'||owner_id::text||'/drafts/[0-9a-f-]{36}/'||document_type||'-'||id::text||'\.(pdf|jpg|png)$')
);
alter policy land_document_metadata_submit on public.farmshield_land_documents with check(
 owner_id=auth.uid() and coalesce(auth.jwt()->>'is_anonymous','false')='false'
 and farmshield_private.land_object_exists_for_owner(object_path)
 and exists(select 1 from public.farmshield_registrations r join public.farmshield_farm_state s using(owner_id,local_farm_id) where r.id=registration_id and r.owner_id=auth.uid() and s.deleted_at is null and (
 split_part(farmshield_land_documents.object_path,'/',2)=r.id::text or exists(select 1 from public.farmshield_land_document_drafts d where d.owner_id=r.owner_id and d.local_farm_id=r.local_farm_id and d.id=farmshield_land_documents.id and d.object_path=farmshield_land_documents.object_path and d.document_type=farmshield_land_documents.document_type and d.rights_basis=farmshield_land_documents.rights_basis and d.retention_choice=farmshield_land_documents.retention_choice)))
 );
-- Register and attach selected evidence in one transaction; a failed attachment
-- rolls back the registration, leaving the private drafts intact.
create function public.farmshield_submit_with_documents(farm_data jsonb, draft_ids uuid[]) returns uuid
language plpgsql security invoker set search_path='' as $$
declare registration uuid; expected integer; attached integer;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')<>'false' then raise exception 'Sign in first'; end if;
 expected:=coalesce(cardinality(draft_ids),0);
 insert into public.farmshield_registrations(owner_id,local_farm_id,farm_name,crop,area_ha,location,latitude,longitude,boundary,farmer_name,phone)
 values(auth.uid(),(farm_data->>'local_farm_id')::uuid,farm_data->>'farm_name',farm_data->>'crop',(farm_data->>'area_ha')::float8,farm_data->>'location',(farm_data->>'latitude')::float8,(farm_data->>'longitude')::float8,farm_data->'boundary',farm_data->>'farmer_name',farm_data->>'phone') returning id into registration;
 insert into public.farmshield_land_documents(id,registration_id,owner_id,object_path,document_type,rights_basis,retention_choice)
 select d.id,registration,d.owner_id,d.object_path,d.document_type,d.rights_basis,d.retention_choice from public.farmshield_land_document_drafts d where d.id=any(draft_ids) and d.owner_id=auth.uid() and d.local_farm_id=(farm_data->>'local_farm_id')::uuid;
 get diagnostics attached=row_count;
 if attached<>expected then raise exception 'One or more draft documents could not be attached'; end if;
 delete from public.farmshield_land_document_drafts where id=any(draft_ids) and owner_id=auth.uid() and local_farm_id=(farm_data->>'local_farm_id')::uuid;
 return registration;
end $$;
revoke all on function public.farmshield_submit_with_documents(jsonb,uuid[]) from public,anon;
grant execute on function public.farmshield_submit_with_documents(jsonb,uuid[]) to authenticated;
