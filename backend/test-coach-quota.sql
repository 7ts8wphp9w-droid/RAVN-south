begin;
do $$
declare u uuid := gen_random_uuid(); other_u uuid := gen_random_uuid(); r record; i integer;
begin
 insert into auth.users(id) values(u),(other_u);
 for i in 1..20 loop
 select * into r from public.reserve_coach_message(u, case when i % 2 = 0 then 'jack' else 'jill' end);
 if not r.allowed or r.remaining <> 20-i then raise exception 'Shared quota failed at %',i; end if;
 end loop;
 select * into r from public.reserve_coach_message(u,'jack');
 if r.allowed or r.remaining<>0 then raise exception '21st message admitted'; end if;
 select * into r from public.reserve_coach_message(u,'jill');
 if r.allowed then raise exception 'Switching coach bypasses cap'; end if;
 select * into r from public.reserve_coach_message(other_u,'jill');
 if not r.allowed or r.remaining<>19 then raise exception 'Member isolation failed'; end if;
 update ravn_private.coach_daily_usage set quota_day=quota_day-1 where user_id=u;
 select * into r from public.reserve_coach_message(u,'jack');
 if not r.allowed or r.remaining<>19 then raise exception 'Next day reset failed'; end if;
 if (r.resets_at at time zone 'Europe/London')::time <> time '00:00:00' then raise exception 'Reset not UK midnight'; end if;
 begin
 perform public.reserve_coach_message(u,'invalid');
 raise exception 'Invalid coach admitted';
 exception when invalid_parameter_value then null;
 end;
 if has_function_privilege('anon','public.reserve_coach_message(uuid,text)','execute')
 or has_function_privilege('authenticated','public.reserve_coach_message(uuid,text)','execute')
 then raise exception 'Client may execute server quota'; end if;
 if has_table_privilege('authenticated','ravn_private.coach_daily_usage','update')
 then raise exception 'Client may reset quota'; end if;
 if not has_function_privilege('service_role','public.reserve_coach_message(uuid,text)','execute') then raise exception 'Server cannot execute quota'; end if;
end $$;
select 'PASS: 20 shared, 21st blocked, coach switching blocked, member isolation, daily reset, UK midnight, invalid coach, client permissions' as result;
rollback;