/**
 * The Pokémon TCG API's `imageUrl` is the high-resolution scan (~900 KB), right
 * for one card in a dialog but heavy for a grid of 20. Both of its image hosts
 * serve a small version at a sibling URL; Scryfall's `normal` is already light.
 */
const POKEMONTCG_HIRES = /_hires\.png$/;
const SCRYDEX_LARGE = /^(https:\/\/images\.scrydex\.com\/.+)\/large$/;

/** The light version of a card scan, for grids, stacks and pickers. */
export function thumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (POKEMONTCG_HIRES.test(url)) return url.replace(POKEMONTCG_HIRES, '.png');
  const scrydex = SCRYDEX_LARGE.exec(url);
  if (scrydex) return `${scrydex[1]}/small`;
  return url;
}
