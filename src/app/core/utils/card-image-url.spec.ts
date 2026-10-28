import { thumbnailUrl } from './card-image-url';

describe('thumbnailUrl', () => {
  it('swaps the Pokémon TCG API high-resolution scans for the small ones', () => {
    expect(thumbnailUrl('https://images.pokemontcg.io/base1/4_hires.png')).toBe(
      'https://images.pokemontcg.io/base1/4.png',
    );
    expect(thumbnailUrl('https://images.scrydex.com/pokemon/me55c-4/large')).toBe(
      'https://images.scrydex.com/pokemon/me55c-4/small',
    );
  });

  it('leaves Scryfall scans, which are already light, as they are', () => {
    const scryfall = 'https://cards.scryfall.io/normal/front/b/b/bba5ea18.jpg?1792156428';
    expect(thumbnailUrl(scryfall)).toBe(scryfall);
    expect(thumbnailUrl(null)).toBeNull();
  });
});
