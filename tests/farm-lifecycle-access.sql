begin;
do $$
declare owner_a uuid:=gen_random_uuid();owner_b uuid:=gen_random_uuid();admin_id uuid:=gen_random_uuid();farm_id uuid:=gen_random_uuid();registration uuid;denied boolean;seen integer;actor uuid;stamp timestamptz;
begin
 insert into auth.users(id,aud,role,email) values
 (owner_a,'authenticated','authenticated',owner_a::text||'@farmshield-test.invalid'),
 (owner_b,'authenticated','authenticated',owner_b::text||'@farmshield-test.invalid'),
 (admin_id,'authenticated','authenticated',admin_id::text||'@farmshield-test.invalid');
 insert into public.farmshield_admins(user_id) values(admin_id);
 perform set_config('request.jwt.claims',json_build_object('sub',owner_a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.farmshield_registrations(owner_id,local_farm_id,farm_name,crop,area_ha,location,latitude,longitude,farmer_name,phone)
 values(owner_a,farm_id,'Lifecycle test','Maize',2,'Kura',11.7,8.4,'Test Farmer','+2348000000000') returning id into registration;
 select count(*) into seen from public.farmshield_farm_state where owner_id=owner_a and local_farm_id=farm_id;
 if seen<>1 then raise exception 'Submission did not create lifecycle state';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
 insert into public.farmshield_reviews(registration_id,reviewer_id,status,notes,location_checked,details_checked,contact_checked)
 values(registration,admin_id,'approved','Checked',true,true,true);
 perform set_config('request.jwt.claims',json_build_object('sub',owner_b,'role','authenticated')::text,true);
 update public.farmshield_farm_state set deleted_at=now() where owner_id=owner_a and local_farm_id=farm_id;
 get diagnostics seen=row_count;if seen<>0 then raise exception 'Other account deleted farm';end if;
 select count(*) into seen from public.farmshield_farm_state where owner_id=owner_a;
 if seen<>0 then raise exception 'Other account read lifecycle';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',owner_a,'role','authenticated')::text,true);
 denied:=false;begin update public.farmshield_farm_state set deleted_by=admin_id where owner_id=owner_a;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Deletion actor could be forged';end if;
 update public.farmshield_farm_state set deleted_at='2000-01-01' where owner_id=owner_a and local_farm_id=farm_id;
 select deleted_by,deleted_at into actor,stamp from public.farmshield_farm_state where owner_id=owner_a and local_farm_id=farm_id;
 if actor<>owner_a or stamp='2000-01-01'::timestamptz then raise exception 'Deletion not stamped by server';end if;
 select count(*) into seen from public.farmshield_reviews where registration_id=registration and status='approved';
 if seen<>1 then raise exception 'Deleting lost approval history';end if;
 denied:=false;begin
 insert into public.farmshield_registrations(owner_id,local_farm_id,farm_name,crop,area_ha,location,latitude,longitude,farmer_name,phone)
 values(owner_a,farm_id,'Resubmit deleted','Maize',2,'Kura',11.7,8.4,'Test Farmer','+2348000000000');
 exception when raise_exception then if sqlerrm like 'Restore this deleted farm%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Deleted farm resubmitted';end if;
 perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
 denied:=false;begin insert into public.farmshield_reviews(registration_id,reviewer_id,status,notes) values(registration,admin_id,'rejected','Deleted');
 exception when raise_exception then if sqlerrm like 'Deleted farms cannot be reviewed%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Deleted farm reviewed';end if;
 update public.farmshield_farm_state set deleted_at=null where owner_id=owner_a and local_farm_id=farm_id;
 select deleted_by,deleted_at into actor,stamp from public.farmshield_farm_state where owner_id=owner_a and local_farm_id=farm_id;
 if actor is not null or stamp is not null then raise exception 'Admin restore failed';end if;
 update public.farmshield_farm_state set deleted_at=now() where owner_id=owner_a and local_farm_id=farm_id;
 select deleted_by into actor from public.farmshield_farm_state where owner_id=owner_a and local_farm_id=farm_id;
 if actor<>admin_id then raise exception 'Admin deletion not attributed';end if;
 execute 'set local role anon';denied:=false;begin perform 1 from public.farmshield_farm_state;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous lifecycle access';end if;
 execute 'reset role';
end $$;
select 'PASS: owner/admin deletion and restoration, actor stamping, isolation, retained approvals, deleted-review and resubmit protection' as result;
rollback;
