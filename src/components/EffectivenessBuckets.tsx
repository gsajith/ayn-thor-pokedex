import { Bucket } from "@/lib/typeChart";
import { TypeChip } from "./TypeChip";
import styles from "./EffectivenessBuckets.module.css";

type Props = { buckets: Bucket[] };

export function EffectivenessBuckets({ buckets }: Props) {
  return (
    <div className={styles.buckets}>
      {buckets.map((bucket) => (
        <div
          key={bucket.multiplier}
          className={styles.row}
          data-empty={bucket.types.length === 0}
        >
          <span className={styles.multiplier}>{bucket.label}</span>
          <div className={styles.types}>
            {bucket.types.map((type) => (
              <TypeChip key={type} type={type} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
