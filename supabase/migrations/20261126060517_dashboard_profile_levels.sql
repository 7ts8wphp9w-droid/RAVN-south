create table public.vault_dashboard_actions (
  user_id uuid not null references public.vault_profiles(id) on delete cascade,
  action text not null check (action in ('training', 'nutrition', 'checkin', 'challenge')),
  activity_day date not null,
  period date generated always as (
    case when action = 'challenge' then activity_day - (extract(day from activity_day)::integer - 1)
         else activity_day end
  ) stored,
  points integer generated always as (
    case action when 'training' then 10 when 'nutrition' then 10
                when 'checkin' then 5 when 'challenge' then 20 end
  ) stored,
  primary key (user_id, action, period)
);

alter table public.vault_dashboard_actions enable row level security;
revoke all on public.vault_dashboard_actions from public, anon, authenticated;
grant select, insert on public.vault_dashboard_actions to authenticated;

create policy dashboard_activity_read_own on public.vault_dashboard_actions
  for select to authenticated using (user_id = (select auth.uid()));

-- Accept older on-device logs from before the rollout once per recorded period.
create policy dashboard_activity_record_own on public.vault_dashboard_actions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and activity_day <= (now() at time zone 'UTC')::date
    and (activity_day = (now() at time zone 'UTC')::date or activity_day < date '2026-11-27')
    and activity_day >= (
      select (p.created_at at time zone 'UTC')::date
      from public.vault_profiles p where p.id = (select auth.uid())
    )
  );

-- Keep the level calculation outside the exposed schema so only its result is shared.
create schema if not exists dashboard_private;
revoke all on schema dashboard_private from public, anon, authenticated;

create function dashboard_private.member_level(profile_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select (coalesce(sum(a.points), 0) / 50 + 1)::integer
  from public.vault_dashboard_actions a
  where a.user_id = profile_id
  having (select auth.uid()) is not null and exists (
    select 1 from public.vault_profiles p
    where p.id = profile_id and (p.discoverable or p.id = (select auth.uid()))
  );
$$;
revoke all on function dashboard_private.member_level(uuid) from public, anon, authenticated;
grant execute on function dashboard_private.member_level(uuid) to authenticated;

create view public.vault_member_levels with (security_invoker = true) as
select p.id, dashboard_private.member_level(p.id) as level
from public.vault_profiles p;

revoke all on public.vault_member_levels from public, anon, authenticated;
grant select on public.vault_member_levels to authenticated;
