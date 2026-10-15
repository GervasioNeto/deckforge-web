const NORMAL_PREFIX = 'https://cards.scryfall.io/normal/';

/** Scryfall serves just the artwork at the same path with `art_crop` instead of `normal`. */
export function toArtCrop(url: string): string {
  return url.startsWith(NORMAL_PREFIX) ? url.replace('/normal/', '/art_crop/') : url;
}

/** The art crop failed: back to the full card, or null when there's nothing else to try. */
export function artCropFallback(url: string | null): string | null {
  const fullCard = url?.replace('/art_crop/', '/normal/') ?? null;
  return fullCard !== url ? fullCard : null;
}
