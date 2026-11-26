begin;
do $$
declare owner_id_test uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); reviewer_id_test uuid:=gen_random_uuid(); farm_id uuid:=gen_random_uuid(); doc_id uuid:=gen_random_uuid(); reg_id uuid; object_name text; farm_data jsonb; seen integer;
begin
 insert into auth.users(id,aud,role,email) values(owner_id_test,'authenticated','authenticated',owner_id_test||'@draft-test.invalid'),(other_id,'authenticated','authenticated',other_id||'@draft-test.invalid'),(reviewer_id_test,'authenticated','authenticated',reviewer_id_test||'@draft-test.invalid');
 insert into public.farmshield_admins(user_id) values(reviewer_id_test);
 perform set_config('request.jwt.claims',json_build_object('sub',owner_id_test,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.farmshield_farms(owner_id,local_farm_id,payload) values(owner_id_test,farm_id,jsonb_build_object('id',farm_id::text,'name','Synthetic farm','crop','Maize','size',2,'location','Test location'));
 object_name:=owner_id_test||'/drafts/'||farm_id||'/lease-'||doc_id||'.pdf';
 insert into storage.objects(bucket_id,name) values('farmshield-land-documents',object_name);
 insert into public.farmshield_land_document_drafts(id,owner_id,local_farm_id,object_path,document_type,rights_basis,retention_choice) values(doc_id,owner_id_test,farm_id,object_name,'lease','tenant','remove_after_review');
 select count(*) into seen from public.farmshield_land_document_drafts where id=doc_id;if seen<>1 then raise exception 'Owner cannot see private draft';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',reviewer_id_test,'role','authenticated')::text,true);
 select count(*) into seen from public.farmshield_land_document_drafts where id=doc_id;if seen<>0 then raise exception 'Draft visible before submission';end if;
 select count(*) into seen from storage.objects where name=object_name and bucket_id='farmshield-land-documents';if seen<>0 then raise exception 'Draft file visible before submission';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',owner_id_test,'role','authenticated')::text,true);
 farm_data:=jsonb_build_object('local_farm_id',farm_id::text,'farm_name','Synthetic farm','crop','Maize','area_ha',2,'location','Test location','latitude',11,'longitude',8,'boundary',jsonb_build_array(jsonb_build_array(11,8),jsonb_build_array(11.001,8),jsonb_build_array(11,8.001)),'farmer_name','Synthetic farmer','phone','08000000000');
 reg_id:=public.farmshield_submit_with_documents(farm_data,array[doc_id]);
 select count(*) into seen from public.farmshield_land_documents where registration_id=reg_id and id=doc_id;if seen<>1 then raise exception 'Submission did not attach draft';end if;
 select count(*) into seen from public.farmshield_land_document_drafts where id=doc_id;if seen<>0 then raise exception 'Submitted draft not cleared';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',reviewer_id_test,'role','authenticated')::text,true);
 select count(*) into seen from storage.objects where name=object_name and bucket_id='farmshield-land-documents';if seen<>1 then raise exception 'Reviewer cannot see finalized evidence';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true);
 select count(*) into seen from storage.objects where name=object_name and bucket_id='farmshield-land-documents';if seen<>0 then raise exception 'Evidence visible to unrelated farmer';end if;
 execute 'reset role';
end $$;
select 'PASS: private draft intake and atomic submission with synthetic evidence' as result;
rollback;
