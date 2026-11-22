create or replace function public.vault_set_post_time() returns trigger
language plpgsql set search_path='' as $$
begin
 new.created_at := now();
 new.expires_at := case when new.kind in ('story','reel') then new.created_at + interval '24 hours' end;
 return new;
end $$;

update public.vault_posts set expires_at=created_at+interval '24 hours' where kind='reel' and expires_at is null;
alter policy posts_read on public.vault_posts using (expires_at is null or expires_at>now());
alter policy likes_delete on public.vault_likes using (user_id=(select auth.uid()) and exists(select 1 from public.vault_posts p where p.id=post_id));

create table public.vault_media_views(
 post_id uuid references public.vault_posts on delete cascade,
 viewer_id uuid references public.vault_profiles on delete cascade,
 primary key(post_id, viewer_id)
);
alter table public.vault_media_views enable row level security;
revoke all on public.vault_media_views from public,anon,authenticated;
grant insert on public.vault_media_views to authenticated;
create policy record_view on public.vault_media_views for insert to authenticated with check(
 viewer_id=(select auth.uid()) and exists(select 1 from public.vault_posts p where p.id=post_id and p.expires_at>now() and p.user_id<>viewer_id)
);

create table public.vault_expiry_alerts(
 post_id uuid primary key, user_id uuid not null references public.vault_profiles on delete cascade,
 label text not null, expired_at timestamptz not null, views bigint not null, reps bigint not null,
 historical boolean not null
);
alter table public.vault_expiry_alerts enable row level security;
revoke all on public.vault_expiry_alerts from public,anon,authenticated;
grant select on public.vault_expiry_alerts to authenticated;
create policy own_expiry_alerts on public.vault_expiry_alerts for select to authenticated using(user_id=(select auth.uid()));

create function public.vault_collect_expiry_alerts() returns void language sql set search_path='' as $$
 insert into public.vault_expiry_alerts
 select p.id,p.user_id,case p.challenge when 'tag' then 'tag challenge' when 'reel' then 'reel challenge' else p.kind end,
 p.expires_at,(select count(*) from public.vault_media_views v where v.post_id=p.id),
 (select count(*) from public.vault_likes l where l.post_id=p.id),false
 from public.vault_posts p where p.expires_at<=now()
 and not exists(select 1 from public.vault_expiry_alerts a where a.post_id=p.id)
 on conflict do nothing
$$;
revoke all on function public.vault_collect_expiry_alerts() from public,anon,authenticated;
select public.vault_collect_expiry_alerts();
update public.vault_expiry_alerts set historical=true;
create extension if not exists pg_cron;
select cron.schedule('repbook-expiry-alerts','* * * * *','select public.vault_collect_expiry_alerts()');
