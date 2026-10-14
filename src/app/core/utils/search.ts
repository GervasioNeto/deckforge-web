/**
 * Lowercased and without accents, so "dragao" finds "Dragão" and "pokemon" finds "Pokémon".
 * Apply to both the search term and the text being searched.
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
