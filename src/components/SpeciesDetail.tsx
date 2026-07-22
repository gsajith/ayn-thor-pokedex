"use client";

import Image from "next/image";
import { useState } from "react";
import { ResolvedSpecies, clearOverride, setOverride } from "@/lib/overrides";
import { PokemonType } from "@/lib/pokemonTypes";
import { spriteUrl } from "@/lib/species";
import { toggleType } from "@/lib/typeSelection";
import { DEFAULT_GENERATION, TYPE_CHARTS, bucketize } from "@/lib/typeChart";
import { EffectivenessBuckets } from "./EffectivenessBuckets";
import { TypeChip } from "./TypeChip";
import { TypeGrid } from "./TypeGrid";
import styles from "./SpeciesDetail.module.css";

type Props = {
  species: ResolvedSpecies;
  onBack: () => void;
};

export function SpeciesDetail({ species, onBack }: Props) {
  const [draft, setDraft] = useState<PokemonType[] | null>(null);
  const editing = draft !== null;

  const buckets = bucketize(species.types, TYPE_CHARTS[DEFAULT_GENERATION]);

  const save = () => {
    if (draft && draft.length > 0) setOverride(species.id, draft);
    setDraft(null);
  };

  const revert = () => {
    clearOverride(species.id);
    setDraft(null);
  };

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← Back
        </button>
        <Image
          className={styles.sprite}
          src={spriteUrl(species.id)}
          alt=""
          width={96}
          height={96}
          priority
        />
        <div className={styles.naming}>
          <span className={styles.dex}>
            #{String(species.id).padStart(4, "0")}
            {species.overridden ? (
              <span className={styles.badge}>edited</span>
            ) : null}
          </span>
          <h1 className={styles.name}>{species.label}</h1>
        </div>
        <button
          type="button"
          className={styles.typesButton}
          onClick={() => setDraft(editing ? null : [...species.types])}
          aria-label={editing ? "Cancel editing types" : "Edit types"}
        >
          {species.types.map((type) => (
            <TypeChip key={type} type={type} size="detail" />
          ))}
          <span className={styles.editHint} aria-hidden="true">
            {editing ? "✕" : "✎"}
          </span>
        </button>
      </div>

      {editing ? (
        <div className={styles.editor}>
          <TypeGrid
            selected={draft}
            onToggle={(type) => setDraft((d) => toggleType(d ?? [], type))}
          />
          <div className={styles.actions}>
            <span className={styles.hint}>
              {draft.length === 0 ? "Pick one or two types" : null}
            </span>
            {species.overridden ? (
              <button type="button" className={styles.action} onClick={revert}>
                Revert
              </button>
            ) : null}
            <button
              type="button"
              className={styles.action}
              onClick={() => setDraft(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={save}
              disabled={draft.length === 0}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <EffectivenessBuckets buckets={buckets} fill />
      )}
    </div>
  );
}
