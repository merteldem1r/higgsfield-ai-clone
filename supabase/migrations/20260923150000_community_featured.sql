-- Community feed: a hand-curated set of generations.
--
-- Rows are featured by hand in the SQL editor; nothing in the app can set this flag.
-- The feed is read server-side with the service role, so no RLS policy changes:
-- the browser still sees only its own rows. service_role already has SELECT on
-- generations, assets and profiles, which is all the read needs.

alter table public.generations
  add column featured boolean not null default false;

-- The feed only ever reads the featured few, newest first.
create index generations_featured_created_idx on public.generations (created_at desc)
  where featured;
