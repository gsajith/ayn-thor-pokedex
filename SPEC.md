# Pokédex — Design Spec

A bottom-screen companion Pokédex for playing Pokémon ROM hacks and fangames
(Rejuvenation, Odyssey, etc.) on an AYN Thor.

## Context & constraints

- **Device**: AYN Thor secondary screen — 3.92" AMOLED, 1080×1240 physical px.
  **Measured on device (issue #1): 537×412 CSS px in Chrome.** The panel is used
  rotated, so it is landscape — 1240 wide by 1080 tall physically — at a device
  pixel ratio of roughly 2.3.

  An earlier estimate of 360×413 assumed portrait and a higher pixel ratio. It
  was wrong in the width direction by about 49%. Do not reintroduce it.

  The measured 412px height was taken in Chrome with the address bar visible.
  1080 ÷ 2.3 is roughly 470, so about 58px is browser chrome and should return
  once the app installs standalone. **Design against 412px height** so the layout
  holds in both cases, and treat the extra ~58px as headroom rather than budget.
- **Games**: user-made ROM hacks and Essentials fangames, not official titles.
- **Use**: glanced at mid-battle, in a dark room, while looking at the top screen.

## The governing principle

In a ROM hack, the **type chart is reliable** (hacks almost never alter it) but
**species data is not** (typings are sometimes changed, learnsets are rewritten
heavily). Odyssey demonstrates the trap: it's a FireRed/Gen 3 hack that adds
Fairy anyway, so the chart cannot be inferred from the base ROM's generation.

Therefore: **type matchup is the primary input, species lookup is a convenience
layer, and the user can always override species data.**

## Stack

- Next.js (App Router), static export (`output: 'export'`)
- TypeScript, CSS Modules (no Tailwind)
- Serwist for the service worker / offline PWA
- Fuse.js for fuzzy search, with exact-prefix results boosted to the top
- Deployed to Vercel over HTTPS so it installs as a standalone PWA

## Data

A build-time Node script fetches from PokéAPI and writes:

- `data/pokemon.json` — `{ id, name, types[], accent }` for all ~1025 species.
  Roughly 40KB. `accent` is the sprite's dominant colour, **computed at build
  time** so there's no runtime canvas work, no CORS issue, and no colour pop-in.
- `public/sprites/*.png` — `front_default` pixel sprites, ~2MB total. Complete
  coverage with no gaps, and pixel art stays crisp at this screen size.

Service worker precaches the app shell and species JSON; sprites are cached
cache-first as they're viewed.

Type chart is stored keyed by generation with only the **Gen 6+** entry
populated. Adding Gen 2–5 and Gen 1 later is a data change, not a refactor.

## Home screen

Everything visible at once — no scrolling, no collapsing, no modes. Stacked
rather than side-by-side, despite the landscape screen.

```
537 × 412
┌───────────────────────────────┐
│ ⌕ search                  ✕  │  ~44px
├───────────────────────────────┤
│ NOR  FIR  WAT  ELE  GRA  ICE  │
│ FIG [PSN] GRD  FLY  PSY  BUG  │  ~144px   6 cols × 3 rows
│ ROC  GHO  DRA  DAR  STE  FAI  │
├───────────────────────────────┤
│4×                             │
│2× FIR ICE PSY FLY             │
│1× NOR WAT ELE ROC DRA         │  ~224px
│½× GRA FIG PSN                 │
│¼×                             │
│0×                             │
└───────────────────────────────┘
```

Vertical budget at the measured 412px: 44 search + 144 grid + 224 buckets. In
standalone mode the buckets gain the ~58px reclaimed from browser chrome.

- **Grid**: all 18 types, 3–4 letter abbreviations on type-coloured chips,
  6 columns × 3 rows at roughly 89×48px. The extra width over the original
  estimate goes into larger, easier-to-hit chips rather than more columns.
- **Selection**: max 2 types. Selected chips light up in place. A third tap is
  ignored until you deselect. Tap a lit chip to unset; clear-all button by the
  search bar.
- **Buckets**: defensive multipliers in descending order 4× → 0×, neutral in its
  natural position. **Empty buckets stay visible** so bucket positions never
  move and you build muscle memory.
- Works with one type selected (mono-types) as well as two.

## Detail page

Reached by tapping a search result.

- Large sprite, name, dex number
- Types shown as chips — **tappable to edit**
- The same defensive bucket chart as home
- Accent colour from the sprite's precomputed dominant colour
- (Later: level-up moves below the fold)

### Type overrides

Editing a Pokémon's types saves the correction to local storage permanently,
marked with an "edited" badge. This means the user builds an accurate dex for
their current hack simply by playing. A future per-game data pack import writes
into this same override store rather than needing separate machinery.

## Theming

- Accent source: **type colours on the grid**, **sprite dominant colour on the
  detail page**.
- Accent reach: trim only — header, selected-chip glow, dividers — plus a
  **subtle glow along the top or bottom edge**. Background stays neutral so type
  chips keep their contrast, which is the thing being glanced at.
- Three modes: **pure black** (OLED pixels off — saves battery and kills glare in
  peripheral vision), **softer dark**, and **light**.

## Settings

- Theme mode
- Generation / type chart selector (Gen 6+ only for now)
- Manage overrides — review, reset individually, clear all
- Viewport + device pixel ratio readout, to confirm real numbers on the Thor

## Deferred

- **Level-up movesets.** Explicitly a stretch goal. Learnsets are the least
  reliable data in a ROM hack, so this needs data packs to be genuinely useful.
- **Per-game data packs** imported from wikis, writing into the override store.
- **Gen 2–5 and Gen 1 type charts.**
- Recent lookups / pinned team — considered and declined for v1.
