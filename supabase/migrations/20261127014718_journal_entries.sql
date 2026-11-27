-- Reuse the progress ledger so past points and levels carry over.
alter table public.vault_dashboard_actions
  add column entry text,
  add column step text,
  alter column activity_day set default ((now() at time zone 'Europe/London')::date),
  drop constraint vault_dashboard_actions_action_check,
  add constraint vault_dashboard_actions_action_check
    check (action in ('training', 'nutrition', 'checkin', 'accountability', 'reflection', 'challenge')),
  alter column points set expression as (
    case action when 'training' then 10 when 'nutrition' then 10
      when 'checkin' then 5 when 'accountability' then 5 when 'reflection' then 5
      when 'challenge' then 20 end
  ),
  add constraint journal_entry_words check (
    entry is null or (
      char_length(entry) <= case when action = 'checkin' then 500 else 2000 end
      and regexp_count(normalize(entry, NFC), $word$[[:alnum:]]+(?:['’-][[:alnum:]]+)*$word$) >= 10
    )
  ),
  add constraint journal_checkin_step check (
    case when action = 'checkin' and entry is not null then
      step is not null and step in ('Motivation', 'Determination', 'Gratification', 'Sustainability', 'Maintenance')
    else step is null end
  );

drop policy dashboard_activity_record_own on public.vault_dashboard_actions;
revoke insert on public.vault_dashboard_actions from public, anon, authenticated;
grant insert (user_id, action, entry, step) on public.vault_dashboard_actions to authenticated;

create policy journal_entry_record_own on public.vault_dashboard_actions
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and entry is not null
    and activity_day = (now() at time zone 'Europe/London')::date
  );

-- Keep the existing Arena badge and qualifying check-in rules in the same transaction.
create function dashboard_private.record_journal_checkin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'You can only record your own check-in' using errcode = '42501';
  end if;

  insert into public.vault_checkins (user_id, step, day, reflection)
  values (new.user_id, new.step, new.activity_day, new.entry)
  on conflict (user_id, step, day) do nothing;
  return new;
end;
$$;

revoke all on function dashboard_private.record_journal_checkin() from public, anon, authenticated;
create trigger journal_record_checkin
  after insert on public.vault_dashboard_actions
  for each row when (new.action = 'checkin' and new.entry is not null)
  execute function dashboard_private.record_journal_checkin();

drop policy checkins_create on public.vault_checkins;
revoke insert on public.vault_checkins from public, anon, authenticated;
