-- Prompt improver: free (no credits), capped per IP per day instead.
--
-- Its own table rather than rows in generations: those carry credits, status and assets, and
-- their ip_hash count feeds the image cap in start_generation, which an LLM call must not eat into.
-- Attempts are logged before the model is called, so failed calls count too (fal may still bill them).

create table public.prompt_improvements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index prompt_improvements_ip_created_idx on public.prompt_improvements (ip_hash, created_at);

-- RLS on with no policies: only the service role (which bypasses RLS) touches this table.
alter table public.prompt_improvements enable row level security;

create function public.start_prompt_improvement(
  p_user_id     uuid,
  p_ip_hash     text,
  p_daily_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day_start timestamptz := (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  v_used integer;
begin
  if p_user_id is null or p_ip_hash is null or p_daily_limit is null or p_daily_limit < 0 then
    raise exception 'start_prompt_improvement: p_user_id, p_ip_hash and a non-negative p_daily_limit are required';
  end if;

  -- Serialises count + insert per IP, so parallel requests can't all pass the check.
  perform pg_advisory_xact_lock(hashtextextended('prompt_improvement:' || p_ip_hash, 0));

  select count(*)::integer into v_used
    from public.prompt_improvements
   where ip_hash = p_ip_hash
     and created_at >= v_day_start;

  if v_used >= p_daily_limit then
    return jsonb_build_object('ok', false, 'code', 'IP_LIMIT');
  end if;

  insert into public.prompt_improvements (user_id, ip_hash) values (p_user_id, p_ip_hash);

  return jsonb_build_object('ok', true, 'remaining', p_daily_limit - v_used - 1);
end;
$$;

revoke execute on function public.start_prompt_improvement(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.start_prompt_improvement(uuid, text, integer)
  to service_role;
