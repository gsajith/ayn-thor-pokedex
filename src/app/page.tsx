"use client";

import { useCallback, useMemo, useState } from "react";
import { EffectivenessBuckets } from "@/components/EffectivenessBuckets";
import { SearchResults } from "@/components/SearchResults";
import { SpeciesDetail } from "@/components/SpeciesDetail";
import { TypeGrid } from "@/components/TypeGrid";
import { PokemonType } from "@/lib/pokemonTypes";
import { Species } from "@/lib/species";
import { searchSpecies } from "@/lib/speciesSearch";
import { DEFAULT_GENERATION, TYPE_CHARTS, bucketize } from "@/lib/typeChart";
import styles from "./page.module.css";

const MAX_SELECTED = 2;

export default function Home() {
  const [selected, setSelected] = useState<PokemonType[]>([]);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Species | null>(null);

  const toggle = useCallback((type: PokemonType) => {
    setSelected((current) => {
      if (current.includes(type)) return current.filter((t) => t !== type);
      // A third tap is ignored rather than replacing an existing pick.
      if (current.length >= MAX_SELECTED) return current;
      return [...current, type];
    });
  }, []);

  const buckets = useMemo(
    () => bucketize(selected, TYPE_CHARTS[DEFAULT_GENERATION]),
    [selected],
  );

  const results = useMemo(() => searchSpecies(query), [query]);

  const searching = query.trim().length > 0;

  // Back returns to the results list rather than all the way home, so a
  // mistaken tap costs one press instead of retyping on the covered keyboard.
  if (detail) {
    return (
      <main className={styles.pageDetail}>
        <SpeciesDetail species={detail} onBack={() => setDetail(null)} />
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
        <SearchResults results={results} onSelect={setDetail} />
      ) : (
        <>
          <TypeGrid selected={selected} onToggle={toggle} />
          <EffectivenessBuckets buckets={buckets} />
        </>
      )}
    </main>
  );
}
