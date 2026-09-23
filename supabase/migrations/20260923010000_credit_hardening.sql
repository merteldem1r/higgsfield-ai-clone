-- Step 2: credit hardening.
--   * Per-IP daily image cap, enforced inside start_generation (IP_LIMIT).
--   * NO_PROFILE when the user has no profiles row, instead of a misleading INSUFFICIENT_CREDITS.
--
-- start_generation gains a required p_ip_daily_limit and p_ip_hash loses its default,
-- so a caller can't skip the cap by leaving them out. Changing the argument list means
-- drop + create, and the EXECUTE revoke/grant has to be repeated for the new signature.

create index generations_ip_created_idx on public.generations (ip_hash, created_at);

drop function public.start_generation(uuid, text, text, text, integer, integer, numeric, text);

create function public.start_generation(
  p_user_id        uuid,
  p_prompt         text,
  p_model          text,
  p_aspect         text,
  p_batch          integer,
  p_cost_credits   integer,
  p_est_usd        numeric,
  p_ip_hash        text,
  p_ip_daily_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_day_start timestamptz := v_today::timestamp at time zone 'utc';
  v_budget public.app_budget;
  v_stale_id uuid;
  v_ip_images integer;
  v_credits integer;
  v_generation_id uuid;
begin
  if p_ip_hash is null or p_ip_daily_limit is null or p_ip_daily_limit < 0 then
    raise exception 'start_generation: p_ip_hash and a non-negative p_ip_daily_limit are required';
  end if;

  -- Also serialises the per-IP count below, so parallel requests can't all pass it.
  perform 1 from public.app_budget where id = true for update;

  update public.app_budget
     set day = v_today,
         day_spent_usd = 0
   where id = true
     and day <> v_today;

  perform 1 from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NO_PROFILE');
  end if;

  -- A request that died mid-generation leaves a pending row; refund it on the user's next call.
  for v_stale_id in
    select id
      from public.generations
     where user_id = p_user_id
       and status = 'pending'
       and created_at < now() - interval '3 minutes'
  loop
    perform public.fail_generation(v_stale_id, 'timed out');
  end loop;

  select * into v_budget from public.app_budget where id = true;

  if v_budget.total_spent_usd + p_est_usd > v_budget.total_cap_usd
     or v_budget.day_spent_usd + p_est_usd > v_budget.day_cap_usd then
    return jsonb_build_object('ok', false, 'code', 'GLOBAL_CAP');
  end if;

  -- Failed generations count too: a refund gives credits back, but fal may still have
  -- billed us (safety-filtered images are charged), so refunds must not reset the cap.
  select coalesce(sum(batch), 0)::integer into v_ip_images
    from public.generations
   where ip_hash = p_ip_hash
     and created_at >= v_day_start;

  if v_ip_images + p_batch > p_ip_daily_limit then
    return jsonb_build_object('ok', false, 'code', 'IP_LIMIT');
  end if;

  update public.profiles
     set credits = credits - p_cost_credits
   where id = p_user_id
     and credits >= p_cost_credits
  returning credits into v_credits;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_CREDITS');
  end if;

  insert into public.generations (user_id, prompt, model, aspect, batch, cost_credits, est_usd, ip_hash)
  values (p_user_id, p_prompt, p_model, p_aspect, p_batch, p_cost_credits, p_est_usd, p_ip_hash)
  returning id into v_generation_id;

  insert into public.credit_ledger (user_id, delta, reason, generation_id)
  values (p_user_id, -p_cost_credits, 'spend', v_generation_id);

  update public.app_budget
     set total_spent_usd = total_spent_usd + p_est_usd,
         day_spent_usd = day_spent_usd + p_est_usd
   where id = true;

  return jsonb_build_object('ok', true, 'generation_id', v_generation_id, 'credits', v_credits);
end;
$$;

revoke execute on function public.start_generation(uuid, text, text, text, integer, integer, numeric, text, integer)
  from public, anon, authenticated;
grant execute on function public.start_generation(uuid, text, text, text, integer, integer, numeric, text, integer)
  to service_role;
