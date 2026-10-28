import { PokemonType } from '../../models/card.model';

/**
 * Pokémon's energy types: what the UI calls them, the order every list uses,
 * and how deck lists write them ("{R}" in Pokémon TCG Live, "Fire" elsewhere).
 */

/** The order of the energy symbols on the cards and in the game's own lists. */
export const POKEMON_TYPES: readonly PokemonType[] = [
  'Grass',
  'Fire',
  'Water',
  'Lightning',
  'Psychic',
  'Fighting',
  'Darkness',
  'Metal',
  'Fairy',
  'Dragon',
  'Colorless',
];

/** The names the Brazilian cards print. */
export const TYPE_NAMES: Record<PokemonType, string> = {
  Grass: 'Planta',
  Fire: 'Fogo',
  Water: 'Água',
  Lightning: 'Elétrico',
  Psychic: 'Psíquico',
  Fighting: 'Lutador',
  Darkness: 'Escuridão',
  Metal: 'Metal',
  Fairy: 'Fada',
  Dragon: 'Dragão',
  Colorless: 'Incolor',
};

/** Pokémon TCG Live writes energy as a letter in braces: "Basic {R} Energy". */
export const TYPE_CODES: Record<PokemonType, string> = {
  Grass: 'G',
  Fire: 'R',
  Water: 'W',
  Lightning: 'L',
  Psychic: 'P',
  Fighting: 'F',
  Darkness: 'D',
  Metal: 'M',
  Fairy: 'Y',
  Dragon: 'N',
  Colorless: 'C',
};

export function isPokemonType(value: string): value is PokemonType {
  return (POKEMON_TYPES as readonly string[]).includes(value);
}

/** "R" → "Fire"; null for anything else. */
export function typeFromCode(code: string): PokemonType | null {
  const upper = code.toUpperCase();
  return POKEMON_TYPES.find((type) => TYPE_CODES[type] === upper) ?? null;
}

/** Types in the cards' order, without repeats. */
export function sortTypes(types: Iterable<string>): PokemonType[] {
  const set = new Set(types);
  return POKEMON_TYPES.filter((type) => set.has(type));
}

/** "Fogo, Fogo e Incolor", for an attack cost read aloud. */
export function energyCostLabel(cost: readonly string[]): string {
  const names = cost.map((type) => (isPokemonType(type) ? TYPE_NAMES[type] : type));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
