export type GameType = 'mtg' | 'pokemon';
export type DeckVisibility = 'public' | 'private';

export interface Deck {
  id: string;
  name: string;
  game: GameType;
  visibility: DeckVisibility;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeckPayload {
  name: string;
  game: GameType;
  visibility?: DeckVisibility;
}
