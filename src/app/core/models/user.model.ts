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

export interface ApiError {
  error: string;
  message: string;
}
