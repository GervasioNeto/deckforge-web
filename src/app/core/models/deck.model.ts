import type { DeckCard } from './card.model';

export type GameType = 'mtg' | 'pokemon';
export type DeckVisibility = 'public' | 'private';

export interface Deck {
  id: string;
  name: string;
  game: GameType;
  visibility: DeckVisibility;
  createdAt?: string;
  updatedAt?: string;
  /** Total cards (sum of quantities). Only sent by GET /api/decks once the backend supports it. */
  cardCount?: number;
}

/** Shape returned by GET /api/decks/:deckId: the deck plus its cards. */
export interface DeckWithCards extends Deck {
  cards: DeckCard[];
}

export interface CreateDeckPayload {
  name: string;
  game: GameType;
  visibility?: DeckVisibility;
}
