-- Upgrade bonus: an anonymous user who adds an email + password gets 20 credits, once, ever.
--
-- The existing unique (generation_id, reason) key can't enforce "once": the bonus has no
-- generation, and NULLs are distinct. This partial index is the real guarantee; the
-- function's ON CONFLICT relies on it, so a second call (retry, double click, second tab)
-- inserts nothing and grants nothing.

create unique index credit_ledger_one_upgrade_bonus_idx on public.credit_ledger (user_id)
  where reason = 'upgrade_bonus';

-- Service role only, with the user id from the session. The route checks the session; this
-- checks auth.users itself, so a still-anonymous user (or one whose email change is pending,
-- which leaves auth.users.email NULL) can't collect the bonus even if the route were wrong.
create function public.grant_upgrade_bonus(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bonus constant integer := 20;  -- must match UPGRADE_BONUS in src/lib/credits.ts
  v_granted integer;
  v_credits integer;
begin
  if p_user_id is null then
    raise exception 'grant_upgrade_bonus: p_user_id is required';
  end if;

  -- Same first lock as every other credit function, so lock order stays identical everywhere.
  perform 1 from public.app_budget where id = true for update;

  perform 1
     from auth.users
    where id = p_user_id
      and is_anonymous = false
      and email is not null
      and email_confirmed_at is not null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_UPGRADED');
  end if;

  perform 1 from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NO_PROFILE');
  end if;

  insert into public.credit_ledger (user_id, delta, reason)
  values (p_user_id, v_bonus, 'upgrade_bonus')
  on conflict (user_id) where reason = 'upgrade_bonus' do nothing;

  get diagnostics v_granted = row_count;

  if v_granted = 1 then
    update public.profiles
       set credits = credits + v_bonus
     where id = p_user_id
    returning credits into v_credits;
  else
    select credits into v_credits from public.profiles where id = p_user_id;
  end if;

  return jsonb_build_object('ok', true, 'granted', v_granted = 1, 'credits', v_credits);
end;
$$;

-- Supabase's default privileges grant EXECUTE to anon and authenticated directly,
-- so revoking from PUBLIC alone would leave it callable.
revoke execute on function public.grant_upgrade_bonus(uuid) from public, anon, authenticated;
grant execute on function public.grant_upgrade_bonus(uuid) to service_role;
