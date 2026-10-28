create schema if not exists ravn_private;
revoke all on schema ravn_private from public, anon, authenticated;
grant usage on schema ravn_private to service_role;
create table ravn_private.coach_daily_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 quota_day date not null,
 messages_used integer not null check (messages_used between 1 and 20),
 primary key (user_id, quota_day)
);
alter table ravn_private.coach_daily_usage enable row level security;
revoke all on ravn_private.coach_daily_usage from public, anon, authenticated;
grant select, insert, update on ravn_private.coach_daily_usage to service_role;

create function public.reserve_coach_message(p_user_id uuid, p_coach text)
returns table(allowed boolean, remaining integer, resets_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
declare
 v_day date := (statement_timestamp() at time zone 'Europe/London')::date;
 v_used integer;
begin
 if p_user_id is null or p_coach is null or p_coach not in ('jack','jill') then
   raise exception 'Valid member and coach required' using errcode = '22023';
 end if;
 insert into ravn_private.coach_daily_usage as usage (user_id, quota_day, messages_used)
 values (p_user_id, v_day, 1)
 on conflict (user_id, quota_day)
 do update set messages_used = usage.messages_used + 1
 where usage.messages_used < 20
 returning messages_used into v_used;
 return query select v_used is not null, greatest(0, 20 - coalesce(v_used,20)),
   (v_day + 1)::timestamp at time zone 'Europe/London';
end;
$$;
revoke all on function public.reserve_coach_message(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_coach_message(uuid,text) to service_role;
comment on function public.reserve_coach_message(uuid,text) is
'Server-only atomic reservation: 20 requests per member per UK calendar day shared across Jack/Jill. Derive user ID from verified authentication. Reserve before EVERY AI request, including retries; fail closed on errors. Does not itself call or enable AI.';
