"use client";

import { useMemo, useState } from "react";
import { setGeneration, useGeneration } from "@/lib/generation";
import {
  clearAllOverrides,
  clearOverride,
  useOverrides,
} from "@/lib/overrides";
import { speciesById } from "@/lib/species";
import { THEME_LABELS, THEME_MODES, setTheme, useTheme } from "@/lib/theme";
import { GENERATION_OPTIONS } from "@/lib/typeChart";
import { isMeasured, useViewport } from "@/lib/viewport";
import { TypeChip } from "./TypeChip";
import styles from "./Settings.module.css";

type Props = {
  onBack: () => void;
};

export function Settings({ onBack }: Props) {
  const theme = useTheme();
  const generation = useGeneration();
  const overrides = useOverrides();
  const viewport = useViewport();
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Sorted by dex number so the list is stable across edits — insertion order
  // would reshuffle rows every time a correction was made.
  const rows = useMemo(() => {
    return Object.entries(overrides)
      .map(([key, override]) => {
        const id = Number(key);
        return { id, override, vanilla: speciesById(id) };
      })
      .sort((a, b) => a.id - b.id);
  }, [overrides]);

  const clearAll = () => {
    clearAllOverrides();
    setConfirmingClear(false);
  };

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.title}>Settings</h1>
      </div>

      <div className={styles.body}>
        <section className={styles.section}>
          <h2 className={styles.heading}>Appearance</h2>
          <div className={styles.options} role="radiogroup" aria-label="Theme">
            {THEME_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={theme === mode}
                className={
                  theme === mode
                    ? `${styles.option} ${styles.optionActive}`
                    : styles.option
                }
                onClick={() => setTheme(mode)}
              >
                {THEME_LABELS[mode]}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Type chart</h2>
          <p className={styles.note}>
            Hacks pick their own chart, and the base ROM does not tell you which.
            Odyssey is a FireRed hack with Fairy, so this is an explicit choice.
          </p>
          <div
            className={styles.options}
            role="radiogroup"
            aria-label="Type chart generation"
          >
            {GENERATION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={generation === option.id}
                disabled={!option.available}
                className={
                  generation === option.id
                    ? `${styles.wideOption} ${styles.optionActive}`
                    : styles.wideOption
                }
                onClick={() => setGeneration(option.id)}
              >
                <span className={styles.optionLabel}>
                  {option.label}
                  {option.available ? null : (
                    <span className={styles.pending}>not yet available</span>
                  )}
                </span>
                <span className={styles.optionDetail}>{option.detail}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>
            Type corrections
            {rows.length > 0 ? (
              <span className={styles.count}>{rows.length}</span>
            ) : null}
          </h2>

          {rows.length === 0 ? (
            <p className={styles.note}>
              None yet. Open a Pokémon and tap its types to correct them for the
              hack you are playing.
            </p>
          ) : (
            <>
              <ul className={styles.overrides}>
                {rows.map(({ id, override, vanilla }) => (
                  <li key={id} className={styles.override}>
                    <div className={styles.overrideNaming}>
                      <span className={styles.dex}>
                        #{String(id).padStart(4, "0")}
                      </span>
                      <span className={styles.overrideName}>
                        {vanilla?.label ?? `Unknown #${id}`}
                      </span>
                    </div>
                    <div className={styles.typeRows}>
                      <div className={styles.typeRow}>
                        <span className={styles.typeRowLabel}>now</span>
                        {override.types.map((type) => (
                          <TypeChip key={type} type={type} />
                        ))}
                      </div>
                      <div className={styles.typeRow}>
                        <span className={styles.typeRowLabel}>was</span>
                        {vanilla ? (
                          vanilla.types.map((type) => (
                            <TypeChip key={type} type={type} />
                          ))
                        ) : (
                          <span className={styles.note}>not in this dex</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={styles.revert}
                      onClick={() => clearOverride(id)}
                      aria-label={`Revert ${vanilla?.label ?? `#${id}`} to its original types`}
                    >
                      Revert
                    </button>
                  </li>
                ))}
              </ul>

              {/*
                A two-step inline confirm rather than window.confirm: this runs
                installed as a PWA, where the native dialog is unstyleable and
                its availability is not guaranteed.
              */}
              {confirmingClear ? (
                <div className={styles.confirm}>
                  <span className={styles.confirmText}>
                    Delete all {rows.length} corrections?
                  </span>
                  <button
                    type="button"
                    className={styles.action}
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={clearAll}
                  >
                    Delete all
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => setConfirmingClear(true)}
                >
                  Clear all corrections
                </button>
              )}
            </>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.heading}>Device</h2>
          <dl className={styles.readout}>
            <div className={styles.readoutRow}>
              <dt>Viewport</dt>
              <dd>
                {isMeasured(viewport)
                  ? `${viewport.width} × ${viewport.height} css px`
                  : "measuring…"}
              </dd>
            </div>
            <div className={styles.readoutRow}>
              <dt>Pixel ratio</dt>
              <dd>{isMeasured(viewport) ? `${viewport.dpr}×` : "measuring…"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
