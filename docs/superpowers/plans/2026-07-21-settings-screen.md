# Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A settings screen gathering theme mode, generation/type-chart selection, override management, and a viewport readout, reachable from the home screen in one action and dismissible in one action.

**Architecture:** Two new persisted stores follow the existing `useSyncExternalStore` + localStorage pattern established by `theme.ts` and `overrides.ts`. The generation store is the only one that changes existing behaviour: `page.tsx` currently hardcodes `DEFAULT_GENERATION`, and after this it reads the persisted choice. The type-chart registry gains an explicit option list carrying an `available` flag, so unavailable charts are declared rather than absent. The screen itself is one client component rendered in place of the home view, entered from a gear button that replaces the interim `◐` theme cycler.

**Tech Stack:** Next.js 16 App Router (static export), React 19, TypeScript strict, CSS Modules, Vitest 4 (node env).

## Global Constraints

- Measured viewport is **537×412 CSS px** in the browser; standalone install returns roughly 58px more. Settings must fit and scroll only within its own content region.
- Touch targets: **44×44px minimum** for primary controls.
- No Tailwind. CSS Modules only.
- Static export (`output: 'export'`) — no server-only APIs, no runtime data fetching.
- Every localStorage read must be total: unparseable storage yields the default, never a throw.
- Storage keys are versioned (`pokedex.<name>.v1`).
- `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` must all pass.

---

## File Structure

- `src/lib/typeChart.ts` — **modify.** Widen `Generation` to three ids, make `TYPE_CHARTS` partial, add `GENERATION_OPTIONS` with availability metadata and `chartFor()`.
- `src/lib/generation.ts` — **create.** Persisted generation store, mirroring `theme.ts`.
- `src/lib/generation.test.ts` — **create.**
- `src/lib/viewport.ts` — **create.** `useViewport()` returning width/height/DPR, resubscribing on resize.
- `src/components/Settings.tsx` — **create.** The screen.
- `src/components/Settings.module.css` — **create.**
- `src/app/page.tsx` — **modify.** Add `settingsOpen` state, swap `◐` for a gear button, read the persisted generation.
- `src/app/page.module.css` — **modify.** Rename `.theme` to `.settings`, drop the interim comment.

---

### Task 1: Generation registry with honest availability

**Files:**
- Modify: `src/lib/typeChart.ts`
- Test: `src/lib/typeChart.test.ts`

**Interfaces:**
- Produces: `type Generation = "gen1" | "gen2to5" | "gen6plus"`, `GENERATION_OPTIONS: readonly GenerationOption[]`, `chartFor(id: Generation): GenerationChart`, `TYPE_CHARTS: Partial<Record<Generation, GenerationChart>>`.

`GenerationOption` shape:

```ts
export interface GenerationOption {
  id: Generation;
  label: string;
  /** What actually differs, so the choice is made on facts not vibes. */
  detail: string;
  /** False means declared-but-not-yet-populated. Renders disabled, not hidden. */
  available: boolean;
}
```

- [ ] **Step 1: Write the failing tests**

```ts
describe("generation options", () => {
  it("declares every generation in the union, available or not", () => {
    expect(GENERATION_OPTIONS.map((o) => o.id)).toEqual([
      "gen1",
      "gen2to5",
      "gen6plus",
    ]);
  });

  it("marks only the populated charts available", () => {
    for (const option of GENERATION_OPTIONS) {
      expect(option.available).toBe(TYPE_CHARTS[option.id] !== undefined);
    }
  });

  it("has at least one available option so the app can always render", () => {
    expect(GENERATION_OPTIONS.some((o) => o.available)).toBe(true);
  });

  it("falls back to the default chart for an unpopulated generation", () => {
    expect(chartFor("gen1")).toBe(TYPE_CHARTS[DEFAULT_GENERATION]);
  });

  it("returns the requested chart when it exists", () => {
    expect(chartFor("gen6plus")?.id).toBe("gen6plus");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/typeChart.test.ts`
Expected: FAIL — `GENERATION_OPTIONS` is not exported.

- [ ] **Step 3: Implement**

Widen the union, make the registry partial, add the option list and `chartFor`. The
`detail` strings must state what differs, since the whole point of the control is that
the correct chart cannot be inferred from the ROM's base generation.

- [ ] **Step 4: Run tests** — `npx vitest run src/lib/typeChart.test.ts`, expect PASS.
- [ ] **Step 5: Commit** — `feat: declare generation options with availability metadata`

---

### Task 2: Persisted generation store

**Files:**
- Create: `src/lib/generation.ts`
- Test: `src/lib/generation.test.ts`

**Interfaces:**
- Consumes: `Generation`, `DEFAULT_GENERATION`, `GENERATION_OPTIONS` from Task 1.
- Produces: `parseGeneration(raw: string | null): Generation`, `getGeneration()`, `setGeneration(id: Generation)`, `useGeneration(): Generation`, `resetGenerationCacheForTests()`, `STORAGE_KEY = "pokedex.generation.v1"`.

- [ ] **Step 1: Write the failing tests**

```ts
it("returns the default for null, junk, and unknown ids", () => {
  expect(parseGeneration(null)).toBe(DEFAULT_GENERATION);
  expect(parseGeneration("")).toBe(DEFAULT_GENERATION);
  expect(parseGeneration("gen9000")).toBe(DEFAULT_GENERATION);
});

it("returns a stored available id", () => {
  expect(parseGeneration("gen6plus")).toBe("gen6plus");
});

it("rejects a declared-but-unavailable id", () => {
  // Storage could hold one from a build where it was populated, or a hand edit.
  // Honouring it would render an empty chart.
  expect(parseGeneration("gen1")).toBe(DEFAULT_GENERATION);
});

it("refuses to persist an unavailable generation", () => {
  setGeneration("gen1");
  expect(getGeneration()).toBe(DEFAULT_GENERATION);
});

it("persists an available generation", () => {
  setGeneration("gen6plus");
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe("gen6plus");
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement**, copying the cache/subscriber/`getServerSnapshot` structure from `theme.ts` verbatim in shape. Validity means *available*, not merely declared.
- [ ] **Step 4: Run tests**, expect PASS.
- [ ] **Step 5: Commit** — `feat: persist the selected generation`

---

### Task 3: Viewport readout hook

**Files:**
- Create: `src/lib/viewport.ts`

**Interfaces:**
- Produces: `useViewport(): { width: number; height: number; dpr: number }`.

Implemented with `useSyncExternalStore` over a `resize` + `orientationchange` subscription.
The snapshot must be a **cached object**, re-created only when a value actually changes —
`useSyncExternalStore` compares snapshots by identity and will loop forever on a fresh
object each call.

Server snapshot returns zeros; the component renders a placeholder until mounted.

- [ ] **Step 1: Implement `src/lib/viewport.ts`.**
- [ ] **Step 2: Typecheck** — `npm run typecheck`, expect clean.
- [ ] **Step 3: Commit** — `feat: add a viewport and DPR readout hook`

No unit test: the module is a thin wrapper over browser globals with no branching logic
of its own, and the test environment is node with no layout engine. It is verified in the
browser during Task 6.

---

### Task 4: Settings screen component

**Files:**
- Create: `src/components/Settings.tsx`, `src/components/Settings.module.css`

**Interfaces:**
- Consumes: `useTheme`/`setTheme`/`THEME_MODES`/`THEME_LABELS`, `useGeneration`/`setGeneration`/`GENERATION_OPTIONS`, `useOverrides`/`clearOverride`/`clearAllOverrides`, `speciesById`, `TYPE_LABEL`, `useViewport`.
- Produces: `<Settings onBack={() => void} />`.

Four sections in a single scroll region under a fixed header carrying the back button:

1. **Appearance** — one radio-style button per `THEME_MODES` entry, current marked with `aria-checked`.
2. **Type chart** — one button per `GENERATION_OPTIONS` entry. Unavailable entries render `disabled` with a "not yet available" note, so the roadmap is visible without being falsely selectable.
3. **Type corrections** — one row per override, sorted by dex id, showing label, the corrected types, the vanilla types it replaced, and a Revert button. Empty state explains where corrections come from. Clear-all uses a two-step inline confirm (never `window.confirm` — it is unstyleable and unreliable in standalone PWA display mode).
4. **Device** — width, height, DPR.

- [ ] **Step 1: Write `Settings.tsx`.**
- [ ] **Step 2: Write `Settings.module.css`.** Header fixed, `.body` gets `overflow-y: auto; min-height: 0`.
- [ ] **Step 3: Typecheck and lint.**
- [ ] **Step 4: Commit** — `feat: add the settings screen`

---

### Task 5: Wire settings into the home screen

**Files:**
- Modify: `src/app/page.tsx`, `src/app/page.module.css`

- [ ] **Step 1:** Add `const [settingsOpen, setSettingsOpen] = useState(false)`; render `<Settings onBack={() => setSettingsOpen(false)} />` in a `styles.pageDetail` main, before the detail branch.
- [ ] **Step 2:** Replace the `◐` cycler with a gear button (`aria-label="Settings"`) that opens the screen. The button occupies the same search-row slot, so the type grid does not move.
- [ ] **Step 3:** Read `useGeneration()` and pass `chartFor(generation)` into `bucketize`, with `generation` in the memo deps.
- [ ] **Step 4:** Rename `.theme` to `.settings` in the CSS module and update the interim comment.
- [ ] **Step 5:** Full self-check — `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- [ ] **Step 6: Commit** — `feat: reach settings from the home screen`

---

### Task 6: Browser verification at the measured viewport

Not a code task — the acceptance criteria are behavioural and this repo has a
history of checks that passed while the behaviour was broken. Verify in a real
browser at **537×412**, and again at **537×470** for the standalone case.

- [ ] Settings opens from home and closes in one tap; the grid is in the same place afterwards.
- [ ] All three theme modes apply live and survive reload.
- [ ] Generation control shows all three options; the two unavailable ones are disabled and labelled.
- [ ] Seed two overrides, confirm both list with correct current and vanilla types, revert one, clear all through the confirm step.
- [ ] Viewport readout matches the actual size and changes on resize.
- [ ] `document.body.scrollHeight <= clientHeight` on the settings screen at both heights — the page itself must not scroll, only the settings body.

---

## Self-Review

**Spec coverage:** all eight acceptance criteria map to a task — reachability and dismissal (5), theme (4/2), generation (1/2/4), override list and revert (4), clear-all confirm (4), viewport readout (3/4), fits the viewport (6).

**Placeholders:** none — every step names the file and the behaviour.

**Type consistency:** `Generation`, `GenerationOption`, and `chartFor` are defined in Task 1 and consumed under those exact names in Tasks 2, 4, and 5. `useViewport`'s return shape is fixed in Task 3 and destructured in Task 4.
