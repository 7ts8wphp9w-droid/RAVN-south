create schema if not exists ravn_private;
create table ravn_private.site_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
revoke all on ravn_private.site_owner from public, anon, authenticated;
create function public.ravn_owner_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
 select case when exists (
   select 1 from ravn_private.site_owner where user_id = auth.uid()
 ) then jsonb_build_object(
   'members', (select count(*) from auth.users),
   'posters7d', (select count(distinct user_id) from public.vault_posts where created_at >= now()-interval '7 days'),
   'posts7d', (select count(*) from public.vault_posts where created_at >= now()-interval '7 days')
 ) end
$$;
revoke all on function public.ravn_owner_overview() from public, anon;
grant execute on function public.ravn_owner_overview() to authenticated;
