import { PokemonType } from "./pokemonTypes";

export const MAX_SELECTED_TYPES = 2;

/**
 * The one place the selection rules live, so the home grid and the detail
 * page's edit mode behave identically rather than merely similarly.
 *
 * Tapping a selected type removes it. A third tap is ignored rather than
 * evicting an earlier pick, which would make a mis-tap silently destructive.
 */
export function toggleType(
  current: readonly PokemonType[],
  type: PokemonType,
): PokemonType[] {
  if (current.includes(type)) return current.filter((t) => t !== type);
  if (current.length >= MAX_SELECTED_TYPES) return [...current];
  return [...current, type];
}
