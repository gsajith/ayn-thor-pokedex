"use client";

import Image from "next/image";
import { CSSProperties, useState } from "react";
import { useGeneration } from "@/lib/generation";
import { ResolvedSpecies, clearOverride, setOverride } from "@/lib/overrides";
import { PokemonType } from "@/lib/pokemonTypes";
import { spriteUrl } from "@/lib/species";
import { toggleType } from "@/lib/typeSelection";
import { bucketize, chartFor } from "@/lib/typeChart";
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
  const generation = useGeneration();

  // Reads the same store as the home screen, so a chart chosen in settings
  // applies here too rather than this view quietly using the default.
  const buckets = bucketize(species.types, chartFor(generation));

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
        {/*
          The bloom is drawn in the species' own dominant sprite colour, which
          is already computed at build time. It grounds the sprite instead of
          leaving it floating on a flat field, and costs no extra data.
        */}
        <div
          className={styles.spriteWrap}
          style={{ "--sprite-accent": species.accent } as CSSProperties}
        >
          <Image
            className={styles.sprite}
            src={spriteUrl(species.id)}
            alt=""
            width={96}
            height={96}
            priority
          />
        </div>
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
