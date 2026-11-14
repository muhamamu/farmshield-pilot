-- Run in one transaction with a trusted database operator. All fixtures roll back.
begin;
do $$
declare
 farmer_a uuid:=gen_random_uuid(); farmer_b uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid();
 farm_id uuid:=gen_random_uuid(); submission_id uuid; denied boolean; visible_count integer;
begin
 insert into auth.users(id,aud,role,email) values
 (farmer_a,'authenticated','authenticated',farmer_a::text||'@farmshield-test.invalid'),
 (farmer_b,'authenticated','authenticated',farmer_b::text||'@farmshield-test.invalid'),
 (admin_id,'authenticated','authenticated',admin_id::text||'@farmshield-test.invalid');
 insert into public.farmshield_admins(user_id) values(admin_id);
 perform set_config('request.jwt.claims',json_build_object('sub',farmer_a,'role','authenticated','is_anonymous',false)::text,true);
 execute 'set local role authenticated';
 insert into public.farmshield_registrations(owner_id,local_farm_id,farm_name,crop,area_ha,location,latitude,longitude,farmer_name,phone)
 values(farmer_a,farm_id,'Test farm','Maize',2.5,'Kura',11.77,8.43,'Test Farmer','+2348000000000') returning id into submission_id;
 select count(*) into visible_count from public.farmshield_registrations where id=submission_id;
 if visible_count<>1 then raise exception 'Owner cannot read own submission'; end if;
 denied:=false;
 begin insert into public.farmshield_admins(user_id) values(farmer_a); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Farmer escalated to admin'; end if;
 denied:=false;
 begin insert into public.farmshield_registrations(owner_id,local_farm_id,farm_name,crop,area_ha,location,latitude,longitude,farmer_name,phone)
 values(farmer_b,farm_id,'Spoofed','Maize',2,'Kura',11,8,'Test Farmer','+2348000000000'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Owner spoof succeeded'; end if;
 denied:=false;
 begin insert into public.farmshield_reviews(registration_id,reviewer_id,status,notes) values(submission_id,farmer_a,'rejected','Forged'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Farmer created review'; end if;
 denied:=false;
 begin update public.farmshield_registrations set farm_name='Changed' where id=submission_id; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Immutable submission changed'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',farmer_b,'role','authenticated')::text,true);
 select count(*) into visible_count from public.farmshield_registrations where id=submission_id;
 if visible_count<>0 then raise exception 'Other farmer can read submission'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
 select count(*) into visible_count from public.farmshield_registrations where id=submission_id;
 if visible_count<>1 then raise exception 'Admin cannot read submission'; end if;
 denied:=false;
 begin insert into public.farmshield_reviews(registration_id,reviewer_id,status,notes) values(submission_id,admin_id,'approved','Missing checks'); exception when check_violation then denied:=true; end;
 if not denied then raise exception 'Approval without checks succeeded'; end if;
 insert into public.farmshield_reviews(registration_id,reviewer_id,status,notes,location_checked,details_checked,contact_checked)
 values(submission_id,admin_id,'approved','Location, details and contact checked.',true,true,true);
 denied:=false;
 begin insert into public.farmshield_reviews(registration_id,reviewer_id,status,notes) values(submission_id,admin_id,'rejected','Second decision'); exception when unique_violation then denied:=true; end;
 if not denied then raise exception 'Duplicate decision succeeded'; end if;
 denied:=false;
 begin update public.farmshield_reviews set notes='Rewritten' where registration_id=submission_id; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Audit decision modified'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',farmer_b,'role','authenticated')::text,true);
 select count(*) into visible_count from public.farmshield_reviews where registration_id=submission_id;
 if visible_count<>0 then raise exception 'Other farmer can read private review notes'; end if;
 perform set_config('request.jwt.claims',json_build_object('sub',farmer_a,'role','authenticated')::text,true);
 select count(*) into visible_count from public.farmshield_reviews where registration_id=submission_id;
 if visible_count<>1 then raise exception 'Owner cannot read review'; end if;
 execute 'set local role anon';
 denied:=false;
 begin perform 1 from public.farmshield_registrations; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Anonymous user can read registrations'; end if;
 execute 'reset role';
end $$;
select 'PASS: owner isolation, admin-only reviews, escalation blocked, required checks, immutable history, anonymous denial' as result;
rollback;
