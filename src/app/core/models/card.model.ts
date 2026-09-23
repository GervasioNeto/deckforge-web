import { GameType } from './deck.model';

/**
 * Shape returned by GET /api/cards?name=. Not fully documented by the
 * backend yet, so extra fields are tolerated.
 */
export interface Card {
  id: string;
  name: string;
  imageUrl?: string;
  game?: GameType;
  [key: string]: unknown;
}

/**
 * A card as it appears inside a deck. `cardId` is the internal DB id
 * needed for DELETE /decks/:deckId/cards/:cardId — the backend has no
 * route today that returns it from a plain card search.
 */
export interface DeckCard {
  cardId: string;
  externalId: string;
  name: string;
  imageUrl?: string;
  quantity?: number;
}
