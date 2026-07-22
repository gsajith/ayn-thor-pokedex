import { CSSProperties } from "react";
import {
  PokemonType,
  TYPE_ABBREV,
  TYPE_COLOR,
  TYPE_LABEL,
  readableTextOn,
} from "@/lib/pokemonTypes";
import styles from "./TypeChip.module.css";

type Props = {
  type: PokemonType;
  size?: "grid" | "bucket" | "detail";
  selected?: boolean;
  onClick?: () => void;
};

export function TypeChip({ type, size = "bucket", selected, onClick }: Props) {
  const background = TYPE_COLOR[type];
  /*
   * `backgroundColor`, not the `background` shorthand: the shorthand resets
   * background-image, which would wipe the sheen the stylesheet layers on top.
   * `--chip-color` lets the selected state glow in the chip's own hue rather
   * than a generic accent.
   */
  const style: CSSProperties = {
    backgroundColor: background,
    color: readableTextOn(background),
    "--chip-color": background,
  } as CSSProperties;
  const className = [
    styles.chip,
    size === "grid" ? styles.grid : size === "detail" ? styles.detail : styles.bucket,
    selected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!onClick) {
    return (
      <span className={className} style={style} title={TYPE_LABEL[type]}>
        {TYPE_ABBREV[type]}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={TYPE_LABEL[type]}
    >
      {TYPE_ABBREV[type]}
    </button>
  );
}
