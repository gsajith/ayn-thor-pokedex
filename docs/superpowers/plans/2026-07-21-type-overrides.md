# Persistent Type Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct a Pokémon's typing when a ROM hack has changed it, and have that correction stick.

**Architecture:** A module-level store backed by `localStorage`, exposed to React through `useSyncExternalStore` so every consumer stays in sync without prop drilling. All species reads go through a single `resolveSpecies` seam so no consumer can accidentally render vanilla data.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript, CSS Modules, Vitest.

## Global Constraints

- Viewport 537×412 CSS px landscape. No page scrolling in either axis.
- Static export: `localStorage` does not exist during prerender, so the store must have a server snapshot and must not throw on the server.
- The whole point of this feature is that vanilla data is untrustworthy in a hack. Corrupt stored data must degrade to vanilla, never break the app.
- Reuse the existing type-selection interaction rather than inventing a second one.
- No Tailwind. Conventional Commits.

## Key decisions

**`useSyncExternalStore`, not `useState` + effect.** The override map is external mutable state shared by the detail view and the results list. `useSyncExternalStore` gives a correct server snapshot for the static export and keeps every subscriber consistent after a write, which a per-component `useState` would not.

**One resolution seam.** `resolveSpecies(species, overrides)` returns the effective species plus an `overridden` flag. Every consumer calls it. Acceptance criterion 5 ("search results and any other consumers read through the override layer") is then structural rather than a thing to remember.

**Validate on read, not on write.** Stored JSON is attacker-adjacent only in the sense that it can be stale or hand-edited, but a bad entry must not crash the dex mid-battle. Each entry is validated against the known type list and 1–2 type count; anything invalid is dropped and the rest still load.

**Provenance from the start.** Entries carry `source: "manual" | "imported"` and the store exposes `importOverrides` for bulk writes, so the data-pack feature lands as a caller rather than a migration.

## File structure

- Create: `src/lib/overrides.ts` — store, validation, resolution
- Create: `src/lib/overrides.test.ts`
- Create: `src/lib/useTypeSelection.ts` — selection logic extracted from `page.tsx` so edit mode reuses it
- Modify: `src/components/SpeciesDetail.tsx` + `.module.css` — edit mode, badge, revert
- Modify: `src/components/SearchResults.tsx` — effective types
- Modify: `src/app/page.tsx` — resolve before passing down

---

### Task 1: Override store

**Produces:** `TypeOverride`, `OverrideMap`, `useOverrides()`, `setOverride`, `clearOverride`, `clearAllOverrides`, `importOverrides`, `resolveSpecies`.

Storage key is versioned (`pokedex.type-overrides.v1`) so a future shape change can be detected rather than misparsed.

- [ ] **Step 1:** Write failing tests covering: round-trip persistence, corrupt JSON degrading to empty, a single invalid entry being dropped while valid siblings survive, unknown type strings rejected, three-type entries rejected, `resolveSpecies` returning vanilla when no override exists and corrected types plus `overridden: true` when one does, bulk import recording `source: "imported"`, revert removing a single entry, and clear-all emptying the store.
- [ ] **Step 2:** Run, confirm failures.
- [ ] **Step 3:** Implement with a module-level cache, a subscriber set, and `useSyncExternalStore` with a stable server snapshot.
- [ ] **Step 4:** Run, confirm pass.
- [ ] **Step 5:** Commit.

---

### Task 2: Extract selection logic

**Produces:** `useTypeSelection(initial)` returning `{ selected, toggle, clear, set }` with the existing rules — max two, third tap ignored, tapping a lit chip deselects.

`page.tsx` switches to it with no behaviour change; edit mode uses the same hook, which is what makes the interaction genuinely identical rather than merely similar.

- [ ] **Step 1:** Extract, with tests for the cap and toggle rules.
- [ ] **Step 2:** Repoint `page.tsx`, confirm the grid behaves unchanged.
- [ ] **Step 3:** Commit.

---

### Task 3: Detail page edit mode

Tapping the type chips enters edit mode: the bucket chart is replaced by the 18-type grid seeded with the current effective types, plus Save and Cancel. An overridden species shows an "edited" badge and a Revert control.

- [ ] **Step 1:** Build edit mode and the badge.
- [ ] **Step 2:** Verify at 537×412 that edit mode does not scroll.
- [ ] **Step 3:** Commit.

---

### Task 4: Route every consumer through the seam

`page.tsx` resolves search results and the selected species before rendering, so `SearchResults` chips and the detail chart both reflect corrections.

- [ ] **Step 1:** Wire it.
- [ ] **Step 2:** Verify a correction shows in the results list, the detail chips, and the chart, and survives a reload.
- [ ] **Step 3:** Commit.

## Self-Review

Acceptance criteria map: editable chips using the same interaction (2, 3), persistence across restarts (1), visible badge (3), chart recomputes (3, 4), all consumers read through the layer (1, 4), individual revert (1, 3), bulk write path with provenance (1), corrupt data degrades to vanilla (1).
