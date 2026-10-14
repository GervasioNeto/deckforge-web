import type { DeckCard } from './card.model';

export type GameType = 'mtg' | 'pokemon';
export type DeckVisibility = 'public' | 'private';

export const GAME_LABELS: Record<GameType, string> = {
  mtg: 'Magic',
  pokemon: 'Pokémon',
};

export const VISIBILITY_LABELS: Record<DeckVisibility, string> = {
  public: 'Público',
  private: 'Privado',
};

/** Narrows untrusted input (e.g. a URL query param) to a game the API accepts. */
export function isGameType(value: unknown): value is GameType {
  return typeof value === 'string' && Object.hasOwn(GAME_LABELS, value);
}

export interface Deck {
  id: string;
  name: string;
  game: GameType;
  visibility: DeckVisibility;
  createdAt?: string;
  updatedAt?: string;
  /** Total cards (sum of quantities). Only sent by GET /api/decks once the backend supports it. */
  cardCount?: number;
  /** Image for the deck's cover. Only sent by GET /api/decks once the backend supports it. */
  coverImageUrl?: string | null;
}

/** Shape returned by GET /api/decks/:deckId: the deck plus its cards. */
export interface DeckWithCards extends Deck {
  cards: DeckCard[];
}

/** The only author fields the public endpoints expose (never the e-mail). */
export interface DeckAuthor {
  id: string;
  name: string;
}

/** Shape returned by GET /api/decks/public: someone's public deck, without its cards. */
export interface PublicDeck extends Deck {
  user: DeckAuthor;
}

export interface CreateDeckPayload {
  name: string;
  game: GameType;
  visibility?: DeckVisibility;
}
