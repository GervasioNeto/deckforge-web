import { PublicDeck } from './deck.model';

export interface AppUser {
  id: string;
  email: string;
}

/** GET /api/users/:userId: anyone's public profile (never the e-mail), with their public decks. */
export interface PublicProfile {
  id: string;
  name: string;
  createdAt: string;
  decks: PublicDeck[];
}

/** One result of GET /api/users/search (never the e-mail). */
export interface UserSearchResult {
  id: string;
  name: string;
  createdAt: string;
  publicDeckCount: number;
}

export interface ApiError {
  error: string;
  message: string;
}
