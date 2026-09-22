# DESIGN — visual spec

Colors are pixel-sampled from `docs/recon/screenshots/`. Sizes are measured in CSS px: the desktop captures are @2x of a 1710px-wide viewport and the mobile ones are @2x of about 394px. Radii and motion timings are estimates read off the screenshots. Anything marked *(ours)* doesn't appear in the recon; it's our own design in the same style.

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

  /* primary lime */
  --lime: #d1fe17;
  --lime-hover: #e2ff3a;          /* ours: +brightness */
  --lime-disabled: #b0d328;       /* = lime at ~80% over bg-2 */
  --lime-lip: #7d980e;            /* 3px bottom edge on lime buttons (lime × .6) */
  --lime-ink: #0f1113;            /* text on lime */
  --lime-tint: #262c1b;           /* "business email" button bg */
  --lime-tint-2: #2d3522;         /* Login button bg */
  --lime-badge-bg: #36411b;       /* "New"/"Free" nav badges */

  /* promo + badges */
  --pink: #ee1572;                /* "30% OFF", "TOP" badge */
  --pink-hot: #ff005b;            /* promo headline text */
  --magenta: #fa4ae6;             /* Ultra CTA gradient end */
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
  --lip: inset 0 -3px 0 rgb(0 0 0 / .4);                   /* lime buttons */
  --shadow-float: 0 12px 40px rgb(0 0 0 / .5);             /* composer, popovers */
  --shadow-modal: 0 24px 80px rgb(0 0 0 / .6);
  --ring-focus: 0 0 0 2px var(--bg-0), 0 0 0 4px var(--lime);
}
```

## 2. Typography

- **Display: Barlow Condensed 800** (Google). It's condensed by default, so there's no width axis to configure. **This is a deliberate trade of fidelity for certainty.** Archivo at `font-stretch: 75%` is visually closer, but it only works if the wdth axis comes through `next/font`. If that fails silently, headlines render at normal width, and the condensed uppercase headline carries most of the look. Fallback stack: `"Barlow Condensed", "Arial Narrow", sans-serif`.
- **Body: Inter** 400/500/600.
- Numbers (credits, costs, counts) use `font-variant-numeric: tabular-nums`.

| Role | Face | Size / line height | Weight | Case, tracking |
|---|---|---|---|---|
| Display (hero h1) | Barlow Condensed | 48/44 (mobile 34/32) | 800 | UPPER, 0. The second line is often `--lime` |
| h2 (section) | Barlow Condensed | 30/30 | 800 | UPPER, +0.005em. Often lime |
| h3 (tile title) | Barlow Condensed | 22/24 | 800 | UPPER, +0.01em |
| Title (modal, page) | Inter | 28/34 | 600 | Sentence case, −0.02em |
| Body | Inter | 14/20 | 400 (UI labels 500) | 0 |
| Small | Inter | 12/16 | 500 | 0 |
| Badge | Inter | 10/12 | 700 *italic* | UPPER, +0.02em |

## 3. Components

**Promo banner:** 44px tall, full width, `--lime` background. Centered row: tag icon, 14/600 text in `--lime-ink`, and a white button (26px tall, 10px horizontal padding, `--r-sm`, 12/600 black text). A close X sits 16px from the right edge. Dismissal is stored in localStorage. Only one message at a time.

**Top nav:** 52px tall, `--bg-0`, no border. From the left:
- Logo, 28px.
- Up to 5 links, 14/500 in `--text-2`, 20px apart. The active link is `--lime`.
- An optional "New" badge after a link: 16px tall, `--lime-badge-bg` fill, lime 10/600 text, `--r-xs`.
- On the right: Pricing pill, **credits pill** *(ours)*, then Login and Sign up.
  - All buttons are 32px tall with `--r-md`. Login uses `--lime-tint-2` with lime text. Sign up uses `--lime` with `--lime-ink` text.
  - Pricing pill: `--bg-3` fill. A "30% OFF" pink badge hangs below it, overlapping by −8px (9/700 white, `--r-xs`).
  - Credits pill: 32px tall, `--r-full`, `--bg-3` fill, 1px `--border-3`, 12px horizontal padding. Lime sparkle icon, then the count in 14/600 tabular. At 0 credits the count turns `--pink`. Clicking it opens the auth modal (anonymous users) or Pricing (signed-in users).
- Signed in, the avatar replaces Login and Sign up: 32px circle with a lime radial gradient.

**Docked composer (Image):**
- **Position:** fixed, 20px above the viewport bottom, centered, `max-width: 1120px`, 16px side margins. `--bg-2` background, 1px `--border-2`, `--r-2xl`, `--shadow-float`, 20px padding.
- **Grid:** two columns. The left column holds two rows; the right column is the Generate button.
  - **Row 1:** a 32px square "+" button (`--bg-3`, `--r-md`), then an auto-growing textarea (15/22 text, `--text-placeholder` placeholder, 1–5 lines).
  - **Row 2:** chips in this order: Model, Aspect, Batch stepper (− 1/4 +), 8px apart.
  - **Generate:** 174×82 desktop (it spans both rows), `--r-xl`, `--lime`, `--lip`. Content is "Generate" (16/600) + sparkle + the struck cost in `--lime-ink` at 50% + the real cost in 16/700.
  - **Disabled** (empty prompt or request in flight): `--lime-disabled`, no lip.
  - **Cost higher than balance:** the label reads "Get more credits" and clicking opens the modal.
- **Mobile (< 640px):** one column. The chips scroll horizontally, and Generate becomes full width and 52px tall.
- **While a generation is in flight** *(ours)*. This runs from the click until the tile resolves, and covers the lazy sign-in too.
  - The **textarea stays editable**, so the user can write the next prompt.
  - **Chips drop to 50% opacity and ignore clicks.** Any open dropdown closes. The settings being used belong to the pending tile, so changing them mid-flight would be misleading.
  - The **"+" button is disabled** the same way.
  - **Generate** uses `--lime-disabled` with no lip. Its label becomes a 16px spinner + "Generating…" (16/600). The cost is hidden.
  - The whole composer border turns 1px `--lime` at 30% and pulses 30% → 60% on a 1.6s loop (static under reduced motion).
  - **One request at a time.** Enter or a click during flight does nothing.
  - **On success or failure** the composer is fully interactive again within 150ms. On failure it also keeps the prompt text.

**Chip + dropdown:**
- **Chip:** 38px tall, 12px horizontal padding, `--chip` fill, 1px `rgb(255 255 255 / .06)` border, `--r-md`. 16px icon + 14/500 white label + optional chevron. Hover: `--bg-5`. Open: 1px `--lime` border at 40%.
- **Dropdown:** a popover above the chip with an 8px gap. `--bg-1`, 1px `--border-3`, `--r-lg`, `--shadow-float`, 6px padding.
  - Rows are 40px tall with `--r-md`.
  - Model rows show a name (14/500), a 12px description in `--text-2`, and the credit cost aligned right.
  - The selected row gets a lime check. Locked rows are 50% opacity with a lock icon.

**Result tiles *(ours)*:**
- **Grid:** masonry-free CSS grid. Columns come from the grid slider (2–6, default 4), with a 6px gap. Each tile keeps its own aspect ratio and uses `--r-lg`. Newest first, pinned above the history.
- **Pending tile:**
  - `--bg-2` with a diagonal shimmer (`linear-gradient(110deg, transparent 30%, rgb(255 255 255 / .05) 50%, transparent 70%)`).
  - Centered: a sparkle icon, an elapsed "0.8s" counter in 12/500 `--text-2`, and one truncated line of the prompt in 12px `--text-3`.
  - It renders as soon as Generate is clicked, before auth or the API responds.
- **Failed tile:** `--bg-2` background, a pink 14px icon, "Generation failed — credits refunded" in 12px, and a Retry text button in lime.
- **Finished tile:** the image, `object-fit: cover`.
  - Hover shows a bottom gradient (`transparent → rgb(0 0 0 / .7)`) with the truncated prompt and 32px icon buttons in `rgb(0 0 0 / .5)` + blur 8px: download, reuse prompt.
  - Click opens a lightbox on `--overlay`.

**Error surfaces *(ours)*:** every server error code maps to exactly one surface.

| Code | Surface | Tile | Credits |
|---|---|---|---|
| `INSUFFICIENT_CREDITS` | Auth modal, out-of-credits variant (Pricing if signed in). No toast | Pending tile removed | Not charged |
| `GLOBAL_CAP` | **Notice bar** in the `pink` tone, sticky until dismissed or reload | Pending tile removed | Not charged |
| `FAL_DISABLED` (503) | **Notice bar** in the `neutral` tone, sticky | Pending tile removed | Not charged |
| `IP_LIMIT` (429) | **Notice bar** in the `neutral` tone, sticky | Pending tile removed | Not charged |
| Provider failure / timeout | **Failed tile** + toast in the `pink` tone, 5s | Failed tile | Refunded |
| Network / unknown | Toast in the `pink` tone, 6s, with a Retry action | Pending tile removed | — |

- **Notice bar:** for states that block generating.
  - Placement: it docks **directly above the composer**, same width (max 1120px), with an 8px gap. On mobile it sits above the full-width Generate area.
  - Size and shape: 48px tall, 16px horizontal padding, `--r-lg`, `--shadow-float`.
  - Content: 16px icon, 14/500 text, an optional right-aligned text link (13/600), and a 16px X.
  - Tones:
    - `pink`: `rgb(238 21 114 / .12)` fill + 1px `rgb(238 21 114 / .4)` border + `--text-1` text, `--pink` icon.
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
  - Content: a 3px left accent bar in the tone color, a 16px icon, 14/500 text, an optional lime text action.
  - Dismissal: auto-dismisses after 5s (6s when it has an action). Hovering pauses the timer, and swiping up or clicking the X dismisses it.
  - Copy for a provider failure: "Generation failed — 2 credits refunded."
- **Accessibility:** notice bars are `role="status"`. Toasts are in an `aria-live="polite"` region. Neither ever steals focus. Only the modal traps focus.

**Fanned photo stack (empty states):**
- **Arrangement:** four photos overlapping about 25%. Rotations are −8°, −3°, 0°, +6°, each lifted −4px. **The third photo is a circle**; the others are rounded squares with `--r-lg`.
- **Sizes:** each photo is about 150px on the Image hero and 52px on Assets and the other small empty states.
- **Styling:** 2px `rgb(255 255 255 / .18)` border, `0 8px 24px rgb(0 0 0 / .5)` shadow.
- **Below the stack:**
  - **Hero:** Display h1 (the second line in lime), then a 16/24 `--text-2` subtitle.
  - **Assets:** 16/600 title, 14px `--text-2` text, and a white "Generate" button (36px tall, `--r-md`, black text).

**Split auth modal:**
- **Shell:** centered, 1120×776 max (on mobile: full screen, image panel hidden). `--bg-1`, `--r-2xl`, `--shadow-modal`, 12px padding, backdrop `--overlay`.
- **Left half:** image carousel, `--r-xl`, full height.
  - Bottom-left overlay: a pill badge (for example "4K Resolution": 11/600, `rgb(40 44 48 / .8)` fill, `--r-sm`), then an h2 in Barlow Condensed 40px white, then a 14px `--text-2` line.
  - Below that, 4 segmented progress bars: 3px tall, 8px apart, `#3d3b3b` track, white fill. A 12/500 label sits under each; the active label is white, the others `--text-2`.
- **Right half:** content centered in a 384px column.
  - Header: lime logo tile (32px, `--r-sm`), Title "Welcome to …", then a 14px `--text-2` subtitle.
  - First button, lime-tinted: `--lime-tint` fill, lime text, gift icon.
  - Provider buttons: 56px tall, `--bg-1` fill, 1px `--border-3`, `--r-lg`, 14/600 white text, 12px apart.
  - An "OR" divider (12px `--text-3`), then "Continue with Email". Signup mode adds a checkbox with 12px terms text.
  - Footer: 1px `--border-1` above an SSO line in 13px `--text-2`.
- **Close button:** 32px circle, `--bg-3`, top-right 16px.
- **Out-of-credits variant *(ours)*:** Title "You're out of free credits". Subtitle "Sign up to get 50 more — your images stay in your gallery".

**Badge pills:**
- **Base:** 18–20px tall, 6px horizontal padding, `--r-sm` (desktop cards use `--r-xs`), Badge type style.
- **Solid:** TOP `--pink`/white · CORE `--blue`/white · TOP (hub) `--purple`/white · NEW, FREE `--lime`/`--lime-ink` · BEST VALUE `--sky`/white.
- **Soft** (in nav): `--lime-badge-bg`/`--lime`, upright (not italic), 10/600.
- **Category chip on tiles:** "Image"/"Video", 24px tall, `--bg-5` fill, `--r-md`, 12/500 `#d6d6d7`, with an icon.

**Mobile bottom tab bar (< 768px):**
- **Bar:** fixed, 64px tall + `env(safe-area-inset-bottom)`. `--tabbar` background, 1px `--border-1` top border.
- **Items:** Home, Explore, **Create**, Assets, Profile. Each is a 22px icon above an 11/500 label. Inactive items are `--text-2`, the active one `--text-1`.
- **Create:** a lime button, 64×44, `--r-lg`, `--lip`, dark sparkle icon, no label, rising 6px above the bar.
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
| Lime button press | `translateY(1px)`, lip 3px → 1px | 80ms |
| Modal open / close | backdrop opacity; panel `scale(.96)→1` + fade | 220ms `--ease-out` / 150ms ease-in |
| Popover / dropdown | fade + `translateY(4px)→0` | 150ms |
| Auth carousel | auto-advance; bar fills linearly; image crossfade | 5s per slide / 400ms |
| Pending shimmer | background-position sweep, infinite | 1.6s linear |
| Result reveal | opacity 0→1 + `blur(8px)→0` + `scale(1.02)→1` | 400ms `--ease-out` |
| Fanned stack mount | from 0° to its final rotation, 60ms stagger; hover adds ±3° to the spread | 500ms `--ease-out` |
| Credits change | number ticks down; at 0, pill pulses pink twice | 300ms / 2 × 400ms |
| Create hub (mobile) | `translateY(100%)→0` | 300ms `--ease-out` |
| Banner dismiss | height 44→0 + fade | 200ms |
| Composer in-flight border | lime border opacity 30% ↔ 60% | 1.6s loop |
| Notice bar in / out | `translateY(8px)→0` + fade / fade | 200ms / 150ms |
| Toast in / out | `translateY(-8px)→0` + fade / fade + `translateY(-4px)` | 200ms / 150ms |

With `prefers-reduced-motion: reduce`, keep only the opacity fades (≤150ms). No transforms, no shimmer (use a static `--bg-2`), no carousel auto-advance.
