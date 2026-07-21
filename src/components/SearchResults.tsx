import { ResolvedSpecies } from "@/lib/overrides";
import { Species } from "@/lib/species";
import { TypeChip } from "./TypeChip";
import styles from "./SearchResults.module.css";

type Props = {
  results: ResolvedSpecies[];
  onSelect: (species: Species) => void;
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
            onClick={() => onSelect(species)}
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
