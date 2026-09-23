# Higgsfield AI Clone

A working clone of higgsfield.ai's image generation product, built as a 10-12 hour take-home.
Next.js 16 on Vercel, Supabase for auth, Postgres and Storage, fal.ai for the models.
Structure and dark UI follow the original; the palette, logo and every image are my own.

**Live:** [Higgsfield AI Clone by Mert Eldemir](https://hf-studio-8x.vercel.app/)

> **The core loop actually works.** A visitor types a prompt and gets a real AI image with no signup, and credits are enforced server-side in Postgres, so nothing the browser does can bypass them.

<table>
  <tr>
    <td width="50%"><img src="preview/explore.png" alt="Explore home: promo carousel, hero composer and a grid of Flux generations" /></td>
    <td width="50%"><img src="preview/image.png" alt="Image studio: a prompt, the generated Flux Schnell image and follow-up suggestions with their credit cost" /></td>
  </tr>
  <tr>
    <td align="center"><b>Explore</b> · type a scene and generate from the home page</td>
    <td align="center"><b>Image</b> · chat-style studio with timing and cost per run</td>
  </tr>
  <tr>
    <td width="50%"><img src="preview/assets.png" alt="Assets: the visitor's gallery with search, favourites and a grid-size slider" /></td>
    <td width="50%"><img src="preview/community.png" alt="Community: a hand-picked masonry feed with prompt, creator handle and Recreate" /></td>
  </tr>
  <tr>
    <td align="center"><b>Assets</b> · your gallery, favourites and prompt search</td>
    <td align="center"><b>Community</b> · curated feed; open any image and recreate it</td>
  </tr>
</table>

| | | |
|---|---|---|
| [Try it in 30 seconds](#try-it-in-30-seconds) | [How it works](#how-it-works) | [Data model](#data-model) |
| [Real vs UI-only](#whats-real-vs-whats-ui-only) | [Credits](#credits-and-why-they-cant-be-bypassed) | [Stack](#stack-and-infrastructure) |
| [Auth](#auth) | [Project structure](#project-structure) | [Running locally](#running-it-locally) |
| [Product decisions](#product-decisions) | [Known limitations](#known-limitations) | [What's next](#whats-next-with-another-day) |

---

## Try it in 30 seconds

1. **Open the link in a private window.** No signup wall. You start with 6 credits.
2. **Go to Image, type a prompt, press Generate.** A pending tile appears immediately; a Flux Schnell image lands in about 3 seconds. Try the wand next to the `+` to rewrite a short idea into a detailed prompt first.
3. **Generate twice more.** Schnell costs 2 credits, so the fourth attempt opens the out-of-credits modal instead of calling the API.
4. **Sign up with an email and password** in that modal. You get 20 bonus credits and keep the same account.
5. **Open Assets.** Everything you generated as a guest is still there. Favourite one, search by prompt, open it in the lightbox.

> The account you signed up with is the same user id you had as a guest. Nothing was copied or migrated.

---

## What's real vs what's UI-only

| Feature | Status | Notes |
|---|---|---|
| Image generation | **Real** | Flux Schnell (2 credits) and Flux Dev (6 credits) via fal, 5 aspect ratios, batches of 1–4 |
| Anonymous auth | **Real** | Supabase anonymous session, created lazily on the first Generate |
| Server-side credits | **Real** | Atomic spend, refund on failure, per-IP daily cap, global dollar budget |
| Assets | **Real** | Your gallery, read under RLS; favourites, prompt search, grid-size slider, download |
| Community feed | **Real** | Hand-curated featured generations, read server-side with whitelisted fields |
| Email sign-up | **Real** | In-place upgrade of the guest user; one-time 20-credit bonus; login and logout |
| Prompt improver | **Real** | Llama 3.1 8B via fal; free, capped at 20 per IP per day |
| i18n | **Real** | English, Turkish, Russian; cookie-selected dictionaries, no i18n library |
| Video | UI-only | Shown as a non-clickable "Soon" entry in the nav, the home model chips and the Assets sidebar. There is no `/video` route and no video spend |
| Social sign-in | UI-only | Google is shown disabled; Apple and Microsoft are left out on purpose |
| Pricing | UI-only | Plan cards and FAQ; CTAs say there are no payments in the demo |

---

## How it works

```
 Browser                      Next.js (Vercel)                 Supabase Postgres          fal.ai
 ───────                      ────────────────                 ─────────────────          ──────
 click Generate
   │ pending tile shows now
   │ ensureSession()  ───────────────────────────────────────▶ anonymous user
   │                                                           + profile, 6 credits (trigger)
   ▼
 POST /api/generate ─────────▶ getUser() verifies the JWT
                               validate prompt/model/aspect/batch
                               start_generation(...) ────────▶ lock budget row
                                                               check global + per-IP caps
                                                               UPDATE credits WHERE >= cost
                                                               insert pending generation
                                                               + ledger 'spend' row
                               generateImages() ─────────────────────────────────────────▶ Flux
                               download each image ◀───────────────────────────────────── URLs
                               upload to Storage ────────────▶ generations/{user}/{gen}/{i}.jpg
                               complete_generation(...) ─────▶ insert assets, mark succeeded
 images render ◀────────────── { credits, images[] }

 on any failure after the spend:  fail_generation(...) ──────▶ mark failed, refund once
```

The browser never talks to fal and never writes to a credit table. It holds an anonymous Supabase session and calls one endpoint; everything that costs money happens in the Route Handler and inside Postgres functions.

**Why a Route Handler, not a Server Action.** An explicit `POST /api/generate` can be hit with `curl`, which is how the concurrency and bypass checks run (10 parallel requests against a 2-credit balance, forged tokens, direct RPC calls). A Server Action's endpoint is an implementation detail and much harder to attack deliberately in a test.

**Why fal is only called server-side.** A browser-held key or fal's client proxy would let anyone call fal directly and skip the credit check entirely. `FAL_KEY` is read in one `server-only` module (`src/lib/fal.ts`), and every fal call in the app lives there.

**Why outputs are copied to Storage.** fal's media URLs aren't guaranteed to last, and the gallery has to. The Storage copy happens before the generation is marked complete, so a succeeded row always has its files.

---

## Credits, and why they can't be bypassed

> Credits change only inside Postgres functions that only the server can call. The browser can read its own balance and nothing else.

**One atomic statement does the spend.** No read-then-write race is possible, because the check and the decrement are the same row update:

```sql
update public.profiles
   set credits = credits - p_cost_credits
 where id = p_user_id
   and credits >= p_cost_credits
returning credits into v_credits;

if not found then
  return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_CREDITS');
end if;
```

`profiles.credits` also carries `check (credits >= 0)` as a last line of defence.

| Layer | What it does |
|---|---|
| **`SECURITY DEFINER` functions** | `start_generation`, `complete_generation`, `fail_generation`, `set_favourite`, `grant_upgrade_bonus`, `start_prompt_improvement`. Each is a single transaction with `search_path = ''`. |
| **`EXECUTE` revoked** | Revoked from `public`, `anon` and `authenticated`, granted only to `service_role`. The route passes a `user_id` it got from `auth.getUser()`, never one from the request body. |
| **Idempotent refunds** | `credit_ledger` has `unique (generation_id, reason)`, so a generation can be refunded at most once. `fail_generation` also only acts on a `pending` row. Calling it twice returns `NOT_PENDING` and moves no credits. |
| **Stale sweep** | A generation still `pending` after 3 minutes (the function was killed mid-flight) is refunded on that user's next call. |
| **RLS on every table** | Visitors can only `SELECT` rows where `auth.uid() = user_id`. No insert, update or delete policies exist at all. |
| **Per-IP daily cap** | 30 images per IP per UTC day (`IP_DAILY_LIMIT`), counted inside `start_generation` under the same lock. IPs are stored as an HMAC with `IP_HASH_SALT`; IPv6 is bucketed per /64. Refunded generations still count, since fal may have billed them. |
| **Global dollar budget** | A singleton `app_budget` row: $5 per day, $9 total. Every spend adds its estimated cost; a request that would cross either cap gets `GLOBAL_CAP` before any credit moves. |
| **Prepaid fal balance** | The hard ceiling behind all of the above. |

**Why RLS scoping matters more than usual here.** Supabase gives anonymous users the `authenticated` role. So "authenticated can do X" means "any visitor who opened the page can do X", and every policy is written against `auth.uid() = user_id`, not the role.

**The test suite.** `scripts/test-credits.mts` runs **46 checks** against a live dev server and the real database, including:

- 10 parallel requests with 2 credits left: exactly one succeeds, balance ends at 0, and the ledger sums to the balance.
- A forced fal failure refunds exactly once and leaves the budget unchanged.
- The per-IP cap holds under concurrency, and over HTTP at the configured limit.
- Missing, garbage or publishable-key bearers get 401.
- Direct RPC calls and table writes from the browser client get `42501 permission denied`.

```bash
npm run dev              # in one terminal
npm run test:credits     # in another; ~$0.018 of real fal calls, uses 2 anonymous sign-ins
```

The failure path is forced with an `x-test-fail-fal` header that the route only honours when `NODE_ENV === "development"`.

---

## Auth

**Anonymous first.** The fastest way to show the product works is to let someone use it. The session is created lazily on the first Generate (not on page load), so crawlers and bounces never create users. The pending tile shows before sign-in resolves, so that first request still feels instant.

**Sign-up upgrades the same user in place.** The auth modal calls `supabase.auth.updateUser({ email, password })` on the current anonymous session. The `user_id` doesn't change, so every generation, asset and favourite already belongs to the new account.

> No merge step, no copy job, no orphaned guest data. The upgrade is one call and the gallery carries over by construction.

After sign-up (and after every login), the client calls `POST /api/account/upgrade-bonus`. `grant_upgrade_bonus` checks `auth.users` itself for a non-anonymous user with a confirmed email, and a partial unique index on `credit_ledger (user_id) where reason = 'upgrade_bonus'` makes the 20-credit bonus payable once per user, ever. Logging into a different account replaces the session; the guest's images stay with the guest user, and the UI says so.

---

## Data model

| Table | Role |
|---|---|
| `profiles` | One row per auth user: generated handle and the **current credit balance** (`check (credits >= 0)`). Created by a trigger on `auth.users` with 6 credits. |
| `generations` | One row per Generate: prompt, model, aspect, batch, cost, estimated USD, `pending`/`succeeded`/`failed`, hashed IP. Also the source of the per-IP count. A `featured` flag marks community rows. |
| `assets` | One row per stored image: Storage path, dimensions, `favourite`. A batch of 4 is one generation and four assets. |
| `credit_ledger` | **Append-only history of every credit movement**: `grant`, `spend`, `refund`, `upgrade_bonus`. |
| `app_budget` | Singleton row: total and daily estimated spend against their caps. |
| `prompt_improvements` | One row per improver attempt (user, hashed IP, time). Only exists to count the per-IP limit. |

**Why `credit_ledger` exists next to `profiles.credits`.** The balance answers "can this user spend 2 credits right now" in one indexed row update. The ledger answers "why is the balance what it is". Its unique keys are what make refunds and the bonus impossible to pay twice, and the test suite asserts the ledger sum equals the balance after every scenario.

**Why the improver has its own table.** Counting improvements in `generations` would eat into the image cap in `start_generation`, and those rows carry credit and asset semantics an LLM call doesn't have.

---

## Stack and infrastructure

| Piece | Why |
|---|---|
| **Next.js 16** (App Router, Turbopack, React 19) | Server Components by default, one Route Handler per money-moving action, `server-only` modules keep secrets out of the bundle. |
| **Vercel** | Zero-config deploys and a live URL from the first hour; the edge sets `x-real-ip`, which the per-IP cap relies on. |
| **Supabase** | Anonymous auth, Postgres and Storage in one project. Credit logic lives in SQL functions, where atomicity comes free. No ORM. |
| **fal.ai** (`@fal-ai/client`) | Flux Schnell and Flux Dev for images, `openrouter/router` with Llama 3.1 8B for the prompt improver. Synchronous calls; Schnell takes about 2 seconds. |
| **Tailwind CSS 4** | Design tokens defined once in `@theme` in `globals.css`. No component library; the modal, popovers and lightbox are hand-rolled. |

Runtime dependencies are six packages: `next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js`, `@fal-ai/client`. CI runs lint, typecheck and a build with placeholder env values on pushes to `main` and on pull requests.

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/            POST: auth → start_generation → fal → Storage → complete
│   │   ├── improve-prompt/      POST: auth → per-IP limit → LLM rewrite (no credits)
│   │   ├── assets/[id]/favourite/  POST: auth → set_favourite
│   │   └── account/upgrade-bonus/  POST: auth → grant_upgrade_bonus (idempotent)
│   ├── _home/                   Explore: promo carousel, hero composer, presets, showcase grid
│   ├── image/                   the studio: chat-style thread, run tiles, ambient background
│   ├── assets/                  the visitor's gallery (RLS-scoped reads)
│   ├── community/               featured feed, read server-side with whitelisted fields
│   └── pricing/                 plan cards and FAQ (UI only)
├── components/                  cross-route only: nav, credits pill, auth modal, lightbox, toast
│   └── composer/                the composer shared by / and /image, prompt improver client
└── lib/
    ├── credits.ts               model costs, limits, aspects; imported by UI and API alike
    ├── fal.ts                   server-only; every fal call in the app
    ├── ip.ts                    server-only; caller IP → /64 bucket → salted HMAC
    ├── i18n/                    en / tr / ru dictionaries, cookie-selected
    └── supabase/                browser client + session helpers; server-only admin client
supabase/migrations/             schema, RLS, credit functions; applied in order
scripts/test-credits.mts         the 46-check credit and abuse suite
docs/                            PLAN.md (scope, credit rules), DESIGN.md (tokens, motion), recon/
public/showcase, public/presets  my own Flux generations used for the landing and empty states
```

The rule behind the split: `credits.ts` is imported by both the Generate button and the route, so the price the user sees and the price the server charges cannot disagree.

---

## Running it locally

```bash
git clone https://github.com/merteldem1r/higgsfield-ai-clone.git
cd higgsfield-ai-clone
npm install
cp .env.example .env.local   # then fill in the values below
```

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Publishable key; can only read the caller's own rows |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | The only key allowed to call the credit functions |
| `FAL_KEY` | **Server-only** | fal.ai key, read only in `src/lib/fal.ts` |
| `IP_HASH_SALT` | **Server-only** | HMAC salt for caller IPs (`openssl rand -hex 32`) |
| `IP_DAILY_LIMIT` | **Server-only** | Images per IP per UTC day; defaults to 30 |

**Database.** Run each file in `supabase/migrations/` in filename order in the Supabase SQL editor. The first one also creates the public `generations` Storage bucket.

**Dashboard settings** (Authentication → Sign In / Providers):

- **Anonymous sign-ins: on.** The whole guest flow depends on it.
- **Confirm email: off.** Sign-up upgrades the guest immediately; see Known limitations for the trade-off.

```bash
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
```

Node 22 (`.nvmrc`). Anonymous sign-ins are rate-limited to 30 per hour per IP by default, so heavy local testing may need that raised temporarily in Authentication → Rate Limits.

---

## Product decisions

The judging criteria are speed, product judgement and UX/UI. The plan was to make the one loop that proves the product real, then spend the rest on surfaces that make it feel like the real thing.

**Built first, and why**

| Order | What | Criterion it serves |
|---|---|---|
| 1 | Deployed walking skeleton: anonymous session → `/api/generate` → Storage, tested on the live URL | Speed: every later step ships to a URL that already works |
| 2 | Credit hardening: caps, refunds, the 46-check suite | Product judgement: the thesis is only true if this is |
| 3 | Image studio, composer and pending tiles | UX/UI: this is where a reviewer spends their time |
| 4 | Out-of-credits modal, then Assets | Product judgement: the upsell moment, and proof the work persists |
| 5 | Explore home, mobile pass, then P1 extras | UX/UI: first impression and phone-width fidelity |

**Left out on purpose**

- **Video generation.** About $0.20–0.50 and 30–90 seconds per clip, which needs an async job pipeline, for a secondary surface. **The budget buys hundreds of images instead of a dozen clips**, and the core loop is identical.
- **Social and profile surfaces.** Follower counts, profile pages and comments are a lot of UI with no working loop behind them. The handle system exists; the social graph doesn't.
- **The plan recommender and compare table.** High effort, and with no payments in the demo nothing depends on which plan a visitor picks.
- **An open community feed.** A public prompt box plus open publishing is a moderation problem on day one. **The feed is hand-curated**: rows are featured in the SQL editor, nothing in the app can set the flag, and it is read server-side with an explicit field whitelist (never `user_id`, `ip_hash` or anything credit-related).
- **Payments.** No real money moves in a demo; the pricing page says so.

**Changed from the original.** Guests generate immediately instead of hitting a signup wall. The prompt improver is free, because charging a credit for a call that costs about $0.00003 would misrepresent the cost.

---

## Known limitations

- **Community image URLs contain the creator's user id.** Storage paths are `{user_id}/{generation_id}/{i}.jpg`. The id is inert (no policy lets anyone act on it), but it is exposed. The fix is a copy to an unguessable public path on featuring.
- **The sign-up bonus can be farmed.** Email confirmation is off, so any address works. **Actual spend is bounded by the per-IP cap and the global budget, not by the bonus**, so farming moves credits but not dollars past those limits.
- **Anonymous sessions are browser-bound.** Clear storage or switch device before signing up and the guest's gallery is unreachable. There is no recovery path.
- **The community feed is seeded with test accounts.** It shows real generations from this app, featured by hand, but not from real users.
- **`x-test-fail-fal` is a dev-only seam.** The route honours it only when `NODE_ENV === "development"`; Vercel builds always run in production mode.
- **Generation is synchronous.** Fine for Schnell and Dev under `maxDuration = 60`; it would not stretch to video without a queue.

---

## What's next with another day

1. **Video generation with a job queue.** Enqueue on spend, poll or subscribe for status, reuse the same `start`/`complete`/`fail` credit functions.
2. **Google OAuth via `linkIdentity`.** The same in-place upgrade as email: the anonymous user gains an identity and keeps its id.
3. **Verified email via custom SMTP.** Supabase's built-in sender is too rate-limited for real use; with confirmation on, the bonus stops being farmable.
4. **LLM-assisted moderation for open community publishing.** Screen prompt and image on publish, keep hand-featuring as the override, and move community images to paths without user ids.

---

The palette and logo are deliberately my own: the accent colours are sampled from my logo, not Higgsfield's lime, and every image in the app comes from my own generations. This is an independent clone built as a take-home exercise. It is not affiliated with or endorsed by Higgsfield.
