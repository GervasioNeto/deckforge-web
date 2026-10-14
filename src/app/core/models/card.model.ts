/**
 * Shape returned by GET /api/cards?name= (a single card, fuzzy-matched on
 * Scryfall). `id` is the external (Scryfall) id, which is what
 * POST /decks/:deckId/cards expects as `externalId`.
 */
export interface Card {
  id: string;
  name: string;
  manaCost: string | null;
  cmc?: number;
  typeLine?: string;
  text: string | null;
  colors?: string[];
  imageUrl: string | null;
}

/**
 * A card as it appears inside a deck (GET /api/decks/:deckId). `id` is the
 * internal DB id needed for DELETE /decks/:deckId/cards/:cardId.
 */
export interface DeckCard {
  id: string;
  externalId: string;
  name: string;
  imageUrl?: string | null;
  quantity: number;
}
