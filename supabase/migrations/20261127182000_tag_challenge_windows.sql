create table public.arena_tag_matches (
 challenge_id uuid primary key,
 creator_id uuid not null references public.vault_profiles(id) on delete cascade,
 challenger_id uuid not null references public.vault_profiles(id) on delete cascade,
 invited_at timestamptz not null,
 reply_deadline timestamptz not null,
 creator_expires_at timestamptz not null,
 response_id uuid unique,
 response_expires_at timestamptz,
 creator_reps bigint,
 response_reps bigint,
 outcome text check (outcome in ('win','draw','no_response','cancelled')),
 resolved_at timestamptz,
 winner_id uuid references public.vault_profiles(id) on delete cascade,
 gold_step text check (gold_step in ('Motivation','Determination','Gratification','Sustainability','Maintenance')),
 check (creator_id <> challenger_id)
);
create index arena_tag_matches_due on public.arena_tag_matches(reply_deadline) where resolved_at is null;
alter table public.arena_tag_matches enable row level security;
revoke all on public.arena_tag_matches from public,anon,authenticated;
grant select on public.arena_tag_matches to authenticated;
create policy members_read_tag_matches on public.arena_tag_matches for select to authenticated
 using ((select auth.uid()) in (creator_id,challenger_id) or (
  (resolved_at is null or resolved_at > now()-interval '7 days')
  and exists(select 1 from public.vault_profiles p where p.id=creator_id and p.discoverable)
  and exists(select 1 from public.vault_profiles p where p.id=challenger_id and p.discoverable)
 ));

create function private.create_tag_match(post public.vault_posts, opponent uuid, invited timestamptz)
returns void language plpgsql set search_path='' as $$
begin
 if opponent = post.user_id or not exists (select 1 from public.vault_profiles where id=opponent and discoverable) then
  raise exception 'Choose one other Repbook member.';
 end if;
 insert into public.arena_tag_matches(challenge_id,creator_id,challenger_id,invited_at,reply_deadline,creator_expires_at)
 values (post.id,post.user_id,opponent,invited,invited+interval '24 hours',post.expires_at);
end $$;
revoke all on function private.create_tag_match(public.vault_posts,uuid,timestamptz) from public,anon,authenticated;

create function public.arena_tag_existing_reel(reel uuid, opponent uuid)
returns void language plpgsql security definer set search_path='' as $$
declare post public.vault_posts; invited timestamptz;
begin
 select * into post from public.vault_posts where id=reel and user_id=(select auth.uid()) for update;
 invited := clock_timestamp();
 if not found or post.kind<>'reel' or post.challenge is not null or post.media_type is distinct from 'video'
    or post.expires_at <= invited then
  raise exception 'Choose an active video reel of your own.';
 end if;
 perform private.create_tag_match(post,opponent,invited);
 update public.vault_posts set challenge='tag' where id=reel;
end $$;
revoke all on function public.arena_tag_existing_reel(uuid,uuid) from public,anon,authenticated;
grant execute on function public.arena_tag_existing_reel(uuid,uuid) to authenticated;

create or replace function public.vault_validate_challenge_entry() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent public.vault_posts; match public.arena_tag_matches;
begin
 if new.challenge='tag' and new.reply_to is null then
  if new.kind<>'reel' or new.media_type is distinct from 'video' or cardinality(new.tags)<>1 then
   raise exception 'Choose one member and a video for the Tag Challenge.';
  end if;
 elsif new.reply_to is not null then
  select * into match from public.arena_tag_matches where challenge_id=new.reply_to for update;
  if found then
   if match.challenger_id<>new.user_id or new.challenge is distinct from 'tag'
      or new.kind<>'reel' or new.media_type is distinct from 'video'
      or match.response_id is not null or match.resolved_at is not null
      or clock_timestamp()>=match.reply_deadline then
    raise exception 'This Tag Challenge can no longer accept a response.';
   end if;
  else
   select * into parent from public.vault_posts where id=new.reply_to and expires_at>now();
   if not found or parent.challenge is null or parent.reply_to is not null
      or parent.challenge is distinct from new.challenge
      or (parent.challenge='tag' and not (new.user_id=any(parent.tags))) then
    raise exception 'Choose a challenge that you can enter.';
   end if;
  end if;
 end if;
 return new;
end $$;

create function private.record_tag_entry() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.reply_to is null then
  perform private.create_tag_match(new,new.tags[1],new.created_at);
 else
  update public.arena_tag_matches set response_id=new.id,response_expires_at=new.expires_at where challenge_id=new.reply_to;
 end if;
 return new;
end $$;
revoke all on function private.record_tag_entry() from public,anon,authenticated;
create trigger record_tag_entry after insert on public.vault_posts
 for each row when (new.challenge='tag') execute function private.record_tag_entry();

alter policy hosts_close_challenges on public.arena_challenge_results with check (
 exists (select 1 from public.vault_posts p where p.id=challenge_id and p.user_id=(select auth.uid())
  and p.challenge='tag' and p.reply_to is null)
 and not exists (select 1 from public.arena_tag_matches m where m.challenge_id=arena_challenge_results.challenge_id)
);

-- Wait for eligible voting already in flight, and reject changes after that reel expires.
create function private.lock_tag_vote() returns trigger
language plpgsql security definer set search_path='' as $$
declare
 reel uuid := case when tg_op='DELETE' then old.post_id else new.post_id end;
 deadline timestamptz;
begin
 select case when m.challenge_id=reel then m.creator_expires_at else m.response_expires_at end into deadline
 from public.arena_tag_matches m where m.challenge_id=reel or m.response_id=reel for update;
 if found and clock_timestamp()>=deadline and pg_trigger_depth()=1 then
  raise exception 'This reel’s voting window has closed.';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function private.lock_tag_vote() from public,anon,authenticated;
create trigger lock_tag_vote before insert or delete on public.vault_likes
 for each row execute function private.lock_tag_vote();

create function private.settle_tag_matches() returns void
language plpgsql set search_path='' as $$
declare
 match public.arena_tag_matches;
 first_reps bigint;
 second_reps bigint;
 finished text;
 winner uuid;
 steps constant text[] := array['Motivation','Determination','Gratification','Sustainability','Maintenance'];
begin
 -- Keep the original reel’s score visible even after its video has expired.
 for match in select * from public.arena_tag_matches m
  where m.resolved_at is null and m.creator_reps is null and m.creator_expires_at<=statement_timestamp()
  for update skip locked
 loop
  update public.arena_tag_matches
  set creator_reps=(select count(*) from public.vault_likes where post_id=match.challenge_id)
  where challenge_id=match.challenge_id;
 end loop;

 for match in select * from public.arena_tag_matches m
  where m.resolved_at is null and m.creator_reps is not null and coalesce(m.response_expires_at,greatest(m.reply_deadline,m.creator_expires_at))<=statement_timestamp()
  for update skip locked
 loop
  winner := null;
  first_reps := match.creator_reps;
  select count(*) into second_reps from public.vault_likes where post_id=match.response_id;
  if not exists (select 1 from public.vault_posts where id=match.challenge_id)
      or (match.response_id is not null and not exists (select 1 from public.vault_posts where id=match.response_id)) then
   finished := 'cancelled';
  elsif match.response_id is null then
   finished := 'no_response';
   insert into public.arena_reel_rep_rewards(post_id,user_id,milestone,tier,step)
   select match.challenge_id,match.creator_id,m.reps,m.tier,steps[1+floor(random()*cardinality(steps))::int]
   from (values (10,'badge'),(50,'bronze'),(100,'bronze'),(100,'badge'),
    (500,'silver'),(1000,'silver'),(1000,'badge')) m(reps,tier)
   where m.reps<=first_reps on conflict (post_id,milestone,tier) do nothing;
  elsif first_reps=second_reps then
   finished := 'draw';
  else
   finished := 'win';
   winner := case when first_reps>second_reps then match.creator_id else match.challenger_id end;
  end if;
  update public.arena_tag_matches
  set creator_reps=first_reps,response_reps=second_reps,outcome=finished,resolved_at=clock_timestamp(),
      winner_id=winner,gold_step=case when winner is not null then steps[1+floor(random()*cardinality(steps))::int] end
  where challenge_id=match.challenge_id;
 end loop;
end $$;
revoke all on function private.settle_tag_matches() from public,anon,authenticated;
select cron.schedule('repbook-tag-matches','* * * * *','select private.settle_tag_matches()');

-- Each Tag Challenge win contributes to the existing profile level.
create or replace function dashboard_private.member_level(profile_id uuid)
returns integer language sql stable security definer set search_path='' as $$
 select ((coalesce((select sum(a.points) from public.vault_dashboard_actions a where a.user_id=profile_id),0)
  + 25*(select count(*) from public.arena_tag_matches m where m.winner_id=profile_id))/50+1)::integer
 where (select auth.uid()) is not null and exists (
  select 1 from public.vault_profiles p where p.id=profile_id and (p.discoverable or p.id=(select auth.uid()))
 );
$$;
