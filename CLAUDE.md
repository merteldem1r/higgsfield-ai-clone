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

**Stack.** These are the latest stable versions on npm as of 2026-09-22. Replace them with what `package.json` actually has after scaffolding.
- Next.js 16 (App Router), React 19, TypeScript (strict).
- Tailwind CSS 4.
- Supabase: `@supabase/supabase-js` 2.x and `@supabase/ssr` 0.12 for anonymous auth, Postgres and Storage.
- fal.ai: `@fal-ai/client` 1.x, with Flux Schnell plus one premium model.
- Hosted on Vercel.

**Rules that must not be broken**
- The fal key (`FAL_KEY`) is only read on the server. No fal client proxy, no browser calls to fal.
- Credits change **only** through the Postgres functions (`start_generation`, `fail_generation`, …). Never `UPDATE profiles.credits` from app code.
- `EXECUTE` on the credit functions is revoked from `anon` and `authenticated`. Only the service role calls them.
- RLS is enabled on every table. **Anonymous users get the `authenticated` role, so "authenticated can do X" means "any visitor can do X".** Write policies with that in mind, scoping them to `auth.uid() = user_id`.
- No Higgsfield logos, photos or video. Showcase and empty-state images come from our own generations.

**Folder structure:** _placeholder. Replace this with the real tree after scaffolding._

## Priorities, when they conflict

correctness → security → speed of delivery → polish

## Next.js conventions

- Server Components by default. Put `"use client"` on the leaf that needs interactivity, never on a page or layout.
- Generation goes through `POST /api/generate` (a Route Handler), not a Server Action, so it can be curl-tested.
- Style with Tailwind only, using the `docs/DESIGN.md` tokens defined once as CSS variables in the Tailwind v4 `@theme`. No inline styles, no CSS modules, no raw hex values in components.

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
