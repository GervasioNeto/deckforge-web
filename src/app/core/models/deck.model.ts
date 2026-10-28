import { Board, DeckCard, withCardDefaults } from './card.model';

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
  /** Format id for the deck's game (see core/games); null means no format (casual). */
  format?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Main deck plus commander (sum of quantities); sideboard and maybeboard don't count. */
  cardCount?: number;
  /** Image for the deck's cover: the chosen card, the commander or the card with most copies. */
  coverImageUrl?: string | null;
}

/** The only author fields the public endpoints expose (never the e-mail). */
export interface DeckAuthor {
  id: string;
  name: string;
}

/** Shape returned by GET /api/decks/:deckId: the deck plus its cards. */
export interface DeckWithCards extends Deck {
  format: string | null;
  description: string | null;
  coverCardId: string | null;
  /** False when someone else's public deck is being viewed. */
  isOwner: boolean;
  author: DeckAuthor | null;
  cards: DeckCard[];
}

/** The deck with every card completed with the other game's fields (see `withCardDefaults`). */
export function withDeckDefaults(deck: DeckWithCards): DeckWithCards {
  return { ...deck, cards: deck.cards.map(withCardDefaults) };
}

/** Shape returned by GET /api/decks/public: someone's public deck, without its cards. */
export interface PublicDeck extends Deck {
  user: DeckAuthor;
}

export interface CreateDeckPayload {
  name: string;
  game: GameType;
  visibility?: DeckVisibility;
  format?: string | null;
}

/** PATCH /api/decks/:deckId: only the fields sent change. */
export interface UpdateDeckPayload {
  name?: string;
  visibility?: DeckVisibility;
  format?: string | null;
  description?: string | null;
  coverCardId?: string | null;
}

/** A card to add: by external id (a searched card or a picked printing) or straight by name. */
export type AddCardPayload = ({ externalId: string } | { name: string }) & {
  quantity?: number;
  board?: Board;
};

export interface ImportEntry {
  name: string;
  quantity: number;
  board: Board;
}

export interface ImportResult {
  deck: DeckWithCards;
  /** Copies added (sum of quantities of the recognized lines). */
  imported: number;
  /** Names the API couldn't match to a card. */
  notFound: string[];
}
