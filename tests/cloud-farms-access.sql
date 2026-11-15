begin;
do $$
declare owner_a uuid:=gen_random_uuid();owner_b uuid:=gen_random_uuid();admin_id uuid:=gen_random_uuid();farm_id uuid:=gen_random_uuid();import_id uuid:=gen_random_uuid();payload jsonb;seen integer;rev bigint;denied boolean;imported boolean;
begin
 insert into auth.users(id,aud,role,email) values
 (owner_a,'authenticated','authenticated',owner_a::text||'@farmshield-test.invalid'),
 (owner_b,'authenticated','authenticated',owner_b::text||'@farmshield-test.invalid'),
 (admin_id,'authenticated','authenticated',admin_id::text||'@farmshield-test.invalid');
 insert into public.farmshield_admins(user_id) values(admin_id);
 payload:=jsonb_build_object('id',farm_id::text,'name','Real fixture farm','crop','Maize','size',2.5,'location','Kura','point',jsonb_build_object('lat',11.7,'lon',8.4),'notes','Private field notes','en','Private draft');
 perform set_config('request.jwt.claims',json_build_object('sub',owner_a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.farmshield_farms(owner_id,local_farm_id,payload) values(owner_a,farm_id,payload);
 select count(*) into seen from public.farmshield_farms f where f.owner_id=owner_a and f.local_farm_id=farm_id and f.payload->>'notes'='Private field notes';
 if seen<>1 then raise exception 'Owner cannot load saved field records';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',owner_b,'role','authenticated')::text,true);
 select count(*) into seen from public.farmshield_farms where owner_id=owner_a;
 if seen<>0 then raise exception 'Other farmer read private farms';end if;
 update public.farmshield_farms f set payload=f.payload where owner_id=owner_a;
 get diagnostics seen=row_count;if seen<>0 then raise exception 'Other farmer changed farm';end if;
 denied:=false;begin insert into public.farmshield_farms(owner_id,local_farm_id,payload) values(owner_a,gen_random_uuid(),payload);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Owner spoof allowed';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
 select count(*) into seen from public.farmshield_farms where owner_id=owner_a;
 if seen<>0 then raise exception 'Admin read unsubmitted private field notes';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',owner_a,'role','authenticated')::text,true);
 update public.farmshield_farms f set payload=jsonb_set(f.payload,'{notes}','"Updated field note"') where owner_id=owner_a and local_farm_id=farm_id and revision=1;
 get diagnostics seen=row_count;if seen<>1 then raise exception 'Owner update failed';end if;
 select revision into rev from public.farmshield_farms where owner_id=owner_a and local_farm_id=farm_id;
 if rev<>2 then raise exception 'Revision not incremented';end if;
 update public.farmshield_farms f set payload=f.payload where owner_id=owner_a and local_farm_id=farm_id and revision=1;
 get diagnostics seen=row_count;if seen<>0 then raise exception 'Stale revision overwrote newer data';end if;
 denied:=false;begin update public.farmshield_farms set revision=100 where owner_id=owner_a;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Revision could be forged';end if;
 denied:=false;begin update public.farmshield_farms f set payload=jsonb_set(f.payload,'{size}','-1') where owner_id=owner_a;exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Invalid cloud farm accepted';end if;
 update public.farmshield_farm_state set deleted_at=now() where owner_id=owner_a and local_farm_id=farm_id;
 denied:=false;begin update public.farmshield_farms f set payload=f.payload where owner_id=owner_a;exception when raise_exception then denied:=true;end;
 if not denied then raise exception 'Deleted farm edited';end if;
 update public.farmshield_farm_state set deleted_at=null where owner_id=owner_a and local_farm_id=farm_id;
 imported:=public.farmshield_import_farm(payload||jsonb_build_object('_importOwner',owner_a::text),false);
 if imported then raise exception 'Import overwrote newer cloud farm';end if;
 imported:=public.farmshield_import_farm(payload||jsonb_build_object('id',import_id::text,'_importOwner',owner_a::text),true);
 if not imported then raise exception 'Deleted legacy farm import failed';end if;
 select count(*) into seen from public.farmshield_farms f join public.farmshield_farm_state s using(owner_id,local_farm_id)
 where f.owner_id=owner_a and f.local_farm_id=import_id and s.deleted_at is not null and not(f.payload?'_importOwner');
 if seen<>1 then raise exception 'Legacy import not atomic or owner marker leaked';end if;
 denied:=false;begin perform public.farmshield_import_farm(payload||jsonb_build_object('_importOwner',owner_b::text),false);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Cross-account import accepted';end if;
 execute 'set local role anon';denied:=false;begin perform 1 from public.farmshield_farms;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous farm access';end if;
 execute 'reset role';
end $$;
select 'PASS: durable farm records, private owner isolation, blocked admin access to private notes, guarded revisions, atomic import, account binding and anonymous denial' as result;
rollback;
