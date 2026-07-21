# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**This repo is single-context.**

## Before exploring, read these

- **`CONTEXT.md`** at the repo root
- **`docs/adr/`** — read ADRs that touch the area you're about to work in

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

As of setup, neither `CONTEXT.md` nor `docs/adr/` exists yet. That is expected and not a problem.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-type-chart-is-authoritative-species-data-is-not.md
│   └── 0002-....md
└── src/
```

There is no `CONTEXT-MAP.md` and no per-context `src/<context>/docs/adr/`. If this ever becomes a monorepo with genuinely separate domains, revisit this file.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
