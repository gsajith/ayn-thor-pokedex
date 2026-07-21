import { ResolvedSpecies } from "@/lib/overrides";
import { TypeChip } from "./TypeChip";
import styles from "./SearchResults.module.css";

type Props = {
  results: ResolvedSpecies[];
  /**
   * Deliberately an id, not a species. A ResolvedSpecies carries overridden
   * types in `types` and structurally satisfies Species, so passing the object
   * would let a correction be mistaken for vanilla data — a bug that already
   * bit once, where reverting cleared the badge but left the types corrected.
   */
  onSelect: (id: number) => void;
};

export function SearchResults({ results, onSelect }: Props) {
  if (results.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No Pokémon matched.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {results.map((species) => (
        <li key={species.id}>
          <button
            type="button"
            className={styles.row}
            onClick={() => onSelect(species.id)}
          >
            <span className={styles.dex}>
              #{String(species.id).padStart(4, "0")}
            </span>
            <span className={styles.label}>{species.label}</span>
            {species.overridden ? (
              <span className={styles.edited} title="Edited for your hack">
                edited
              </span>
            ) : null}
            <span className={styles.types}>
              {species.types.map((type) => (
                <TypeChip key={type} type={type} />
              ))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
