import { Species } from "@/lib/species";
import { DEFAULT_GENERATION, TYPE_CHARTS, bucketize } from "@/lib/typeChart";
import { EffectivenessBuckets } from "./EffectivenessBuckets";
import { TypeChip } from "./TypeChip";
import styles from "./SpeciesDetail.module.css";

type Props = {
  species: Species;
  onBack: () => void;
};

export function SpeciesDetail({ species, onBack }: Props) {
  const buckets = bucketize(species.types, TYPE_CHARTS[DEFAULT_GENERATION]);

  return (
    <div className={styles.detail}>
      <div className={styles.header}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← Back
        </button>
        <span className={styles.dex}>
          #{String(species.id).padStart(4, "0")}
        </span>
        <h1 className={styles.name}>{species.label}</h1>
        <span className={styles.types}>
          {species.types.map((type) => (
            <TypeChip key={type} type={type} />
          ))}
        </span>
      </div>

      <EffectivenessBuckets buckets={buckets} />
    </div>
  );
}
