create or replace view private.arena_member_awards with (security_invoker = true) as
 select user_id, step, day, 'badge'::text as tier, true as regular_badge
 from public.arena_badge_rolls where won
 union all
 select user_id, step, earned_on, tier, false
 from public.arena_reel_rep_rewards;

-- Keep the collection totals and existing badge thresholds. Only regular badges
-- and trophies earned through those thresholds contribute the new points.
create or replace view public.vault_progress with (security_invoker = true) as
 with totals as (
  select user_id, step,
         count(*) filter (where tier = 'badge') as badges,
         count(*) filter (where tier = 'bronze') as bronze,
         count(*) filter (where tier = 'silver') as silver,
         count(*) filter (where regular_badge) as regular_badges
  from private.arena_member_awards
  group by user_id, step
 )
 select user_id, step, badges::int as badges, bronze::int as bronze, silver::int as silver,
        regular_badges * 5 + (badges / 10) * 10 + (badges / 50) * 50
          + (badges / 100) * 100 as regular_award_points
 from totals;

create or replace function dashboard_private.member_level(profile_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
 select ((coalesce((select sum(a.points) from public.vault_dashboard_actions a where a.user_id=profile_id),0)
  + coalesce((select sum(p.regular_award_points) from public.vault_progress p where p.user_id=profile_id),0)::bigint
  + 25*(select count(*) from public.arena_tag_matches m where m.winner_id=profile_id))/50+1)::integer
 where (select auth.uid()) is not null and exists (
  select 1 from public.vault_profiles p where p.id=profile_id and (p.discoverable or p.id=(select auth.uid()))
 );
$$;
