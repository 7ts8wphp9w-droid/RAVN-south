alter table public.vault_profiles add column discoverable boolean not null default true;
alter policy profiles_read on public.vault_profiles using (discoverable or id=(select auth.uid()));
alter table public.vault_posts add column effects jsonb not null default '{}',
 add column activity text not null default '' check(length(activity)<=200),
 add column place text not null default '' check(length(place)<=200),
 add column tags uuid[] not null default '{}' check(cardinality(tags)<=100),
 add column challenge text check(challenge in ('tag','reel') and kind='reel' and media_type='video'),
 add column reply_to uuid references public.vault_posts(id) on delete cascade;
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.vault_posts'::regclass and contype='c' and pg_get_constraintdef(oid) like '%kind <> %reel%media_type%' loop
 execute format('alter table public.vault_posts drop constraint %I',c.conname); end loop; end $$;
alter table public.vault_posts add check(kind<>'reel' or media_path is not null);
create policy posts_edit on public.vault_posts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke update on public.vault_posts from authenticated;
grant update(body,media_type,media_path,effects,activity,place,tags) on public.vault_posts to authenticated;
create table public.vault_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.vault_posts on delete cascade,user_id uuid not null references public.vault_profiles on delete cascade, body text not null check(length(trim(body)) between 1 and 500),created_at timestamptz not null default now());
alter table public.vault_comments enable row level security;
grant select,insert on public.vault_comments to authenticated;
create index on public.vault_comments(post_id,created_at);
create policy comment_read on public.vault_comments for select to authenticated using(exists(select 1 from public.vault_posts p where p.id=post_id));
create policy comment_write on public.vault_comments for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.vault_posts p where p.id=post_id));
-- Only aggregate badge counts and public profile IDs enter the member standings.
create view public.arena_step_scores with(security_barrier=true) as
select c.user_id,c.step,count(*)::int badges,count(*) filter(where c.day>=date_trunc('month',now())::date)::int month_badges
from public.vault_checkins c join public.vault_profiles p on p.id=c.user_id where p.discoverable group by c.user_id,c.step;
revoke all on public.arena_step_scores from public,anon;
grant select on public.arena_step_scores to authenticated;
-- Compare daily cumulative badge totals inside each completed calendar month.
create view public.arena_full_month_leaders with (security_barrier=true) as
with counts as (
 select user_id,day,count(*) as n from public.vault_checkins group by user_id,day
), participants as (
 select distinct user_id,date_trunc('month',day)::date m from counts where day<date_trunc('month',now())::date
), standings as (
 select p.user_id,p.m,d.day,sum(coalesce(c.n,0)) over(partition by p.user_id,p.m order by d.day) as total
 from participants p cross join lateral generate_series(p.m,p.m+interval '1 month - 1 day',interval '1 day') d(day)
 left join counts c on c.user_id=p.user_id and c.day=d.day::date
), ranked as (
 select *,rank() over(partition by day order by total desc) as place from standings
)
select user_id,to_char(m,'YYYY-MM') as month,count(*)::int as days from ranked
group by user_id,m having bool_and(place=1 and total>0);
revoke all on public.arena_full_month_leaders from public,anon;
grant select on public.arena_full_month_leaders to authenticated;
