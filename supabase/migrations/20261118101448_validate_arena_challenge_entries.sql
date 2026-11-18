create function public.vault_validate_challenge_entry() returns trigger
language plpgsql security invoker set search_path='' as $$
declare parent public.vault_posts%rowtype;
begin
 if new.reply_to is not null then
  select * into parent from public.vault_posts where id=new.reply_to;
  if not found or parent.challenge is null or parent.reply_to is not null or parent.challenge is distinct from new.challenge
     or (parent.challenge='tag' and not (new.user_id=any(parent.tags))) then
    raise exception 'Choose a challenge that you can enter';
  end if;
 elsif new.challenge='tag' and cardinality(new.tags)=0 then
  raise exception 'Tag at least one member';
 end if;
 return new;
end $$;
create trigger vault_challenge_entry_guard before insert on public.vault_posts for each row execute function public.vault_validate_challenge_entry();
create unique index vault_one_challenge_entry on public.vault_posts(reply_to,user_id) where reply_to is not null;
revoke all on public.vault_comments from anon,public,authenticated;
grant select,insert(post_id,user_id,body) on public.vault_comments to authenticated;
