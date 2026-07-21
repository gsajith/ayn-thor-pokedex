# ayn-thor-pokedex

A bottom-screen companion Pokédex for playing Pokémon ROM hacks and fangames on
an [AYN Thor](https://www.ayntec.com/) dual-screen handheld.

**Live: https://ayn-thor-pokedex.vercel.app**

## Why this isn't a normal Pokédex

It targets user-made ROM hacks and Essentials fangames — Pokémon Rejuvenation,
Pokémon Odyssey — rather than official games. Those hacks alter species typings
and rewrite learnsets, but they leave the type chart alone.

So the app inverts the usual design. **Type matchup is the primary input**: read
a Pokémon's types off the game screen, tap them, and get a defensive breakdown
that is correct in any hack. Species search is a convenience layer on top, with
user-editable typings for when a hack has changed one.

Pokémon Odyssey shows why this matters — it is a FireRed (Gen 3) hack that adds
Fairy anyway, so the correct type chart cannot be inferred from the base ROM's
generation and has to be an explicit setting.

See [`SPEC.md`](./SPEC.md) for the full design.

## Target device

The AYN Thor secondary screen measures **537×412 CSS px** in Chrome — landscape,
at a device pixel ratio of roughly 2.3. Roughly 58px of that height is browser
chrome, reclaimed once the app installs as a standalone PWA. Layouts are built
against 412px so they hold either way.

## Development

```bash
npm install
npm run dev        # dev server
npm run build      # static export to out/
npm test           # unit tests
npm run typecheck
npm run lint
```

Built as a static export (`output: 'export'`), deployed to Vercel, with pushes to
`main` deploying automatically.

## Species data

`src/data/species.json` holds the dex number, name and types for all 1025
species. It is generated and **committed**, so a clean checkout needs no network
access to build.

```bash
npm run build:data   # refetch from PokeAPI and rewrite species.json
```

The script reads the 18 `/api/v2/type/{name}` endpoints rather than ~1025
per-species endpoints. Each type endpoint lists every Pokémon of that type with a
`slot` field marking primary vs secondary, so inverting 18 responses reconstructs
the whole map — 18 requests instead of 1025. Alternate forms (megas, regional
variants) carry ids of 10001+ and are excluded.

The script is idempotent: unchanged upstream data produces byte-identical output,
so re-running it leaves no diff. Only re-run it when PokéAPI adds species.

This data is **vanilla**. The hacks this app targets alter typings, which is why
the type grid rather than species lookup is the authoritative path, and why
per-species overrides are planned.

## Stack

Next.js 16 (App Router), React 19, TypeScript, CSS Modules. No Tailwind.

> **Note for agents:** Next 16 has breaking changes relative to older training
> data. Read the relevant guide in `node_modules/next/dist/docs/` before writing
> code. See [`CLAUDE.md`](./CLAUDE.md).
