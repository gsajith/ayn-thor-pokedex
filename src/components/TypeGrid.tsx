import { PokemonType, TYPE_ORDER } from "@/lib/pokemonTypes";
import { TypeChip } from "./TypeChip";
import styles from "./TypeGrid.module.css";

type Props = {
  selected: readonly PokemonType[];
  onToggle: (type: PokemonType) => void;
};

export function TypeGrid({ selected, onToggle }: Props) {
  return (
    <div className={styles.grid} role="group" aria-label="Defending types">
      {TYPE_ORDER.map((type) => (
        <TypeChip
          key={type}
          type={type}
          size="grid"
          selected={selected.includes(type)}
          onClick={() => onToggle(type)}
        />
      ))}
    </div>
  );
}
