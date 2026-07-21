# Species Search and Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Type a name, get a Pokémon, see its types and defensive chart without hand-picking types on the grid.

**Architecture:** A build-time script writes a bundled JSON of every species. Pure search logic lives in `src/lib/` and is unit tested without a DOM. The detail view is client-side view state rather than a route, reusing the existing bucket chart component.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, CSS Modules, Fuse.js, Vitest.

## Global Constraints

- Viewport 537×412 CSS px, landscape, no scrolling in either axis. The on-screen keyboard covers roughly half of it when the search input is focused.
- Bundled species data is **vanilla**, and the maintainer plays ROM hacks that alter typings. This layer is a convenience, never an authority. It must not present vanilla data as definitive. Overrides land in issue #5.
- Sprites are explicitly out of scope; issue #4 owns them.
- The defensive chart must reuse `EffectivenessBuckets`, not reimplement it.
- No Tailwind. CSS Modules only. Conventional Commits.

## Key decisions

**Fetch via type endpoints, not per-species.** `/api/v2/type/{1..18}` returns every Pokémon of that type with a `slot` field (1 = primary, 2 = secondary) and a URL containing the id. Inverting 18 responses yields the full species→types map. This is 18 requests rather than ~1025, which is dramatically faster and far more polite to a free API. Verified against `/type/12`: 156 entries, `slot` present, ids parse from URL.

**Filter to id < 10000.** PokéAPI assigns alternate forms (megas, regional variants, battle forms) ids of 10001+. Base species occupy 1..1025. Alternate forms are excluded: they would triple the list with near-duplicate names and hurt search precision, and a ROM hack's custom forms would not match them anyway.

**Detail is view state, not a route.** A dynamic route with `generateStaticParams` would emit ~1025 static HTML files. That bloats the export and, more importantly, the service worker precache in issue #6. Since the acceptance criteria explicitly require in-app back navigation ("without a browser back button"), a client-side view swap satisfies the requirement while keeping the export to a single page.

## File structure

- Create: `scripts/build-species-data.mjs` — build-time fetch, writes JSON
- Create: `src/data/species.json` — generated, committed
- Create: `src/lib/species.ts` — `Species` type, typed import, display-name helper
- Create: `src/lib/speciesSearch.ts` — Fuse setup, prefix-boosted ranking
- Create: `src/lib/speciesSearch.test.ts`
- Create: `src/components/SearchResults.tsx` + `.module.css`
- Create: `src/components/SpeciesDetail.tsx` + `.module.css`
- Modify: `src/app/page.tsx` — enable search, add view state
- Modify: `src/app/page.module.css`
- Modify: `README.md` — document regenerating the data

---

### Task 1: Build script and species data

**Files:** `scripts/build-species-data.mjs`, `src/data/species.json`, `src/lib/species.ts`

**Produces:** `Species = { id: number; name: string; label: string; types: PokemonType[] }`, `SPECIES: Species[]`.

Script outline: fetch all 18 type endpoints in parallel, invert into a `Map<id, {name, types: [slot, type][]}>`, drop ids ≥ 10000, sort types by slot, sort species by id, write pretty JSON. Idempotent — same input yields byte-identical output, so re-running produces no diff.

`label` is derived from the slug by capitalising hyphen-separated segments. A small exceptions map covers the names where that rule reads wrong (`ho-oh` → `Ho-Oh`, `mr-mime` → `Mr. Mime`, `porygon-z` → `Porygon-Z`, `nidoran-f` → `Nidoran♀`, and similar).

- [ ] **Step 1:** Write the script with an `--out` default of `src/data/species.json`.
- [ ] **Step 2:** Run it; assert ~1025 entries, every entry has 1–2 types, and ids are unique and ascending.
- [ ] **Step 3:** Re-run and confirm `git diff` is empty (idempotence).
- [ ] **Step 4:** Add `src/lib/species.ts` re-exporting the JSON with types.
- [ ] **Step 5:** Commit.

---

### Task 2: Search with prefix boosting

**Files:** `src/lib/speciesSearch.ts`, `src/lib/speciesSearch.test.ts`

**Produces:** `searchSpecies(query: string, limit?: number): Species[]`.

Ranking rule, in order: exact slug match, then prefix match on slug or label (ordered by dex id), then Fuse fuzzy matches with the earlier tiers removed. Fuzziness must only rescue queries that the deterministic tiers miss — a correctly typed query must never be reordered by fuzzy scoring.

Tests: `"char"` returns Charmander, Charmeleon, Charizard with Charmander first; `"pikachu"` puts Pikachu first; `"chrzrd"` still finds Charizard; `"25"` is not treated as a name; empty query returns nothing; results are capped.

- [ ] **Step 1:** Write failing tests.
- [ ] **Step 2:** Run, confirm they fail.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run, confirm pass.
- [ ] **Step 5:** Commit.

---

### Task 3: Results list and detail view

**Files:** `src/components/SearchResults.tsx`, `src/components/SpeciesDetail.tsx`, plus CSS modules

`SearchResults` renders rows of dex number, label, and type chips, each a button. `SpeciesDetail` shows label, `#id`, type chips, a Back button, a note that typings are vanilla and may differ in a ROM hack, and `EffectivenessBuckets` for the species' types.

- [ ] **Step 1:** Build both components.
- [ ] **Step 2:** Commit.

---

### Task 4: Wire into the home screen

**Files:** `src/app/page.tsx`, `src/app/page.module.css`, `README.md`

View state is a discriminated union: `{ kind: "grid" }` or `{ kind: "detail"; species }`. A non-empty query swaps the grid and buckets for the results list; selecting a result opens detail; Back returns to the grid with the query cleared.

- [ ] **Step 1:** Implement, keeping the grid path untouched when the query is empty.
- [ ] **Step 2:** Verify no scrolling at 537×412 in all three views.
- [ ] **Step 3:** Document `npm run build:data` in the README.
- [ ] **Step 4:** Commit.

## Self-Review

Every acceptance criterion maps to a task: fetch and write JSON (1), idempotent and documented (1, 4), prefix-first ranking (2), fuzzy rescue (2), tap to detail (3, 4), detail reuses the bucket component (3), in-app back (3, 4).
