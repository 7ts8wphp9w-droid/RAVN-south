create table dashboard_private.hidden_honour_challenge_completions (
 member_id uuid not null references public.vault_profiles(id) on delete cascade,
 challenge_id uuid not null,
 kind text not null check (kind in ('reel','tag')),
 primary key (member_id, challenge_id)
);
alter table dashboard_private.hidden_honour_challenge_completions enable row level security;
revoke all on dashboard_private.hidden_honour_challenge_completions from public, anon, authenticated;

create table dashboard_private.hidden_honour_awards (
 member_id uuid not null references public.vault_profiles(id) on delete cascade,
 honour text not null check (honour in ('gym-rat','the-goat','the-raven')),
 earned_at timestamptz not null default now(),
 primary key (member_id, honour)
);
alter table dashboard_private.hidden_honour_awards enable row level security;
revoke all on dashboard_private.hidden_honour_awards from public, anon, authenticated;

-- Expiry alerts are generated after the Reel Challenge's voting window closes.
create function dashboard_private.record_honour_reel_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into dashboard_private.hidden_honour_challenge_completions(member_id, challenge_id, kind)
 values (new.user_id, new.post_id, 'reel') on conflict do nothing;
 return new;
end;
$$;
revoke all on function dashboard_private.record_honour_reel_completion() from public, anon, authenticated;

create trigger record_honour_reel_completion after insert on public.vault_expiry_alerts
 for each row when (new.label = 'reel challenge')
 execute function dashboard_private.record_honour_reel_completion();

-- Record settled matches for both participants. An unanswered tag counts as a Reel Challenge for its creator.
create function dashboard_private.record_honour_tag_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.outcome in ('win','draw') and new.response_id is not null then
  insert into dashboard_private.hidden_honour_challenge_completions(member_id, challenge_id, kind)
  values (new.creator_id,new.challenge_id,'tag'),(new.challenger_id,new.challenge_id,'tag')
  on conflict do nothing;
 elsif new.outcome = 'no_response' and new.response_id is null then
  insert into dashboard_private.hidden_honour_challenge_completions(member_id, challenge_id, kind)
  values (new.creator_id,new.challenge_id,'reel') on conflict do nothing;
 end if;
 return new;
end;
$$;
revoke all on function dashboard_private.record_honour_tag_completion() from public, anon, authenticated;

create trigger record_honour_tag_completion after update of outcome on public.arena_tag_matches
 for each row when (new.resolved_at is not null)
 execute function dashboard_private.record_honour_tag_completion();

insert into dashboard_private.hidden_honour_challenge_completions(member_id, challenge_id, kind)
 select user_id, post_id, 'reel' from public.vault_expiry_alerts where label = 'reel challenge'
 union all
 select entrant.id, match.challenge_id, 'tag' from public.arena_tag_matches match
 cross join lateral (values (match.creator_id),(match.challenger_id)) entrant(id)
 where match.resolved_at is not null and match.response_id is not null and match.outcome in ('win','draw')
 union all
 select creator_id,challenge_id,'reel' from public.arena_tag_matches
 where resolved_at is not null and response_id is null and outcome = 'no_response'
 on conflict do nothing;

create function dashboard_private.claim_my_hidden_honours()
returns text[] language plpgsql security definer set search_path = '' as $$
declare
 member uuid := auth.uid();
 current_level integer;
begin
 if member is null then
  raise exception 'Sign in to continue' using errcode = '42501';
 end if;
 current_level := dashboard_private.member_level(member);
 if current_level >= 50 then
  with step_contributions as (
   select p.step, p.badges, p.badges/10+p.bronze as bronze, p.badges/50+p.silver as silver, p.badges/100 as gold
   from public.vault_progress p where p.user_id = member
   union all
   select m.gold_step,0,0,0,1 from public.arena_tag_matches m where m.winner_id = member and m.gold_step is not null
  ), trophies as (
   select sum(badges) as badges, sum(bronze) as bronze, sum(silver) as silver, sum(gold) as gold,
          count(distinct step) filter (where gold > 0) as gold_steps
   from step_contributions
  ), journal as (
   select (select count(*) from public.vault_checkins c where c.user_id = member) as checkins,
          (select count(*) from public.vault_dashboard_actions a
           where a.user_id = member and a.action = 'accountability' and a.entry is not null) as accountability
  ), challenges as (
   select count(*) filter (where kind = 'reel') as reels, count(*) filter (where kind = 'tag') as tags
   from dashboard_private.hidden_honour_challenge_completions where member_id = member
  )
  insert into dashboard_private.hidden_honour_awards(member_id, honour)
  select member,r.honour from (values
   ('gym-rat',    50,  150, 15,  0,  0, 0,  60,  30,  10,  5),
   ('the-goat',  125,  550, 30, 10,  5, 0, 175,  80,  50, 25),
   ('the-raven', 300, 1500, 90, 25, 15, 3, 450, 250, 150, 75)
  ) r(honour, level, badges, bronze, silver, gold, gold_steps, checkins, accountability, reels, tags)
  cross join trophies t cross join journal j cross join challenges c
  where current_level >= r.level and t.badges >= r.badges
    and t.bronze >= r.bronze and t.silver >= r.silver and t.gold >= r.gold and t.gold_steps >= r.gold_steps
    and j.checkins >= r.checkins and j.accountability >= r.accountability and c.reels >= r.reels and c.tags >= r.tags
  on conflict do nothing;
 end if;
 return coalesce((select array_agg(a.honour order by a.honour) from dashboard_private.hidden_honour_awards a
  where a.member_id = member),array[]::text[]);
end;
$$;
revoke all on function dashboard_private.claim_my_hidden_honours() from public, anon, authenticated;
grant execute on function dashboard_private.claim_my_hidden_honours() to authenticated;

create function public.claim_my_hidden_honours()
returns text[] language sql security invoker set search_path = ''
return dashboard_private.claim_my_hidden_honours();
revoke all on function public.claim_my_hidden_honours() from public, anon, authenticated;
grant execute on function public.claim_my_hidden_honours() to authenticated;
