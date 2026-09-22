### Notes about Higgsfield AI

Here I'm collecting information about the Higgsfield AI (https://higgsfield.ai/) platform what we are going to clone from scratch in 24 hour window.

## Core loop
- Pick tool (Image/Video) -> write prompt -> set model/aspect/quality/batch -> Generate (cost shown on button) -> result -> ends up in Assets
- Guest can build a whole prompt, but Generate opens the signup modal (auth wall at the moment of intent)

## Design language
- Near-black bg, lighter cards, subtle borders
- Neon lime = primary action (Generate, Sign up, CTAs); hot pink = discounts; blue/purple/lime badges
- Bold condensed UPPERCASE headlines, second line often lime
- Fanned/tilted photo stacks in empty states (image page, assets, video explainer)
- Promo layer everywhere: top banner, "30% OFF" nav badge, strikethrough credit prices on Generate

## Image page
- Empty state hero + composer docked at bottom
- Chips: model, aspect (Auto), quality (High), resolution (2K), Auto(?), batch 1/4 stepper
- Generate button shows cost with strikethrough (8.5 -> 6.5)
- Grid size slider top right

## Video page
- Different layout from image: left sidebar form, right side history + how-it-works
- Presets card, references (image/video/audio), 5s / 16:9 / 1080p, cost 80 -> 60

## Auth
- Split modal: auto-advancing showcase carousel left, providers right
- "Business email & get 50 credits", Google / Apple / Microsoft / Email, 18+ terms checkbox on signup
- Auto-generated handle (@generatingdolphin1493)

## Assets
- Sidebar: search, Assets, Favourites, Tools filter (Image/Video/Audio counts), folders
- Empty state with fanned images + Generate CTA

## Mobile
- Bottom tab bar with big center "Create" button -> full-screen Create hub (All/New/Images/Videos/Edit)

## Friction (do better)
- Can't generate at all without signing up -> mine: guest generates immediately
- Desktop nav has ~18 items and overflows ("3D Ju..." cut off) -> mine: short nav + Create hub
- Image and video tools use two different UI patterns -> mine: one composer pattern
- Promo noise competes with the actual tool

## Won't build (and why)
- Genjutsu, Cinema Studio, Effects, Supercomputer, Contests, Community, MCP/API, Audio: separate products, not the core loop
- Profile/social, plan recommender, compare table: low value for a 24h demo