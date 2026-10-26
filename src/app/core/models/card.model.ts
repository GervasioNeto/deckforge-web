/**
 * Where a card sits inside a deck. `maybe` holds cards under consideration
 * (they don't count toward the deck); `commander` is the Commander zone.
 */
export type Board = 'main' | 'side' | 'maybe' | 'commander';

export type Legality = 'legal' | 'not_legal' | 'banned' | 'restricted';

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';

/** One face of a double-faced, split or adventure card. */
export interface CardFace {
  name: string;
  manaCost: string | null;
  typeLine: string;
  text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
}

/** Fields shared by a searched card and a card inside a deck. */
export interface CardDetails {
  name: string;
  /** Scryfall notation, e.g. "{2}{U}{B}"; split cards join faces with " // ". Null for lands. */
  manaCost: string | null;
  cmc: number;
  typeLine: string;
  text: string | null;
  colors: string[];
  colorIdentity: string[];
  rarity: CardRarity | null;
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  imageUrl: string | null;
  /** Back face image of transform/modal double-faced cards. */
  backImageUrl: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  faces: CardFace[] | null;
  /** Keyed by format, e.g. `{ standard: 'legal', modern: 'banned' }`. */
  legalities: Partial<Record<string, Legality>>;
  scryfallUrl: string | null;
}

/**
 * Shape returned by GET /api/cards?name= (a single card, fuzzy-matched on
 * Scryfall). `id` is the external (Scryfall) id.
 */
export interface Card extends CardDetails {
  id: string;
}

/**
 * A card as it appears inside a deck (GET /api/decks/:deckId). One entry per
 * card and board: the same card in the main deck and the sideboard is two
 * entries. `id` is the internal DB id used by /decks/:deckId/cards/:cardId.
 */
export interface DeckCard extends CardDetails {
  id: string;
  externalId: string;
  board: Board;
  quantity: number;
}
