# PLAN — Higgsfield clone (24h take-home)

**Thesis:** Copy the real structure closely, but make the core loop work end to end. A visitor types a prompt and gets a real image with no signup wall, and the server enforces credits so the browser can't bypass them.

## 1. Product map

- **Surfaces:** Explore home (`/`) · Image tool (`/image`) · Video tool (`/video`, UI only) · Assets (`/assets`) · Auth modal · Pricing (`/pricing`) · mobile tab bar + Create hub.
- **Core loop:** Explore → Image → prompt + model / aspect / batch → Generate (cost shown on the button) → results appear in place → saved to Assets. After about 3 free images the auth modal opens: "Sign up and get 50 credits". Reviewers are meant to reach that modal.
- **Changes from the original:** guests can generate immediately. The nav is short (the original has about 18 overflowing items). Image and Video share one composer pattern. There's less promo noise.

## 2. Scope

**P0: the demo fails without these. This is the whole day.**
- Deployed URL that works in incognito. Anonymous Supabase session, created **lazily on the first Generate** so crawlers don't create users. The **pending tile appears the moment Generate is clicked**, before sign-in resolves. That first generation is the slowest path in the app and the reviewer's first impression.
- Image page: empty-state hero with fanned photos, docked composer (model chip, aspect, batch 1–4, Generate with the strikethrough cost), loading skeletons, results grid, clear errors. *This is the core loop and most of the UX score.*
- Server-side credits: atomic spend, refund on failure, global and per-IP caps, credits pill in the nav. *The thesis depends on this being real.*
- Auth modal UI: split carousel plus provider buttons and the 18+ checkbox. It opens on out-of-credits and on Login/Sign up. Providers show "coming soon" until P1. *A distinctive surface and the upsell moment.*
- Assets page: grid, Image count, fanned empty state, lightbox + download. *Closes the loop and makes the product feel persistent.*
- Explore home: condensed version with promo hero, tool tiles and a showcase strip of our own generations. *First impression and faithful structure.*
- Dark design tokens (near-black, lime primary, pink promo, condensed uppercase headlines). Every page usable at phone width.
- **README:** the thesis, what's real vs UI-only, how credits are enforced, known limitations, what's next. *A graded artifact.*
- **45 minutes at the end to record the walkthrough.** *A graded artifact.*

**P1: a bonus. Start it only after all of P0, including the README and the walkthrough, is done. Nothing moves from P1 into P0. Order:**
1. Email OTP **upgrade** of the anonymous user via `updateUser({ email })`. Keeps the same `user_id`, so the gallery survives. +50 credits on upgrade. Email login for returning users. *Makes the modal real.* This needs custom SMTP (e.g. Resend), because Supabase's built-in email sender allows only 2 emails per hour for the whole project.
2. Video page in the shared composer pattern. Generate shows "image-only in this demo". *Faithful structure with no video spend.*
3. Pricing page: three plan cards and an FAQ accordion. CTAs explain there are no payments in the demo. *Where signed-in users go when they run out of credits.*
4. Mobile bottom tab bar and the full-screen Create hub. *A distinctive mobile pattern.*
5. Assets extras (favourites, search, delete), grid-size slider, Turnstile CAPTCHA on anonymous sign-in.

**P2:** Google OAuth via `linkIdentity`, image-to-image references (the "+" button), prompt enhance, share links, realtime status.

**Skipped on purpose**
- Payments/Stripe: no real money moves in a demo.
- Genjutsu, Cinema Studio, Effects, Supercomputer, Contests, Community, MCP/API, Audio: separate products, not the core loop.
- Profile/social page, plan recommender, compare table: little value for a lot of UI.
- Apple/Microsoft SSO, i18n: none of the three judging criteria gains from them.
- Real video generation: about $0.2–0.5 and 30–90s per clip, plus an async pipeline, all for a secondary surface.

## 3. Stack

The proposed stack holds up. The changes are about **where things run**:
- **Next.js App Router + TS + Tailwind v4 on Vercel.** Keep. Generation goes through one Route Handler, `POST /api/generate`, not a Server Action, because an explicit endpoint can be tested with curl for the concurrency and bypass checks.
- **Supabase (anon auth, Postgres, Storage) via `@supabase/ssr`.** Keep. **No ORM**: SQL migrations plus Postgres functions are faster to write and put the credit logic in the database, where atomicity is free.
- **fal.ai through `@fal-ai/client`, server-side only.** Do **not** use fal's client proxy or any browser-side key, because that would bypass credits. Default model is Flux Schnell, with Flux Dev as the premium option (check both prices on fal's pricing page on day 1). Keep `enable_safety_checker` on, since the prompt box is public.
- **Sync calls**, not a job queue. Schnell takes about 1–3s and Dev about 5–10s, so `maxDuration = 60` is enough.
- **Copy outputs to Supabase Storage.** fal media URLs aren't guaranteed to last.
- **UI primitives:** shadcn/ui, only for Dialog, Popover, Slider and Tooltip. Accessible modals and popovers come fast, and the components are vendored into the repo rather than added as a runtime dependency. **Timebox: if Tailwind v4 + shadcn isn't working within 15 minutes, drop shadcn and hand-roll the dialog.** Fonts come from `next/font`.
- **No Higgsfield logo or media.** The showcase and the fanned photos use images from our own generator.

## 4. Data model + credit rules

```
profiles     id (=auth.users.id) · handle ("@generatingdolphin1493"-style) · credits int CHECK (credits >= 0)
generations  id · user_id · prompt · model · aspect · batch · cost_credits · est_usd
             status (pending|succeeded|failed) · error · ip_hash · created_at · completed_at
assets       id · generation_id · user_id · storage_path · width · height · favourite
credit_ledger id · user_id · delta · reason (grant|spend|refund|upgrade_bonus) · generation_id
             UNIQUE (generation_id, reason)   -- makes refunds idempotent
app_budget   singleton: total_spent_usd · total_cap_usd (9.00) · day · day_spent_usd · day_cap_usd (5.00)
```

- A trigger on `auth.users` insert creates the profile with **6 credits** and an auto-generated handle.
- Pricing lives in a code constant. **Schnell costs 2 credits per image (shown struck through from 3), Dev costs 6.** A new visitor gets 3 Schnell images or 1 Dev image, then sees the out-of-credits modal. The composer defaults to a batch of 1. If a batch costs more than the balance, the Generate button opens the modal instead of calling the API.
- **RLS:** users can only `SELECT` their own rows. The client can't insert or update anything credit-related.
- The credit functions are `SECURITY DEFINER` with `EXECUTE` **revoked from `anon` and `authenticated`**. Only the server calls them, using the service role and a `user_id` that comes from `auth.getUser()`.
- **`start_generation` runs in one transaction:**
  1. Lock the `app_budget` row. If the total or daily cap would be exceeded, return `GLOBAL_CAP`.
  2. Run `UPDATE profiles SET credits = credits - cost WHERE id = $1 AND credits >= cost`. If no row changes, return `INSUFFICIENT_CREDITS`.
  3. Insert a pending generation and a spend ledger row, and add the estimated cost to the budget.
- **`fail_generation`** only acts if the generation is still `pending`. It marks it failed, refunds the credits, writes a ledger row (the unique key makes a second refund impossible) and subtracts the estimate from the budget. A pending row older than 3 minutes gets the same treatment the next time that user calls.
- A batch is spent as a single unit. If fal returns fewer images than requested, the missing ones are refunded.
- **Abuse layers:**
  1. Supabase's anonymous sign-in rate limit: **30 per hour per IP** by default, with bursts up to the limit. Set with `rate_limit_anonymous_users` (Dashboard → Authentication → Rate Limits).
  2. A per-IP cap of 30 images per day, counted from `generations.ip_hash` and set by the `IP_DAILY_LIMIT` env var.
  3. The app budget: $5/day and $9 total.
  4. The prepaid $10 fal balance, which is the hard ceiling.
- **Error handling in the UI:** a `FAL_DISABLED` env kill switch returns 503. `INSUFFICIENT_CREDITS` opens the auth modal (or Pricing if the user is signed in). `GLOBAL_CAP` shows a "demo budget reached for today" banner.

## 5. Build order (hours are rough)

| # | Step | Removes this unknown |
|---|------|------------------|
| 0 | Scaffold, **deploy a hello page to Vercel**, create the Supabase project, set env vars (~0.5h) | A live URL exists from hour one |
| 1 | Walking skeleton: migration, lazy anon sign-in, `/api/generate` with Schnell, Storage copy, a plain form showing the image. Test in incognito on the live URL (~1.5h). **Before starting:** anonymous sign-ins are capped at 30 per hour per IP, and building from one IP will hit that. Raise the limit in the dashboard (and `IP_DAILY_LIMIT` locally) while building, and put both back before submitting. An HTTP 429 from `/auth/v1/signup` means the rate limit, not a code bug. | Anon auth + SSR cookies, fal latency, Storage |
| 2 | Credit hardening: force a fal error to test refunds, add caps, fire 10 parallel curls with only 2 credits left and confirm exactly one succeeds (~1h) | Atomicity |
| 3 | Image page UI: tokens, nav + credits pill, composer, results, premium model (~2.5h) | — |
| 4 | Auth modal + out-of-credits wiring, with the pending tile shown before the lazy sign-in resolves (~1h) | — |
| 5 | Assets page (~1.5h) → 6 Explore home (~1.5h) → 7 mobile pass (~1h) | — |
| 8 | README (~0.5h), then record the walkthrough (**45 min reserved**) | — |
| 9 | P1 in the order listed, only if time is left | — |

The hour estimates are optimistic; step 1 alone touches SSR cookies, anon auth, fal and Storage. Plan on P0 taking the whole day. Commit `.agent-logs/` after each step.

## 6. Risks and cut order

- **Anon sessions on the SSR cookie path break in production.** Mitigation: step 1 is tested on the live URL, not localhost.
- **A public link drains fal.** Mitigation: the four abuse layers above. The prepaid balance means the worst case is $10.
- **Upgrading to an email that already has an account fails** (Supabase can't link it). Fallback: a plain sign-in, and the anonymous gallery isn't merged. This will be documented.
- **Supabase free projects pause after about 7 days idle, and judges may open the link later.** Mitigation: a daily keep-alive ping (Vercel cron), or upgrade the project for the review window.
- **Polishing the design eats the day.** Mitigation: set the tokens once and cap each page at its estimate.

**Cut first when behind:** Create hub → Pricing → Video page → premium model (go Schnell-only) → trim Explore to hero + tiles.
**Never cut:** server-side credits, the out-of-credits modal, Assets, the README, the walkthrough slot.
