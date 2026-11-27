-- Keep the current site's close button working until the updated frontend is published.
alter policy hosts_close_challenges on public.arena_challenge_results with check (
 exists (
  select 1 from public.vault_posts p where p.id = challenge_id
  and p.user_id = (select auth.uid()) and p.challenge is not null and p.reply_to is null
 )
);
