"use client";

import { useCallback, useMemo, useState } from "react";
import { EffectivenessBuckets } from "@/components/EffectivenessBuckets";
import { TypeGrid } from "@/components/TypeGrid";
import { PokemonType } from "@/lib/pokemonTypes";
import { DEFAULT_GENERATION, TYPE_CHARTS, bucketize } from "@/lib/typeChart";
import styles from "./page.module.css";

const MAX_SELECTED = 2;

export default function Home() {
  const [selected, setSelected] = useState<PokemonType[]>([]);

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

  return (
    <main className={styles.page}>
      <div className={styles.searchRow}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search Pokémon…"
          aria-label="Search Pokémon"
          disabled
        />
        <button
          type="button"
          className={styles.clear}
          onClick={() => setSelected([])}
          disabled={selected.length === 0}
        >
          Clear
        </button>
      </div>

      <TypeGrid selected={selected} onToggle={toggle} />

      <EffectivenessBuckets buckets={buckets} />
    </main>
  );
}
