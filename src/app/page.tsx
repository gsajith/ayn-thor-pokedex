"use client";

import { useCallback, useMemo, useState } from "react";
import { EffectivenessBuckets } from "@/components/EffectivenessBuckets";
import { SearchResults } from "@/components/SearchResults";
import { SpeciesDetail } from "@/components/SpeciesDetail";
import { TypeGrid } from "@/components/TypeGrid";
import { resolveSpecies, useOverrides } from "@/lib/overrides";
import { PokemonType } from "@/lib/pokemonTypes";
import { speciesById } from "@/lib/species";
import { searchSpecies } from "@/lib/speciesSearch";
import { toggleType } from "@/lib/typeSelection";
import { DEFAULT_GENERATION, TYPE_CHARTS, bucketize } from "@/lib/typeChart";
import styles from "./page.module.css";

export default function Home() {
  const [selected, setSelected] = useState<PokemonType[]>([]);
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  const overrides = useOverrides();

  const toggle = useCallback((type: PokemonType) => {
    setSelected((current) => toggleType(current, type));
  }, []);

  const buckets = useMemo(
    () => bucketize(selected, TYPE_CHARTS[DEFAULT_GENERATION]),
    [selected],
  );

  // Resolving on every render rather than at selection time means a correction
  // saved on the detail page is reflected immediately, with no stale copy.
  const results = useMemo(
    () => searchSpecies(query).map((s) => resolveSpecies(s, overrides)),
    [query, overrides],
  );

  const searching = query.trim().length > 0;

  // Held as an id, not an object: a resolved species carries overridden types
  // in its `types` field, so storing one would survive a revert.
  const detailBase = detailId === null ? null : speciesById(detailId);
  if (detailBase) {
    return (
      <main className={styles.pageDetail}>
        <SpeciesDetail
          species={resolveSpecies(detailBase, overrides)}
          onBack={() => setDetailId(null)}
        />
      </main>
    );
  }

  return (
    <main className={searching ? styles.pageSearch : styles.page}>
      <div className={styles.searchRow}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search Pokémon…"
          aria-label="Search Pokémon"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {searching ? (
          <button
            type="button"
            className={styles.clear}
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            className={styles.clear}
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
          >
            Clear
          </button>
        )}
      </div>

      {searching ? (
        <SearchResults
          results={results}
          onSelect={(species) => setDetailId(species.id)}
        />
      ) : (
        <>
          <TypeGrid selected={selected} onToggle={toggle} />
          <EffectivenessBuckets buckets={buckets} />
        </>
      )}
    </main>
  );
}
