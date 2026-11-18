-- Keep the earned badge even if the challenge or its video is later removed.
create table public.arena_challenge_results (
 challenge_id uuid primary key,
 entry_id uuid not null,
 winner_id uuid not null references public.vault_profiles(id) on delete cascade,
 winning_likes bigint not null check (winning_likes > 0),
 awarded_at timestamptz not null default now()
);
create index arena_challenge_results_winner on public.arena_challenge_results(winner_id);
alter table public.arena_challenge_results enable row level security;
revoke all on public.arena_challenge_results from public, anon, authenticated;
grant select,insert(challenge_id) on public.arena_challenge_results to authenticated;
create policy members_read_results on public.arena_challenge_results for select to authenticated using(true);
create policy hosts_close_challenges on public.arena_challenge_results for insert to authenticated
 with check(exists(select 1 from public.vault_posts p where p.id=challenge_id and p.user_id=(select auth.uid()) and p.challenge is not null and p.reply_to is null));

create function public.arena_compute_result() returns trigger language plpgsql security invoker set search_path='' as $$
declare candidate record; previous_score bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.challenge_id::text,0));
 if not exists(select 1 from public.vault_posts p where p.id=new.challenge_id and p.user_id=auth.uid() and p.challenge is not null and p.reply_to is null) then
  raise exception 'Only the challenge creator can close this challenge.';
 end if;
 for candidate in select e.id,e.user_id,count(l.post_id) as score from public.vault_posts e
   join public.vault_likes l on l.post_id=e.id where e.reply_to=new.challenge_id
   group by e.id,e.user_id order by score desc,e.id limit 2 loop
  if previous_score is null then
   new.entry_id=candidate.id;new.winner_id=candidate.user_id;new.winning_likes=candidate.score;previous_score=candidate.score;
  elsif candidate.score=previous_score then
   raise exception 'The top entries are tied. Keep voting until one entry leads.';
  end if;
 end loop;
 if previous_score is null then raise exception 'An entry needs at least one like before the challenge can close.';end if;
 return new;
end $$;
create trigger compute_bronze_badge before insert on public.arena_challenge_results for each row execute function public.arena_compute_result();

create function public.arena_check_open_entry() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.reply_to::text,0));
 if exists(select 1 from public.arena_challenge_results where challenge_id=new.reply_to) then raise exception 'This challenge has closed.';end if;
 return new;
end $$;
create trigger check_open_challenge before insert on public.vault_posts for each row when(new.reply_to is not null) execute function public.arena_check_open_entry();
