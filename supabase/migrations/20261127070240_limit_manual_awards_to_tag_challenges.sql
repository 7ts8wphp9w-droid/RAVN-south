-- The milestone interface is live, so only Tag Challenges use manual winner results.
alter policy hosts_close_challenges on public.arena_challenge_results with check (
 exists (
  select 1 from public.vault_posts p where p.id = challenge_id
  and p.user_id = (select auth.uid()) and p.challenge = 'tag' and p.reply_to is null
 )
);
