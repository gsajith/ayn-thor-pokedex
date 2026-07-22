import { Bucket } from "@/lib/typeChart";
import { TypeChip } from "./TypeChip";
import styles from "./EffectivenessBuckets.module.css";

type Props = {
  buckets: Bucket[];
  /**
   * Stretch rows to fill the available height. The home screen shares its
   * space with the type grid and sizes rows to content; the detail page has
   * spare room, so filling it makes the chart easier to read at a glance.
   */
  fill?: boolean;
};

export function EffectivenessBuckets({ buckets, fill }: Props) {
  return (
    <div className={`${styles.buckets} ${fill ? styles.fill : ""}`}>
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
