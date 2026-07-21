# ayn-thor-pokedex

A bottom-screen companion Pokédex for playing Pokémon ROM hacks and fangames on
an AYN Thor. See `SPEC.md` for the design.

## Stack

Next.js 16 (App Router), React 19, TypeScript, CSS Modules. No Tailwind — see
`SPEC.md`. Built as a static export (`output: 'export'`) and deployed to Vercel.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent skills

### Issue tracker

Issues live as GitHub issues in `gsajith/ayn-thor-pokedex`, managed with the `gh`
CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles are used verbatim as GitHub label names. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. See
`docs/agents/domain.md`.
