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
  const style: CSSProperties = {
    background,
    color: readableTextOn(background),
  };
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
