CREATE OR REPLACE FUNCTION public.arena_record_visit()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 member_id uuid := auth.uid();
 visit_day date := (now() at time zone 'Europe/London')::date;
 streak integer;
begin
 if member_id is null then raise exception 'Sign in to continue'; end if;
 insert into public.arena_login_streaks as s (user_id,last_day,days) values(member_id,visit_day,1)
 on conflict(user_id) do update set last_day=excluded.last_day, days=case when s.last_day=visit_day-1 then s.days+1 else 1 end
 where s.last_day<visit_day returning days into streak;
 -- The streak row is locked even on a repeat visit, serialising simultaneous requests.
 if not exists(select 1 from public.arena_badge_rolls where user_id=member_id and day=visit_day and source='login' and won) then
 insert into public.arena_badge_rolls(user_id,day,source,step,won)
 values(member_id,visit_day,'login',(select candidate from unnest(array['Motivation','Determination','Gratification','Sustainability','Maintenance']) candidate
 where candidate is distinct from (select r.step from public.arena_badge_rolls r where r.user_id=member_id and r.source='login' and r.won and r.day<visit_day order by r.day desc limit 1)
 order by random() limit 1),true)
 on conflict(user_id,day,source,step) do update set won=true;
 end if;
 return coalesce(streak,(select days from public.arena_login_streaks where user_id=member_id));
end $function$
;
create function public.arena_claim_login_badge() returns jsonb language plpgsql security definer set search_path='' as $$
declare member_id uuid := auth.uid(); today_uk date := (now() at time zone 'Europe/London')::date; existing boolean;
begin
 if member_id is null then raise exception 'Sign in to continue'; end if;
 insert into public.arena_login_streaks(user_id,last_day,days) values(member_id,today_uk,1) on conflict do nothing;
 perform 1 from public.arena_login_streaks where user_id=member_id for update;
 select exists(select 1 from public.arena_badge_rolls where user_id=member_id and day=today_uk and source='login' and won) into existing;
 perform public.arena_record_visit();
 if existing then return null; end if;
 return (select jsonb_build_object('step',step,'day',day) from public.arena_badge_rolls where user_id=member_id and day=today_uk and source='login' and won limit 1);
end $$;
revoke all on function public.arena_claim_login_badge() from public,anon;
grant execute on function public.arena_claim_login_badge() to authenticated;
