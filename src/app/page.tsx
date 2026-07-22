"use client";

import { useCallback, useMemo, useState } from "react";
import { AccentGlow } from "@/components/AccentGlow";
import { EffectivenessBuckets } from "@/components/EffectivenessBuckets";
import { SearchResults } from "@/components/SearchResults";
import { SpeciesDetail } from "@/components/SpeciesDetail";
import { TypeGrid } from "@/components/TypeGrid";
import { resolveSpecies, useOverrides } from "@/lib/overrides";
import { PokemonType, TYPE_COLOR } from "@/lib/pokemonTypes";
import { speciesById } from "@/lib/species";
import { searchSpecies } from "@/lib/speciesSearch";
import { THEME_LABELS, cycleTheme, setTheme, useTheme } from "@/lib/theme";
import { toggleType } from "@/lib/typeSelection";
import { DEFAULT_GENERATION, TYPE_CHARTS, bucketize } from "@/lib/typeChart";
import styles from "./page.module.css";

export default function Home() {
  const [selected, setSelected] = useState<PokemonType[]>([]);
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  const overrides = useOverrides();
  const theme = useTheme();

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

  // Grid accent comes from the selected types, blending across a dual pick.
  const glowColors = useMemo(
    () => selected.map((type) => TYPE_COLOR[type]),
    [selected],
  );

  const searching = query.trim().length > 0;

  // Held as an id, not an object: a resolved species carries overridden types
  // in its `types` field, so storing one would survive a revert.
  const detailBase = detailId === null ? null : speciesById(detailId);
  if (detailBase) {
    const detailSpecies = resolveSpecies(detailBase, overrides);
    return (
      <main className={styles.pageDetail}>
        <AccentGlow colors={[detailSpecies.accent]} />
        <SpeciesDetail
          species={detailSpecies}
          onBack={() => setDetailId(null)}
        />
      </main>
    );
  }

  return (
    <main className={searching ? styles.pageSearch : styles.page}>
      <AccentGlow colors={glowColors} />
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
        <button
          type="button"
          className={styles.theme}
          onClick={() => setTheme(cycleTheme(theme))}
          aria-label={`Theme: ${THEME_LABELS[theme]}. Tap to change.`}
          title={THEME_LABELS[theme]}
        >
          ◐
        </button>
      </div>

      {searching ? (
        <SearchResults
          results={results}
          onSelect={setDetailId}
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
