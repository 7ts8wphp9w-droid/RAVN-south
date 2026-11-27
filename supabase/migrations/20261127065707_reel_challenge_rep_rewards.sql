create schema if not exists private;

-- Award records outlive the video and remain linked to the member who earned them.
create table public.arena_reel_rep_rewards (
 post_id uuid not null,
 user_id uuid not null references public.vault_profiles(id) on delete cascade,
 milestone integer not null,
 tier text not null,
 step text not null check (step in ('Motivation','Determination','Gratification','Sustainability','Maintenance')),
 earned_on date not null default ((now() at time zone 'Europe/London')::date),
 primary key (post_id, milestone, tier),
 check (
  (tier = 'badge' and milestone in (10,100,1000))
  or (tier = 'bronze' and milestone in (50,100))
  or (tier = 'silver' and milestone in (500,1000))
 )
);
create index arena_reel_rep_rewards_member on public.arena_reel_rep_rewards(user_id);
alter table public.arena_reel_rep_rewards enable row level security;
revoke all on public.arena_reel_rep_rewards from public, anon, authenticated;
grant select on public.arena_reel_rep_rewards to authenticated;
create policy own_reel_rep_rewards on public.arena_reel_rep_rewards
 for select to authenticated using (user_id = (select auth.uid()));

create function private.award_reel_rep_milestones(reel_id uuid) returns void
language plpgsql set search_path = '' as $$
declare
 reel_owner uuid;
 rep_count bigint;
 steps constant text[] := array['Motivation','Determination','Gratification','Sustainability','Maintenance'];
begin
 select p.user_id into reel_owner from public.vault_posts p
 where p.id = reel_id and p.challenge = 'reel' and p.expires_at > statement_timestamp();
 if not found then return; end if;

 -- Serialise counts for simultaneous Reps on the same video.
 perform pg_advisory_xact_lock(hashtextextended(reel_id::text, 1));
 select count(*) into rep_count from public.vault_likes l where l.post_id = reel_id;

 insert into public.arena_reel_rep_rewards(post_id, user_id, milestone, tier, step)
 select reel_id, reel_owner, m.reps, m.tier, steps[1 + floor(random() * cardinality(steps))::int]
 from (values (10,'badge'), (50,'bronze'), (100,'bronze'), (100,'badge'),
              (500,'silver'), (1000,'silver'), (1000,'badge')) m(reps,tier)
 where m.reps <= rep_count
 on conflict (post_id, milestone, tier) do nothing;
end;
$$;
revoke all on function private.award_reel_rep_milestones(uuid) from public, anon, authenticated;

create function private.on_reel_rep() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() = new.user_id then
  perform private.award_reel_rep_milestones(new.post_id);
 end if;
 return new;
end;
$$;
revoke all on function private.on_reel_rep() from public, anon, authenticated;

create trigger award_reel_rep_milestones
 after insert on public.vault_likes
 for each row execute function private.on_reel_rep();

-- Reels now earn milestones during their 24 hours. Tag Challenges retain the winner rule.
alter policy hosts_close_challenges on public.arena_challenge_results with check (
 exists (
  select 1 from public.vault_posts p where p.id = challenge_id
  and p.user_id = (select auth.uid()) and p.challenge = 'tag' and p.reply_to is null
 )
);

select private.award_reel_rep_milestones(p.id)
from public.vault_posts p where p.challenge = 'reel' and p.expires_at > statement_timestamp();

-- Reuse the existing profile, gallery and leaderboard totals.
create view private.arena_member_awards with (security_invoker = true) as
 select user_id, step, day, 'badge'::text as tier from public.arena_badge_rolls where won
 union all
 select user_id, step, earned_on, tier from public.arena_reel_rep_rewards;
revoke all on private.arena_member_awards from public, anon, authenticated;
grant select on private.arena_member_awards to authenticated;

create or replace view public.vault_progress with (security_invoker = true) as
 select user_id, step, (count(*) filter (where tier = 'badge'))::int as badges,
        (count(*) filter (where tier = 'bronze'))::int as bronze,
        (count(*) filter (where tier = 'silver'))::int as silver
 from private.arena_member_awards group by user_id, step;

create or replace view public.arena_step_scores with (security_barrier = true) as
 select a.user_id, a.step, count(*)::int as badges,
        (count(*) filter (where a.day >= date_trunc('month',now())::date))::int as month_badges
 from private.arena_member_awards a join public.vault_profiles p on p.id = a.user_id
 where p.discoverable and a.tier = 'badge' group by a.user_id, a.step;

create or replace view public.arena_full_month_leaders with (security_barrier = true) as
with counts as (
 select user_id, day, count(*) as n from private.arena_member_awards where tier = 'badge' group by user_id, day
), participants as (
 select distinct user_id, date_trunc('month',day)::date m from counts where day < date_trunc('month',now())::date
), standings as (
 select p.user_id, p.m, d.day, sum(coalesce(c.n,0)) over(partition by p.user_id,p.m order by d.day) as total
 from participants p cross join lateral generate_series(p.m,p.m+interval '1 month - 1 day',interval '1 day') d(day)
 left join counts c on c.user_id = p.user_id and c.day = d.day::date
), ranked as (
 select *, rank() over(partition by day order by total desc) as place from standings
)
select user_id, to_char(m,'YYYY-MM') as month, count(*)::int as days from ranked
group by user_id, m having bool_and(place = 1 and total > 0);
