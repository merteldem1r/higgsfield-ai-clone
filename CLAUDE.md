# CLAUDE.md

Working rules for Claude Code in this repo.

## Git

- Never run `git commit`, `git push`, `git reset`, `git rebase`, or anything else that rewrites history (`commit --amend`, `push --force`, `filter-branch`, `checkout -- <file>` over uncommitted work, etc.). `git commit` and `git push` are also denied in `.claude/settings.json`.
- The user makes all commits. When a task is done, list the changed files and suggest a commit message.
- Read-only git commands (`status`, `diff`, `log`, `show`) are fine.

## Agent logs and hooks

- `.agent-logs/` is written only by the capture hook and is append-only. Never edit, delete, move or reformat anything in it.
- Don't modify `.claude/hooks/` unless the user asks.

## Secrets

- Never hardcode or print API keys or other secrets. Don't echo them in commands, logs or responses.
- Keep keys in `.env.local`.
- Server-only keys never go into client code or `NEXT_PUBLIC_` variables.

## Work style

- Propose a plan before large changes.
- Work in small steps.
- Before adding any dependency, say why it's needed.
- Deliver the scope asked for. Don't widen it, narrow it, or refactor adjacent code you weren't asked to touch. If you spot a real problem outside the scope, say so and keep going.
- Report honestly. If a check or build fails, show the output. Don't describe something as working when you haven't run it.
- Think with me, not just for me.
  - If you're uncertain, say so instead of picking silently.
  - If you have a better idea than what I asked for, say it before building. I'd rather argue for two minutes than rebuild for twenty.
  - Ask when something is ambiguous or expensive to reverse: schema shape, an API contract, anything touching credits or money. Routine judgement calls are yours to make; these are not.

## Project context

This is a clone of higgsfield.ai, an AI image and video generation product. A visitor types a prompt and gets a real AI image with no signup, and credits are enforced server-side. It's a **24h take-home with a deadline**, judged on speed, product judgement and UX/UI.

- **Scope, build order, data model, credit rules:** `docs/PLAN.md`.
- **Tokens, type, components, states, motion:** `docs/DESIGN.md`.
- Read the relevant one before starting a task. Don't restate them here.

**Stack.** Installed versions from `package.json` (scaffolded with `create-next-app@16.3.6`, Turbopack).
- Next.js 16.3.6 (App Router, `src/` dir), React 19.2.8, TypeScript 5.9 (strict), ESLint 9 with `eslint-config-next`.
- Tailwind CSS 4.3 via `@tailwindcss/postcss`. There's no `tailwind.config`; tokens live in `@theme` in `src/app/globals.css`.
- Supabase: `@supabase/supabase-js` 2.x and `@supabase/ssr` 0.12 for anonymous auth, Postgres and Storage. Installed in step 1.
- fal.ai: `@fal-ai/client` 1.x, with Flux Schnell plus one premium model. Installed in step 1.
- Hosted on Vercel.

**Env vars.** Names live in `.env.example`; values live in `.env.local` locally and in Vercel project settings for deploys.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public, safe in the browser bundle.
- `SUPABASE_SERVICE_ROLE_KEY`, `FAL_KEY`: server-only. Never `NEXT_PUBLIC_`, never imported into client code.

**Rules that must not be broken**
- The fal key (`FAL_KEY`) is only read on the server. No fal client proxy, no browser calls to fal.
- Credits change **only** through the Postgres functions (`start_generation`, `fail_generation`, …). Never `UPDATE profiles.credits` from app code.
- `EXECUTE` on the credit functions is revoked from `anon` and `authenticated`. Only the service role calls them.
- RLS is enabled on every table. **Anonymous users get the `authenticated` role, so "authenticated can do X" means "any visitor can do X".** Write policies with that in mind, scoping them to `auth.uid() = user_id`.
- No Higgsfield logos, photos or video. Showcase and empty-state images come from our own generations.

**Folder structure** (as of step 3; update when top-level folders change):
```
.
├── .agent-logs/          # capture-hook output, append-only, committed
├── .claude/              # settings.json + hooks/capture.py
├── docs/
│   ├── ASSIGNMENT.md
│   ├── PLAN.md           # scope, build order, data model, credit rules
│   ├── DESIGN.md         # tokens, type, components, states, motion
│   └── recon/            # notes.md + screenshots/ of the original
├── public/
│   ├── showcase/         # our own Flux Dev generations: hero stack, carousel posters, home grid
│   └── presets/          # one image per home preset, generated from that preset's own prompt
├── scripts/
│   └── test-credits.mts  # npm run test:credits; credit/abuse checks against next dev
├── supabase/
│   └── migrations/       # SQL applied by hand in the Supabase SQL editor
├── src/
│   ├── app/
│   │   ├── api/generate/route.ts  # POST: auth → start_generation → fal → Storage → complete
│   │   ├── api/assets/[id]/favourite/route.ts  # POST: auth → set_favourite
│   │   ├── _home/        # / sections: carousel, hero composer, showcase grid, presets
│   │   ├── assets/       # /assets: the visitor's gallery (RLS-scoped reads), search, favourites, grid slider
│   │   ├── community/    # /community: featured generations, read server-side (service role, whitelisted fields)
│   │   ├── image/        # /image: chat thread, assistant lines, run media, ambient background
│   │   ├── pricing/      # /pricing: plan cards (UI only), FAQ
│   │   ├── globals.css   # Tailwind import + @theme design tokens
│   │   ├── layout.tsx    # next/font, AppProvider, header, auth modal
│   │   ├── page.tsx      # Explore home
│   │   └── favicon.ico
│   ├── components/       # cross-route: header/nav, credits pill, toast, auth modal, lightbox, footer, fanned stack, icons
│   │   └── composer/     # the composer (used by / and /image) + sessionStorage handoffs to /image (generate / draft)
│   └── lib/
│       ├── credits.ts    # model costs, prompt limit, aspects; shared by UI and API
│       ├── download.ts   # cross-origin image download via blob URL
│       ├── fal.ts        # server-only; every fal call lives here
│       ├── ip.ts         # server-only; caller IP → salted hash, IP_DAILY_LIMIT
│       └── supabase/     # client.ts + session.ts (browser) · server.ts (server-only: session + admin)
├── .env.example          # env var names, no values
├── .env.local            # real values, gitignored
├── eslint.config.mjs
├── next.config.ts
├── package.json / package-lock.json
├── postcss.config.mjs
├── tsconfig.json         # strict, "@/*" → ./src/*
├── CAPTURE-TEST.md
└── CLAUDE.md
```
`src/components/` is for cross-route pieces only.

## Priorities, when they conflict

correctness → security → speed of delivery → polish

## Next.js conventions

- Server Components by default. Put `"use client"` on the leaf that needs interactivity, never on a page or layout.
- Generation goes through `POST /api/generate` (a Route Handler), not a Server Action, so it can be curl-tested.
- Style with Tailwind only, using the `docs/DESIGN.md` tokens defined once as CSS variables in the Tailwind v4 `@theme`. No inline styles, no CSS modules, no raw hex values in components.
- Every clickable element must show `cursor: pointer` (disabled ones: `not-allowed`). Tailwind v4 resets buttons to `cursor: default`, so a base rule in `globals.css` restores it for `button`/`[role=button]`; anything else clickable (a `div` or `li` with `onClick`) needs `cursor-pointer` on it.

## Architecture boundaries

- There are two Supabase clients:
  - **Browser:** anon key; can only SELECT the user's own rows.
  - **Server:** service role, in a module that starts with `import "server-only"`. Never imported by a client component.
- All fal calls live in one server module. No component calls fal directly.
- Credit costs live in one constants file, imported by both the UI and the API route, so the button and the server can never disagree.

## Code

- TypeScript strict, no `any`.
- Keep small components next to the route that uses them. `components/` is only for things shared across routes.
- Comments explain why, not what, and only where a line looks wrong and isn't.
- No speculative abstraction.

## Judgement

This is a demo: a working surface beats a perfect one. The exception is credits and secrets, where correctness beats speed every time.
