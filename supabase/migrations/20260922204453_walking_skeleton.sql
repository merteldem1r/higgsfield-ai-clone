-- Step 1: walking skeleton. Tables, signup trigger, RLS, credit functions, Storage bucket.
--
-- Grants are explicit because this project was created after Supabase stopped
-- auto-granting new public tables to anon / authenticated / service_role.
-- service_role only gets SELECT: every write goes through the SECURITY DEFINER
-- functions below, so app code can't UPDATE credits even with the secret key.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  handle     text not null unique check (handle ~ '^[a-z0-9_]{3,40}$'),
  credits    integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now()
);

create table public.generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  prompt       text not null check (char_length(prompt) between 1 and 2000),
  model        text not null,
  aspect       text not null,
  batch        integer not null check (batch between 1 and 4),
  cost_credits integer not null check (cost_credits > 0),
  est_usd      numeric(10, 4) not null check (est_usd >= 0),
  status       text not null default 'pending'
               check (status in ('pending', 'succeeded', 'failed')),
  error        text,
  ip_hash      text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index generations_user_created_idx on public.generations (user_id, created_at desc);

create table public.assets (
  id            uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  storage_path  text not null unique,
  width         integer,
  height        integer,
  favourite     boolean not null default false,
  created_at    timestamptz not null default now()
);

create index assets_user_created_idx on public.assets (user_id, created_at desc);
create index assets_generation_idx on public.assets (generation_id);

create table public.credit_ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  delta         integer not null check (delta <> 0),
  reason        text not null check (reason in ('grant', 'spend', 'refund', 'upgrade_bonus')),
  generation_id uuid references public.generations (id) on delete cascade,
  created_at    timestamptz not null default now(),
  -- A generation can be refunded at most once. NULLs are distinct, so grants don't collide.
  unique (generation_id, reason)
);

create index credit_ledger_user_idx on public.credit_ledger (user_id);

create table public.app_budget (
  id              boolean primary key default true check (id),  -- singleton row
  total_spent_usd numeric(10, 4) not null default 0,
  total_cap_usd   numeric(10, 4) not null default 9.00,
  day             date not null default (now() at time zone 'utc')::date,
  day_spent_usd   numeric(10, 4) not null default 0,
  day_cap_usd     numeric(10, 4) not null default 5.00
);

insert into public.app_budget default values;

-- ---------------------------------------------------------------------------
-- Grants + RLS
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.generations, public.assets, public.credit_ledger, public.app_budget
  from public, anon, authenticated, service_role;

-- Anonymous visitors carry the authenticated role, so these are "any visitor" grants;
-- the policies below narrow them to the caller's own rows.
grant select on public.profiles, public.generations, public.assets to authenticated;

grant select on public.profiles, public.generations, public.assets, public.credit_ledger, public.app_budget
  to service_role;

alter table public.profiles      enable row level security;
alter table public.generations   enable row level security;
alter table public.assets        enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.app_budget    enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "generations: read own" on public.generations
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "assets: read own" on public.assets
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- credit_ledger and app_budget have no policies: invisible to clients.

-- ---------------------------------------------------------------------------
-- Signup trigger: profile with 6 credits and a handle like "generatingdolphin1493"
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signup_credits constant integer := 6;
  v_gerunds constant text[] := array[
    'generating', 'dreaming', 'rendering', 'painting', 'glowing', 'drifting',
    'framing', 'sketching', 'shimmering', 'blooming', 'wandering', 'floating'
  ];
  v_animals constant text[] := array[
    'dolphin', 'otter', 'falcon', 'lynx', 'panda', 'koala',
    'heron', 'fox', 'orca', 'gecko', 'raven', 'bison'
  ];
  v_handle text;
begin
  -- 144 word pairs x 9000 numbers; retry the rare collision instead of failing the signup.
  for attempt in 1..10 loop
    v_handle := v_gerunds[1 + floor(random() * array_length(v_gerunds, 1))::int]
             || v_animals[1 + floor(random() * array_length(v_animals, 1))::int]
             || (1000 + floor(random() * 9000))::int::text;
    begin
      insert into public.profiles (id, handle, credits)
      values (new.id, v_handle, v_signup_credits);
      exit;
    exception when unique_violation then
      if attempt = 10 then
        raise;
      end if;
    end;
  end loop;

  insert into public.credit_ledger (user_id, delta, reason)
  values (new.id, v_signup_credits, 'grant');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Credit functions. Service role only.
--
-- Each one locks the app_budget row before touching anything else. That
-- serialises all credit changes behind one lock and keeps the lock order
-- identical everywhere, so concurrent calls queue instead of deadlocking.
-- ---------------------------------------------------------------------------

-- Refunds a pending generation. Safe to call twice: the second call finds it
-- no longer pending, and the ledger's unique key blocks a second refund anyway.
create function public.fail_generation(p_generation_id uuid, p_error text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gen public.generations;
  v_refund_rows integer;
begin
  perform 1 from public.app_budget where id = true for update;

  update public.generations
     set status = 'failed',
         error = left(p_error, 500),
         completed_at = now()
   where id = p_generation_id
     and status = 'pending'
  returning * into v_gen;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_PENDING');
  end if;

  insert into public.credit_ledger (user_id, delta, reason, generation_id)
  values (v_gen.user_id, v_gen.cost_credits, 'refund', v_gen.id)
  on conflict (generation_id, reason) do nothing;

  get diagnostics v_refund_rows = row_count;

  if v_refund_rows = 1 then
    update public.profiles
       set credits = credits + v_gen.cost_credits
     where id = v_gen.user_id;

    -- Only take it off today's counter if it was spent today; yesterday's counter was already reset.
    update public.app_budget
       set total_spent_usd = greatest(total_spent_usd - v_gen.est_usd, 0),
           day_spent_usd = case
             when day = (v_gen.created_at at time zone 'utc')::date
               then greatest(day_spent_usd - v_gen.est_usd, 0)
             else day_spent_usd
           end
     where id = true;
  end if;

  return jsonb_build_object('ok', true, 'refunded', v_refund_rows = 1);
end;
$$;

create function public.start_generation(
  p_user_id      uuid,
  p_prompt       text,
  p_model        text,
  p_aspect       text,
  p_batch        integer,
  p_cost_credits integer,
  p_est_usd      numeric,
  p_ip_hash      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_budget public.app_budget;
  v_stale_id uuid;
  v_credits integer;
  v_generation_id uuid;
begin
  perform 1 from public.app_budget where id = true for update;

  update public.app_budget
     set day = v_today,
         day_spent_usd = 0
   where id = true
     and day <> v_today;

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

-- Marks a pending generation succeeded and records its assets.
-- p_assets: [{"storage_path": text, "width": int, "height": int}, ...]
create function public.complete_generation(p_generation_id uuid, p_assets jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gen public.generations;
  v_credits integer;
begin
  perform 1 from public.app_budget where id = true for update;

  update public.generations
     set status = 'succeeded',
         completed_at = now()
   where id = p_generation_id
     and status = 'pending'
  returning * into v_gen;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_PENDING');
  end if;

  -- Partial batches need a partial refund, which isn't built yet. Raising rolls this
  -- back, so the caller's fail_generation refunds the whole batch instead.
  if jsonb_array_length(p_assets) <> v_gen.batch then
    raise exception 'complete_generation: expected % assets, got %',
      v_gen.batch, jsonb_array_length(p_assets);
  end if;

  insert into public.assets (generation_id, user_id, storage_path, width, height)
  select v_gen.id, v_gen.user_id, a.storage_path, a.width, a.height
    from jsonb_to_recordset(p_assets) as a (storage_path text, width integer, height integer);

  select credits into v_credits from public.profiles where id = v_gen.user_id;

  return jsonb_build_object('ok', true, 'credits', v_credits);
end;
$$;

-- Supabase's default privileges grant EXECUTE on new public functions to anon and
-- authenticated directly, so revoking from PUBLIC alone would leave them callable.
revoke execute on function public.fail_generation(uuid, text) from public, anon, authenticated;
revoke execute on function public.start_generation(uuid, text, text, text, integer, integer, numeric, text)
  from public, anon, authenticated;
revoke execute on function public.complete_generation(uuid, jsonb) from public, anon, authenticated;

grant execute on function public.fail_generation(uuid, text) to service_role;
grant execute on function public.start_generation(uuid, text, text, text, integer, integer, numeric, text)
  to service_role;
grant execute on function public.complete_generation(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for generated images
--
-- Public means objects are readable by URL; paths contain two UUIDs, so they
-- aren't guessable. There are no storage.objects policies, so clients can't
-- upload or list. Only the service role writes here.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generations', 'generations', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
