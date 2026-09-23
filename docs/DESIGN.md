# DESIGN — visual spec

Surface, border and text colors are pixel-sampled from `docs/recon/screenshots/`. **The accent palette is ours:** it's sampled from our logo (`src/app/logo.png`) and replaces Higgsfield's lime. The rule is that the brand gradient goes on the large "money" surfaces (Generate, Sign up, CTAs, the hero's second line) and solid violet `--accent` goes on small UI (active nav, focus rings, checks, links, open-chip borders), where a gradient would turn muddy. Sizes are measured in CSS px: the desktop captures are @2x of a 1710px-wide viewport and the mobile ones are @2x of about 394px. Radii and motion timings are estimates read off the screenshots. Anything marked *(ours)* doesn't appear in the recon; it's our own design in the same style.

## 1. Tokens

```css
:root {
  /* surfaces, darkest → lightest */
  --bg-0: #0f1113;        /* page, nav */
  --bg-1: #131517;        /* sidebars, modal, panels */
  --bg-2: #1c1e20;        /* cards inside panels, composer */
  --bg-3: #1f2123;        /* setting cells, empty placeholders, icon buttons */
  --bg-4: #23262b;        /* feature tiles on Explore */
  --bg-5: #2e3135;        /* chips on tiles, hover on bg-3/4 */
  --chip: #222222;        /* composer chips (neutral, not blue-tinted) */
  --tabbar: #0b0c0e;      /* mobile bottom bar */
  --overlay: rgb(0 0 0 / .8);   /* modal backdrop (#0f1113 → #030304) */

  /* borders */
  --border-1: #1f2123;    /* dividers */
  --border-2: #26292b;    /* panel edges */
  --border-3: #2b2c2e;    /* buttons, inputs */

  /* text */
  --text-1: #ffffff;
  --text-2: #898a8b;      /* subtitles, labels, inactive tabs */
  --text-3: #737475;      /* "OR", meta */
  --text-placeholder: #a0a1a2;
  --text-disabled: #57595a;

  /* brand: sampled from the logo, left → right */
  --brand-sky: #69c5fa;
  --brand-violet: #8472fb;
  --brand-pink: #ed77cc;
  --brand-peach: #fbca74;
  --brand-gradient: linear-gradient(100deg, sky, violet 38%, pink 68%, peach);
  --brand-gradient-muted: same stops mixed 78% with --bg-2;   /* disabled Generate; text at 70% */

  /* accent: solid, for small UI */
  --accent: #8472fb;              /* rings, borders, icon fills */
  --accent-text: #a99cfc;         /* 12–14px text: links, active nav, checks */
  --accent-hover: #c3b9fd;
  --accent-ink: #0f1113;          /* text on the gradient / accent fills (≥5:1 on every stop) */
  --accent-tint: #1e1e2e;         /* "business email" button bg (accent 10% over bg-1) */
  --accent-tint-2: #242339;       /* Login button bg (15%) */
  --accent-badge-bg: #2a2646;     /* "New"/"Soon" nav badges (22%) */

  /* status */
  --danger: #f5475f;              /* errors, blocking notices, 0 credits; never brand pink */

  /* promo + badges */
  --blue: #2663eb;                /* "CORE" badge */
  --blue-offer: #3352e9;          /* "Special offer" badge */
  --sky: #2a97f3;                 /* "BEST VALUE" */
  --purple: #830eff;              /* "TOP" on mobile hub */
  --gold: #e9d7a2;                /* "Contests" nav text */

  /* shape */
  --r-xs: 4px;   /* nav badges */
  --r-sm: 6px;   /* banner button, small badges */
  --r-md: 10px;  /* chips, nav buttons */
  --r-lg: 12px;  /* setting cells, result tiles, video-sidebar cards */
  --r-xl: 16px;  /* Generate, feature tiles, modal image panel */
  --r-2xl: 24px; /* composer, modal */
  --r-full: 9999px;

  /* spacing: 4px base */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px; --s-5: 20px;
  --s-6: 24px; --s-8: 32px; --s-10: 40px; --s-12: 48px; --s-16: 64px;

  /* elevation */
  --lip: inset 0 -3px 0 rgb(0 0 0 / .4);                   /* gradient buttons */
  --shadow-float: 0 12px 40px rgb(0 0 0 / .5);             /* composer, popovers */
  --shadow-modal: 0 24px 80px rgb(0 0 0 / .6);
  --ring-focus: 0 0 0 2px var(--bg-0), 0 0 0 4px var(--accent);
}
```

## 2. Typography

- **Display: Barlow Condensed 800** (Google). It's condensed by default, so there's no width axis to configure. **This is a deliberate trade of fidelity for certainty.** Archivo at `font-stretch: 75%` is visually closer, but it only works if the wdth axis comes through `next/font`. If that fails silently, headlines render at normal width, and the condensed uppercase headline carries most of the look. Fallback stack: `"Barlow Condensed", "Arial Narrow", sans-serif`.
- **Body: Inter** 400/500/600.
- Numbers (credits, costs, counts) use `font-variant-numeric: tabular-nums`.

| Role | Face | Size / line height | Weight | Case, tracking |
|---|---|---|---|---|
| Display (hero h1) | Barlow Condensed | 48/44 (mobile 34/32) | 800 | UPPER, 0. The second line is often `--brand-gradient` text |
| h2 (section) | Barlow Condensed | 30/30 | 800 | UPPER, +0.005em. Often gradient text |
| h3 (tile title) | Barlow Condensed | 22/24 | 800 | UPPER, +0.01em |
| Title (modal, page) | Inter | 28/34 | 600 | Sentence case, −0.02em |
| Body | Inter | 14/20 | 400 (UI labels 500) | 0 |
| Small | Inter | 12/16 | 500 | 0 |
| Badge | Inter | 10/12 | 700 *italic* | UPPER, +0.02em |

## 3. Components

**Promo banner:** 44px tall, full width, `--bg-1` background with a 1px `--border-1` bottom edge. Centered row: tag icon in `--accent`, 14/600 text in `--brand-gradient`, and a gradient button (26px tall, 10px horizontal padding, `--r-sm`, 12/600 `--accent-ink` text). A close X sits 16px from the right edge. Dismissal is stored in localStorage. Only one message at a time.

**Top nav:** 52px tall, `--bg-0`, no border. From the left:
- Logo, 28px.
- Up to 5 links, 14/500 in `--text-2`, 20px apart. The active link is `--accent-text`.
- An optional "New" badge after a link: 16px tall, `--accent-badge-bg` fill, `--accent-text` 10/600 text, `--r-xs`.
- On the right: Pricing pill, **credits pill** *(ours)*, then Login and Sign up.
  - All buttons are 32px tall with `--r-md`. Login uses `--accent-tint-2` with `--accent-text`. Sign up uses `--brand-gradient` with `--accent-ink` text; hover is `brightness(1.1)`.
  - Pricing pill: `--bg-3` fill. A "30% OFF" `--brand-pink` badge hangs below it, overlapping by −8px (9/700 `--accent-ink`, `--r-xs`).
  - Credits pill: 32px tall, `--r-full`, `--bg-3` fill, 1px `--border-3`, 12px horizontal padding. Gradient sparkle icon, then the count in 14/600 tabular. At 0 credits the count turns `--danger`. Clicking it opens the auth modal (anonymous users) or Pricing (signed-in users).
- Signed in, the avatar replaces Login and Sign up: 32px circle filled with `--brand-gradient`.

**Docked composer (Image):**
- **Position:** fixed, 20px above the viewport bottom, centered, `max-width: 1120px`, 16px side margins. `--bg-2` background, 1px `--border-2`, `--r-2xl`, 20px padding.
- **Depth *(ours)*:** results scroll underneath, so it uses `--shadow-dock` (black, on all sides: `0 -12px 40px /.6`, `0 16px 48px /.7`, a 1px black ring) instead of `--shadow-float`. A page-color scrim sits behind it (`--bg-0` → transparent, 176px, 240px on mobile) so images fade out rather than cut off at its edge. The inline composer on Explore keeps `--shadow-float` plus its glow.
- **Grid:** two columns. The left column holds two rows; the right column is the Generate button.
  - **Row 1:** a 32px square "+" button (`--bg-3`, `--r-md`), then an auto-growing textarea (15/22 text, `--text-placeholder` placeholder, 1–5 lines).
  - **Row 2:** chips in this order: Model, Aspect, Batch stepper (− 1/4 +), 8px apart.
  - **Generate:** 174×82 desktop (it spans both rows), `--r-xl`, `--brand-gradient`, `--lip`, hover `brightness(1.1)`. Content is "Generate" (16/600) + sparkle + the struck cost in `--accent-ink` at 50% + the real cost in 16/700.
  - **Disabled** (empty prompt or request in flight): `--brand-gradient-muted`, no lip.
  - **Cost higher than balance:** the label reads "Get more credits" and clicking opens the modal.
- **Mobile (< 640px):** one column. The chips scroll horizontally, and Generate becomes full width and 52px tall.
- **While a generation is in flight** *(ours)*. This runs from the click until the tile resolves, and covers the lazy sign-in too.
  - The **textarea stays editable**, so the user can write the next prompt.
  - **Chips drop to 50% opacity and ignore clicks.** Any open dropdown closes. The settings being used belong to the pending tile, so changing them mid-flight would be misleading.
  - The **"+" button is disabled** the same way.
  - **Generate** uses `--brand-gradient-muted` with no lip. Its label becomes a 16px spinner + "Generating…" (16/600). The cost is hidden.
  - The whole composer border turns 1px `--accent` at 30% and pulses 30% → 60% on a 1.6s loop (static under reduced motion).
  - **One request at a time.** Enter or a click during flight does nothing.
  - **On success or failure** the composer is fully interactive again within 150ms. On failure it also keeps the prompt text.

**Chip + dropdown:**
- **Chip:** 38px tall, 12px horizontal padding, `--chip` fill, 1px `rgb(255 255 255 / .06)` border, `--r-md`. 16px icon + 14/500 white label + optional chevron. Hover: `--bg-5`. Open: 1px `--accent` border at 40%.
- **Dropdown:** a popover above the chip with an 8px gap. `--bg-1`, 1px `--border-3`, `--r-lg`, `--shadow-float`, 6px padding.
  - Rows are 40px tall with `--r-md`.
  - Model rows show a name (14/500), a 12px description in `--text-2`, and the credit cost aligned right.
  - The selected row gets an `--accent-text` check. Locked rows are 50% opacity with a lock icon.

**Run feed (Image) *(ours)*:** results are grouped by Generate click ("run") in chat order: oldest at the top, newest right above the composer. This replaces a flat tile grid, where one result looked like a lost thumbnail.
- **Column:** the feed shares the composer's column exactly (1120px max, 16px gutters), so the image, its prompt and the composer all line up. Runs are separated by a 1px `--border-1` divider with 32px vertical padding. A feed shorter than the viewport sits at the bottom, just above the composer. New runs enter with rise-in, and starting one scrolls smoothly to the bottom. Loading history jumps straight to the newest.
- **Run header:**
  - The prompt at 15/22 `--text-1`, clamped to 2 lines.
  - Then tags: 24px, `--bg-3`, `--r-md`, 12/500 `--text-2`, for the model (gradient sparkle), the aspect, and "N images" when N > 1.
  - Then the status: a spinner + "Generating" in `--accent-text`, "Failed, credits refunded" in `--danger`, or the time in `--text-3`.
  - On the right, a "Reuse" button (32px, `--bg-1`, 1px `--border-3`) loads the prompt and all its settings into the composer.
- **Row sizing:**
  - A run's images share one height, so a batch reads as a set. It's kept modest on purpose: clicking opens the full-size lightbox.
  - The row is a CSS grid whose max width is `row-h × ratio × n + gaps`. Row height is `min(38vh, 360px)` for one image, then `min(32vh, 300px)` / `min(28vh, 260px)` / `min(26vh, 240px)` for 2 / 3 / 4.
  - A batch of 4 is 2×2 below 640px.
  - Tiles use `--r-xl`, keep their true aspect ratio, and are left-aligned under the header.
- **Generating tile:**
  - Behind: the logo colors as a conic gradient, blurred 64px at 30% and rotating over 7s, with each batch tile phase-shifted. The pending shimmer sweeps on top.
  - Centered: a 24px gradient sparkle that breathes (scale .88↔1.08), "Generating" (14/500), and an elapsed "3.2s" counter (12px tabular).
  - Bottom: a 2px gradient progress line. It's an estimate from the model's typical time (`estSeconds`), easing toward 95%, so it never claims done early.
  - It renders the moment Generate is clicked, before auth or the API.
- **Finished tile:**
  - The glow stays under the image until its bytes load, then the image resolves with the reveal.
  - Hover: the image scales 1.015, and a 32px download button appears top-right (`rgb(0 0 0 / .5)` + blur). It's always visible on touch.
  - Click opens the lightbox on `--overlay`.
- **Failed tile:** same size as the image would be. `--bg-2` with a 1px `--danger` 25% inner ring, a 20px `--danger` icon, "Generation failed", "Your credits were refunded.", and a bordered "Try again" button.
- **Under reduced motion:** no glow rotation, breathing, shimmer or reveal blur. Fades only.

**Error surfaces *(ours)*:** every server error code maps to exactly one surface.

| Code | Surface | Tile | Credits |
|---|---|---|---|
| `INSUFFICIENT_CREDITS` | Auth modal, out-of-credits variant (Pricing if signed in). No toast | Pending tile removed | Not charged |
| `GLOBAL_CAP` | **Notice bar** in the `danger` tone, sticky until dismissed or reload | Pending tile removed | Not charged |
| `FAL_DISABLED` (503) | **Notice bar** in the `neutral` tone, sticky | Pending tile removed | Not charged |
| `IP_LIMIT` (429) | **Notice bar** in the `neutral` tone, sticky | Pending tile removed | Not charged |
| Provider failure / timeout | **Failed tile** + toast in the `danger` tone, 5s | Failed tile | Refunded |
| Network / unknown | Toast in the `danger` tone, 6s, with a Retry action | Pending tile removed | — |

- **Notice bar:** for states that block generating.
  - Placement: it docks **directly above the composer**, same width (max 1120px), with an 8px gap. On mobile it sits above the full-width Generate area.
  - Size and shape: 48px tall, 16px horizontal padding, `--r-lg`, `--shadow-float`.
  - Content: 16px icon, 14/500 text, an optional right-aligned text link (13/600), and a 16px X.
  - Tones:
    - `danger`: `--danger` at 12% fill + 1px `--danger` at 40% border + `--text-1` text, `--danger` icon.
    - `neutral`: `--bg-1` fill + 1px `--border-3` border.
  - Copy:
    - GLOBAL_CAP: "Demo budget reached for today — generation resumes tomorrow. Your gallery is still here." Link: "View assets".
    - FAL_DISABLED: "Generation is paused right now. Try again in a few minutes."
    - IP_LIMIT: "Daily limit reached on this network. Come back tomorrow."
  - While a notice bar is shown, Generate stays disabled.
  - Enter animation: `translateY(8px)→0` + fade, 200ms.
- **Toast:** for one-off failures that don't block the next attempt.
  - Placement: **top-center, 12px below the nav** (mobile: 12px below the top safe area). One at a time; a new toast replaces the old one.
  - Size and shape: `max-width: 420px`, at least 44px tall, `12px 14px` padding, `--bg-1` fill, 1px `--border-3`, `--r-lg`, `--shadow-float`.
  - Content: a 3px left accent bar in the tone color, a 16px icon, 14/500 text, an optional `--accent-text` text action.
  - Dismissal: auto-dismisses after 5s (6s when it has an action). Hovering pauses the timer, and swiping up or clicking the X dismisses it.
  - Copy for a provider failure: "Generation failed — 2 credits refunded."
- **Accessibility:** notice bars are `role="status"`. Toasts are in an `aria-live="polite"` region. Neither ever steals focus. Only the modal traps focus.

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

**Badge pills:**
- **Base:** 18–20px tall, 6px horizontal padding, `--r-sm` (desktop cards use `--r-xs`), Badge type style.
- **Solid:** TOP `--brand-pink`/`--accent-ink` · CORE `--blue`/white · TOP (hub) `--purple`/white · NEW, FREE `--brand-gradient`/`--accent-ink` · BEST VALUE `--sky`/white.
- **Soft** (in nav): `--accent-badge-bg`/`--accent-text`, upright (not italic), 10/600.
- **Category chip on tiles:** "Image"/"Video", 24px tall, `--bg-5` fill, `--r-md`, 12/500 `#d6d6d7`, with an icon.

**Mobile bottom tab bar (< 768px):**
- **Bar:** fixed, 64px tall + `env(safe-area-inset-bottom)`. `--tabbar` background, 1px `--border-1` top border.
- **Items:** Home, Explore, **Create**, Assets, Profile. Each is a 22px icon above an 11/500 label. Inactive items are `--text-2`, the active one `--text-1`.
- **Create:** a `--brand-gradient` button, 64×44, `--r-lg`, `--lip`, dark sparkle icon, no label, rising 6px above the bar.
- **Create hub:** tapping Create opens a full-screen sheet.
  - Sheet: `#131313` background. 28/600 "Create" title. 40px close circle (`--bg-3`).
  - Filter pills, 44px tall: active is white with black text, inactive is `--text-2` text.
  - Cards: 2 columns, 12px gap, `--chip` fill, `--r-xl`. Each card has an image top (4:3), an h3, a 13px `--text-2` subtitle and a corner badge.

**Page layout:** content max width 1440px, 16px gutters on mobile and 24px on desktop. On Image, results scroll behind the composer, with 180px of bottom padding so the last row stays visible.

## 4. Motion

Easing: `--ease-out: cubic-bezier(.2,.8,.2,1)`.

| What | Animation | Duration |
|---|---|---|
| Hover color/background | color, bg, border | 150ms ease |
| Gradient button press | `translateY(1px)`, lip 3px → 1px | 80ms |
| Modal open / close | backdrop opacity; panel `scale(.96)→1` + fade | 220ms `--ease-out` / 150ms ease-in |
| Popover / dropdown | fade + `translateY(4px)→0` | 150ms |
| Auth carousel | auto-advance; bar fills linearly; image crossfade | 5s per slide / 400ms |
| Pending shimmer | background-position sweep, infinite | 1.6s linear |
| Result reveal | opacity 0→1 + `blur(20px)→0` + `scale(1.04)→1` | 700ms `--ease-out` |
| Generating glow | conic brand gradient rotates 360°; sparkle breathes | 7s linear / 1.8s |
| Fanned stack mount | from 0° to its final rotation, 60ms stagger; hover adds ±3° to the spread | 500ms `--ease-out` |
| Credits change | number ticks down; at 0, pill pulses `--danger` twice | 300ms / 2 × 400ms |
| Create hub (mobile) | `translateY(100%)→0` | 300ms `--ease-out` |
| Banner dismiss | height 44→0 + fade | 200ms |
| Composer in-flight border | accent border opacity 30% ↔ 60% | 1.6s loop |
| Notice bar in / out | `translateY(8px)→0` + fade / fade | 200ms / 150ms |
| Toast in / out | `translateY(-8px)→0` + fade / fade + `translateY(-4px)` | 200ms / 150ms |

With `prefers-reduced-motion: reduce`, keep only the opacity fades (≤150ms). No transforms, no shimmer (use a static `--bg-2`), no carousel auto-advance.
