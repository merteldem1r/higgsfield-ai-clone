# DESIGN — visual spec

**Darkroom.** A studio, not a storefront. Every page is one column; the composer sits at the top of it and the newest work directly beneath, so the prompt and the picture it made are always on screen together. Images are the only saturated colour. The chrome is a warm near-black whose surfaces are separated by spacing and one tone step, not by boxes. The logo gradient is spent in exactly two places: the Generate action, and whatever is live right now (the generating tile, the caret, the credits while they change). No uppercase, no gradient words, no badges. The voice is the assistant's voice already in the thread, extended to the whole UI: plain verbs, real numbers, nothing announced that doesn't exist.

**Redesign status.** §1 Tokens, §2 Typography, the header and footer, the composer, the contact sheet, error surfaces and §4 Motion are current (checkpoints 1–2). The fanned stack, auth modal, pricing, assets and badge entries still describe the previous UI and are rewritten as each surface is rebuilt; where they conflict, the current sections win.

## 1. Tokens

```css
:root {
  /* surfaces: warm near-black, one tone step apart */
  --bg-0: #121110;        /* page */
  --bg-1: #1a1918;        /* panels: dialog, menus, footer note */
  --bg-2: #211f1d;        /* raised: inputs, chips, hover on a panel */
  --bg-3: #2a2826;        /* hover on raised */
  --overlay: rgb(0 0 0 / .7);   /* dialog backdrop */

  /* hairlines */
  --line-1: #221f1d;      /* on the page (header, footer, dividers) */
  --line-2: #302d2a;      /* on panels; input borders */

  /* text: warm white, then two greys */
  --text-1: #f4f1ec;
  --text-2: #8c877f;      /* labels, secondary copy; 5.5:1 on bg-0 */
  --text-3: #6b665f;      /* meta, timestamps, copyright */
  --text-placeholder: #7a756d;
  --text-disabled: #55514b;

  /* brand: sampled from the logo, left → right. Generate, and whatever is live. */
  --brand-sky: #69c5fa;
  --brand-violet: #8472fb;
  --brand-pink: #ed77cc;
  --brand-peach: #fbca74;
  --brand-gradient: linear-gradient(100deg, sky, violet 38%, pink 68%, peach);
  --brand-gradient-muted: same stops mixed 78% with --bg-2;   /* disabled Generate */

  /* accent: the focus ring and links only. Active nav, checks and borders use text tones. */
  --accent: #8472fb;
  --accent-text: #a99cfc;         /* 12–14px links */
  --accent-ink: #121110;          /* text on the gradient (≥5:1 on every stop) */

  /* status */
  --danger: #f5475f;              /* errors, 0 credits; never brand pink */

  /* shape */
  --r-xs: 4px;   --r-sm: 6px;   --r-md: 8px;   /* buttons, chips, menu rows */
  --r-lg: 12px;  /* inputs, tiles, menus */
  --r-xl: 16px;  /* dialog, composer */
  --r-2xl: 20px;
  --r-full: 9999px;

  /* spacing: 4px base */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px;
  --s-6: 24px; --s-8: 32px; --s-10: 40px; --s-12: 48px; --s-16: 64px;

  /* elevation: menus and dialogs float; nothing else casts a shadow */
  --shadow-float: 0 12px 40px rgb(0 0 0 / .5);
  --shadow-modal: 0 24px 80px rgb(0 0 0 / .6);
  --ring-focus: 0 0 0 2px var(--bg-0), 0 0 0 4px var(--accent);
}
```

The old surface names (`bg-4`, `bg-5`, `chip`, `border-1..3`, the accent tints, the badge colours) are kept as transition aliases in `globals.css` and removed with the last page that uses them.

**Rules.** Filled panels are for things that float (menus, dialogs) or need to be read as an input. Everything else sits on the page and is separated by spacing or a hairline. Buttons: the primary action on a page is white on dark (`--text-1` fill, `--bg-0` text); Generate alone is the gradient; secondary actions are text with a hover fill of `--bg-2`. Badges, pills and tags are not part of the system.

## 2. Typography

- **One family: Onest** (Google, variable weight 400–700, native Cyrillic for the Russian locale). Loaded through `next/font` as `--font-onest`. Fallback stack: `ui-sans-serif, system-ui, sans-serif`.
- Sentence case everywhere. No uppercase, no gradient words, no italics.
- Numbers (credits, costs, seconds, ratios, counts) use `font-variant-numeric: tabular-nums`.

| Role | Size / line height | Weight | Tracking |
|---|---|---|---|
| Display (page headline) | 44/48 (mobile 34/38) | 500 | −0.025em |
| h2 (section) | 26/32 | 500 | −0.02em |
| h3 (tile, plan name) | 18/24 | 500 | −0.01em |
| Title (dialog) | 24/30 | 600 | −0.02em |
| Wordmark | 15/20 | 600 | −0.01em |
| Body | 14/20 | 400 (UI labels 500) | 0 |
| Small | 12/16 | 500 | 0 |

**Header.** 56px, sticky, `--bg-0` at 85% with a backdrop blur, 1px `--line-1` bottom edge. Left: the wordmark (24px mark + "Darkroom"), then four links 24px apart, 14/500, `--text-2`, the active one `--text-1`. Right: the credits figure (gradient sparkle + "6 credits", tabular, `--danger` at 0), the language button (globe + code), a hairline, then "Sign in" (text) and "Sign up" (white fill). Signed in, a 32px `--bg-2` circle with the initial replaces both. Below xl (seven links plus the guest controls need about 1040px): wordmark, credits (number only below sm), Sign up, menu button. The menu is a full-screen sheet with the same links, Sign in, and the language control. There is no promo banner and no bottom tab bar.

**Footer.** 1px `--line-1` top edge, 40px vertical padding. Left: wordmark, one line about the demo, "© 2026" in `--text-3`. Right: the four links plus Source.

## 3. Components

**Composer (the bench):** the top of the studio column, never fixed. `--bg-1` panel, 1px `--line-2` ring, `--r-lg`, 16px padding.
- **Prompt:** a textarea at 16/24, 3 lines at rest, growing to 10 (`field-sizing: content`, with a Firefox fallback). Enter submits, Shift+Enter breaks. A counter appears at 80% of the limit.
- **Under the prompt:** the improver's status ("Improving…", then "Prompt improved" with an Undo link) and the character counter, in 12px `--text-2`. Below that, the **notice** slot (see Error surfaces).
- **Settings row:** Model (icon, name, and its credit cost in `--text-2`), Aspect (a glyph and the ratio), Count ("1 image" between − and +), then, right-aligned, the wand and Generate. Chips are 36px, `--bg-2`, `--r-md`, no border; open or hover is `--bg-3`. Menus open downward: `--bg-1`, 1px `--line-2`, `--r-lg`, `--shadow-float`, 40px rows with a check on the selected one.
- **Generate:** 40px, `--r-md`, `--brand-gradient`, `--accent-ink`, reading "Generate" and the cost as "2 credits" at 80%. It is the only gradient fill in the studio. Disabled: `--brand-gradient-muted`. Cost above balance: "Get more credits", which opens the modal. Full width below 640px.
- **Meter row:** the balance as text, then the dot meter: one dot per credit of a new member's starting balance, filled dots sharing the logo gradient left to right, empty ones `--bg-3`. The fill is one clipped rect whose width animates 300ms, so a confirmed spend ticks the dots off.
- **The wand:** a 36px `--bg-2` button. While the rewrite is in flight it shows a spinner and the textarea dims to 40%; the rewrite arrives whole and the textarea fades back. Undo restores the original.
- **While a run is live:** the textarea stays editable so the next prompt can be written; chips drop to 50% and ignore clicks; Generate shows a spinner and "Generating…"; one request at a time.

**Contact sheet (the studio):** every Generate click is one frame, stacked newest-first under the composer, 40px apart, in the composer's 880px column. A run is a frame, not a message: no bubbles, no avatar, no narration.
- **Days:** a rule with "Today", "Yesterday" or the date separates days. The first 8 runs render; "Show earlier (N more)" reveals 8 at a time. History images are lazy.
- **Media:** images fill the column, capped at 70vh: one across, two side by side, three across at 60vh, four as two by two at 40vh. Tiles keep their true ratio, `--r-lg`, `--bg-1` under the image. Hover or focus shows the favourite heart and a download button top-right (`rgb(0 0 0 / .5)` + blur), always visible on touch. Click opens the lightbox.
- **Caption row:** the prompt on the left in 14/20, clamped to two lines and expandable on click. On the right, in 12px `--text-2` tabular figures: the time (`--text-3`), model, aspect, seconds taken, credits used.
- **Actions:** 32px `--bg-2` chips. Reuse on every finished frame. The newest finished frame also carries the three one-step variations with their cost (the other model, 4 takes or one, wide or vertical). A chip only loads the composer and scrolls it into view; it never generates.
- **Pending frame:** the size the image will be, `--bg-1` with a 1px `--line-2` inset ring. Behind it the brand conic glow at 14–28% breathes on a 4s loop: the one thing that moves. Centred, the elapsed time ("3.2s", 14px tabular). At the bottom a 2px gradient estimate bar eased toward 95% from the model's typical time. The caption's facts slot carries the voice: "Rendering one frame at 16:9 with Flux Schnell."
- **Resolve:** the glow stays until the bytes arrive, then the image fades in over 600ms. No blur, no scale.
- **Failed frame:** same size, 1px `--danger` 30% inset ring, alert icon, the failure line ("Flux Dev couldn't finish this one. Your 6 credits are back.") and a Try again button. Retry adds a new run above; the failed frame collapses to a one-line record with its time.
- **Voice:** built from real facts only (model, aspect, take count, time, credits, error codes; `assistant-lines.ts`). Wording is picked by hashing the run id. It speaks on pending frames, failures and rejections; finished runs speak through their facts row. Nothing describes image content, because nothing looked at the image.
- **Ambient layer:** three static brand orbs plus film grain, fixed behind the page. Opacity 0 at rest, 60% while a run is live, 1s fade either way. Nothing drifts.
- **Empty state:** the composer, one line ("Describe a scene and a real image comes back in seconds. 6 free credits, no signup."), three starter prompts as underlined text links, then "Start from a style" (the eight presets as a strip) and "Made with Flux" (the showcase grid with Recreate).
- **Mobile:** the same column. Chips wrap, Generate goes full width, batches of four stay two by two. Nothing is fixed to the viewport.

**Error surfaces:** a request the server rejects before spending is not a run. Its pending frame is removed and the composer shows a **notice** under the prompt: `--bg-2`, `--r-md`, an icon (`--danger` for a credits or network problem, `--text-2` for a lock), the line, and the action inline as an `--accent-text` link. Typing clears a non-blocking notice.

| Code | Notice | Action | Composer | Credits |
|---|---|---|---|---|
| `INSUFFICIENT_CREDITS` | "Not enough credits…" (guest or member wording) + the auth modal opens (out-of-credits variant) | "Sign up for 20 credits" / "See plans" | Usable | Not charged |
| `GLOBAL_CAP` | "Today's demo budget is used up…" | — | Locked until reload | Not charged |
| `IP_LIMIT` (429) | "Your network has hit today's image limit…" | — | Locked until reload | Not charged |
| `FAL_DISABLED` (503) | "Generation is paused…" | Try again (unlocks and retries) | Locked | Not charged |
| Provider failure / timeout | Failed frame in the sheet | Try again | Usable | Refunded |
| Network / unknown | "I couldn't reach the server…" | Try again | Usable | — |

- **Toast:** for one-off notices outside the sheet (e.g. "Prompt trimmed to 500 characters."). Top-center, 12px below the nav, one at a time, `--bg-1`, 1px `--line-2`, `--r-lg`, `--shadow-float`, a 3px tone bar, auto-dismiss in 5s (6s with an action), hover pauses.
- **Accessibility:** the sheet is an ordered list labelled "Runs"; a pending frame is `role="status"`; the notice is `role="alert"`; the meter is decorative with the balance given as text. Only dialogs trap focus.

**Prompter:** for the moment before the composer: no idea yet, or a look that can't be put into words. The studio's 880px column: h1 and one line, the bench, the result, then the images to pick from.
- **Bench:** the composer's panel. Three 56px slots (filled ones show the pick and a remove button), the count ("2 of 3 picked"), and "Find the look" as the page's white primary. The notice slot sits under it, as in the composer.
- **Pool:** featured generations, then the showcase: every image ours, with the prompt that made it. Round-robin columns as on /community (2, then 3 from sm). A tile is a toggle: picked is a 2px `--text-1` inset ring and its number; with three picked the rest drop to 40% and refuse. The expand button (top-right, as in the sheet) opens the lightbox.
- **Thinking:** the pending frame at 192px tall: the breathing conic glow, elapsed seconds, a 2px estimate bar, and "Reading 2 prompts for the light, colour and framing they share." The only gradient on the page.
- **Result:** "The look" with the picks as 32px thumbs, then 3–6 phrase toggles (32px chips; on is `--bg-2` with a check, off is a `--line-2` outline with a plus). Pointing at a phrase dims the picks it didn't come from. "Try it on": three subjects, each shown as the full prompt (subject in `--text-1`, the look in `--text-2`) with "Open in studio". That stashes a draft on Flux Schnell × 1 at the first pick's ratio, with the subject pre-selected. It never generates.
- **Voice:** the model only reads prompts, so the copy says the look is "taken from the prompts behind your picks", never that anything looked at the images. The server drops any phrase it can't trace to a picked prompt.
- **Earlier:** a new result pushes the last one down to a one-line record (time, phrases, "Show"), up to five, under a rule like the sheet's day rule.
- **States:** nothing picked (empty slots, disabled button), picking, thinking, result, rate-limited (notice with a `--text-2` icon; the bench locks, like the wand, since both share one daily allowance per network), failed (notice with Try again), stale pick (Clear picks), featured feed failed (a line above the showcase-only grid), empty pool (the small fanned stack and a Generate link).

**Fanned photo stack (empty states):**
- **Arrangement:** four photos overlapping about 25%. Rotations are −8°, −3°, 0°, +6°, each lifted −4px. **The third photo is a circle**; the others are rounded squares with `--r-lg`.
- **Sizes:** each photo is about 150px on the Image hero and 52px on Assets and the other small empty states.
- **Styling:** 2px `rgb(255 255 255 / .18)` border, `0 8px 24px rgb(0 0 0 / .5)` shadow.
- **Below the stack:**
  - **Hero:** Display h1 (the second line in `--brand-gradient` text), then a 16/24 `--text-2` subtitle.
  - **Assets:** 16/600 title, 14px `--text-2` text, and a white "Generate" button (36px tall, `--r-md`, black text).

**Split auth modal:**
- **Shell:** centered, 1120×776 max (on mobile: full screen, image panel hidden). `--bg-1`, `--r-2xl`, `--shadow-modal`, 12px padding, backdrop `--overlay`.
- **Left half:** image carousel, `--r-xl`, full height.
  - Bottom-left overlay: a pill badge (for example "4K Resolution": 11/600, `rgb(40 44 48 / .8)` fill, `--r-sm`), then an h2 in Barlow Condensed 40px white, then a 14px `--text-2` line.
  - Below that, 4 segmented progress bars: 3px tall, 8px apart, `--progress-track` (#3d3b3b), white fill. A 12/500 label sits under each; the active label is white, the others `--text-2`.
- **Right half:** content centered in a 384px column.
  - Header: logo mark (40px), a Title, then a 14px `--text-2` subtitle. Titles *(ours, no product name yet)*: login "Welcome back", signup "Create your account".
  - Provider buttons: 56px tall, `--bg-1` fill, 1px `--border-3`, `--r-lg`, 14/600 white text, 12px apart.
  - **Login:** Google, an "OR" divider (12px `--text-3`), then "Continue with Email".
  - **Signup:** first an accent-tinted button ("Continue with email & get 50 credits": `--accent-tint-2` fill, `--accent-text`, gift icon), then Google, then a checkbox with 12px terms and 18+ text.
  - **Only Google and Email** *(ours)*. Apple and Microsoft are skipped in PLAN, so they aren't shown.
  - **UI only until P1/P2:** a provider click shows an inline 12px status line under the buttons ("… sign-in is coming soon. You can keep generating as a guest."). In signup mode with the box unticked, it says "Tick the box to accept the terms first." in `--danger` and outlines the checkbox. Inline rather than a toast, because the modal sits in the top layer above the toast region.
  - Footer: 1px `--border-1` rule, then a 13px `--text-2` mode switch: "New here? Sign up" / "Already have an account? Log in". This replaces the original's SSO line; we have no plans.
- **Close button:** 32px circle, `--bg-3`, top-right 16px.
- **Out-of-credits variant *(ours)*:** the signup layout with the title "You're out of free credits" and the subtitle "Sign up to get 50 more — your images stay in your gallery".
- **Carousel slides *(ours)*:** Flux Dev, Flux Schnell, Presets, Batch, over our own generations. The active bar's fill (5s, linear) drives auto-advance, and the labels are clickable. Under reduced motion the bar is simply full and nothing advances.

**Pricing page *(ours, reduced from the recon)*:** a 1120px column. It keeps the promo card, the plan cards and the FAQ, and drops the plan recommender, the comparison table and the Individual/Business tabs (see PLAN).
- **Promo card:** `--bg-1` with two radial glows (pink top-right, violet bottom-left) and a 1px white 8% border, `--r-2xl`.
  - A "Sign-up bonus" pink badge, then a Display headline whose first line is gradient text, then a 14px `--text-2` line.
  - A white "Sign up for 50 credits" button opens the auth modal.
- **Header:** "Upgrade your plan" at Inter 40/44 600, −0.02em, then a line about the free credits. A monthly/annual switch (`role="switch"`, track `--brand-gradient` when on, default annual) sits right-aligned above the cards, with a "30% OFF" pink badge.
- **Plan cards** (3 columns on lg, stacked below), `--r-2xl`, 20px padding:
  - Starter: `--bg-1`, `--border-2`, white CTA.
  - Plus (most popular): violet tint fading down, `--accent` 40% border, soft brand glow, gradient CTA with lip.
  - Ultra (best value): pink tint, `--brand-pink` 30% border, pink CTA with lip.
  - Each card has a condensed 28px name with badges, a tagline, and a credits box (black 25%, `--r-xl`). The box reads "N credits / month", then "≈ X Flux Schnell / Y Flux Dev images", computed from the real model costs.
  - The price is in condensed 40px. On annual the monthly price shows struck through in `--brand-pink`, with a "Save $N a year" line.
  - Features: a check in `--accent-text`, or an x in `--text-disabled`.
- **CTAs are UI only:** a neutral toast says "Payments aren't live in this demo…". A "Demo pricing. No payments are taken." line sits under the cards.
- **FAQ:** a 672px column of native `<details>`: `--bg-1` (`--bg-2` when open), 1px `--border-2`, `--r-xl`, 15/600 question, chevron that flips on open.
  - The answers describe the real demo, built from `credits.ts` constants: costs, free credits, refunds, no live payments, daily limits, not affiliated.
  - It ends with "Ready to try it?" and a gradient "Start creating" link to /image.

**Assets page:** real data. It reads the visitor's own `assets` (+ `generations` prompt/model/aspect) through the browser client, and RLS scopes it to them. Max 1440px, 16/24px gutters.
- **Sidebar** (256px on lg, sticky): `--bg-1` panel, `--r-2xl`, 1px `--border-2`, 12px padding.
  - Search: 40px, `--bg-3`, 1px `--border-3`, search icon, focus border `--accent` 50%. It filters by prompt, client-side.
  - Items: 40px, `--r-lg`, 16px icon, 14/500. Active is `--bg-3` + `--text-1`, others `--text-2` with a `--bg-2` hover. There's a count pill, or a "Soon" soft badge on disabled items.
  - The items are Assets, then Favourites (Soon), then a "Tools" group: Image (count), Video (Soon), Audio (Soon).
  - At the bottom, a `--bg-2` note: "Saved in this browser. Sign up to keep your gallery on every device." with a Sign up link.
  - Below lg: only the search and the Assets / Favourites row, which scrolls sideways.
- **Header row:** "All assets" (20/600), the image count ("3 of 12 images" while searching), and on lg a grid-size slider (2–6 columns, default 4) in a 40px `--bg-1` box.
- **Grid:** CSS columns (always 2 on mobile, the slider controls lg/xl), 6px gaps, true aspect ratios, `--r-lg` tiles.
  - Hover: the image scales 1.02, and a bottom gradient shows the prompt (2 lines) plus "Reuse" and download buttons (`rgb(0 0 0 / .5)` + blur). They're always visible on touch.
  - Click opens the lightbox.
  - **Reuse** stashes a *draft* (a separate sessionStorage key from the Generate handoff) and opens /image with the prompt and settings in the composer. It never starts a generation.
- **States:**
  - Loading: shimmer skeleton tiles in mixed aspects.
  - Empty: the small fanned stack, "Your generations will appear here", "Every image you make is saved here automatically.", and a white 36px "Generate" button.
  - No search results: "No images match that search" + "Clear search".
  - Load error: "Couldn't load your gallery" + "Try again".

**Badge pills:**
- **Base:** 18–20px tall, 6px horizontal padding, `--r-sm` (desktop cards use `--r-xs`), Badge type style.
- **Solid:** TOP `--brand-pink`/`--accent-ink` · CORE `--blue`/white · TOP (hub) `--purple`/white · NEW, FREE `--brand-gradient`/`--accent-ink` · BEST VALUE `--sky`/white.
- **Soft** (in nav): `--accent-badge-bg`/`--accent-text`, upright (not italic), 10/600.
- **Category chip on tiles:** "Image"/"Video", 24px tall, `--bg-5` fill, `--r-md`, 12/500 `#d6d6d7`, with an icon.

**Page layout:** the studio is an 880px column with 16px gutters; other pages keep 1440px max with 16/24px gutters until they are rebuilt.

## 4. Motion

Easing: `--ease-out: cubic-bezier(.2,.8,.2,1)`. Rule: only things that are actually changing move. No scroll reveals, no hover lifts, no entrances, no typewriters.

| What | Animation | Duration |
|---|---|---|
| Hover color/background | color, bg, border | 150ms ease |
| Menus, popovers, toasts | fade + 4–8px translate | 150–200ms |
| Modal open / close | backdrop opacity; panel `scale(.96)→1` + fade | 220ms `--ease-out` / 150ms ease-in |
| Pending frame | conic glow breathes 14↔28% opacity, scale .96↔1.04 | 4s loop |
| Estimate bar | scale-x toward 95% from the model's typical time | 100ms steps |
| Resolve | image opacity 0→1 over the glow | 600ms ease-out (300ms for history) |
| Ambient layer | opacity 0↔60% with the live state | 1s |
| Dot meter | fill width to the new balance | 300ms ease-out |
| Credits figure | number ticks to the new balance; at 0, pulses `--danger` twice | 300ms / 2 × 400ms |
| Wand | spinner while the rewrite is in flight; textarea 40%↔100% | 200ms |
| Auth carousel, fanned stack, Ken Burns (pages not yet rebuilt) | as before | — |

With `prefers-reduced-motion: reduce`: opacity fades only (≤150ms), the glow is static, the meter jumps, no spinner rotation.
