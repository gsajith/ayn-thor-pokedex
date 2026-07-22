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

type Severity =
  | "danger"
  | "warn"
  | "flat"
  | "resist"
  | "resist-strong"
  | "immune";

/**
 * Maps a multiplier onto the colour language defined in globals.css.
 *
 * Every bucket gets its own hue. An earlier version pooled ½x and ¼x into one
 * green on the theory that both just mean "this resists" — but they sit
 * adjacent, are the pair most easily confused, and halving versus quartering
 * incoming damage is exactly the kind of thing being checked mid-battle.
 */
function severityOf(multiplier: number): Severity {
  if (multiplier === 0) return "immune";
  if (multiplier > 2) return "danger";
  if (multiplier > 1) return "warn";
  if (multiplier === 1) return "flat";
  if (multiplier >= 0.5) return "resist";
  return "resist-strong";
}

export function EffectivenessBuckets({ buckets, fill }: Props) {
  return (
    <div className={`${styles.buckets} ${fill ? styles.fill : ""}`}>
      {buckets.map((bucket) => (
        <div
          key={bucket.multiplier}
          className={styles.row}
          data-empty={bucket.types.length === 0}
          data-severity={severityOf(bucket.multiplier)}
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
