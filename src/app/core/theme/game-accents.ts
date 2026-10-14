import { GameType } from '../models/deck.model';

export interface GameAccent {
  /** Solid fill, e.g. a color dot or emblem. */
  fill: string;
  text: string;
  /** Tinted pill: soft background plus accent text. */
  badge: string;
  /** Starting stop of a gradient; pair with a `bg-linear-*` or `bg-radial-*` utility. */
  glowFrom: string;
}

/**
 * Each game keeps one accent across the app: Magic is purple, Pokémon is cyan.
 * Full class names only, so Tailwind's scanner finds them in this file.
 */
export const GAME_ACCENTS: Record<GameType, GameAccent> = {
  mtg: {
    fill: 'bg-purple',
    text: 'text-purple',
    badge: 'bg-purple/15 text-purple',
    glowFrom: 'from-purple/25',
  },
  pokemon: {
    fill: 'bg-cyan',
    text: 'text-cyan',
    badge: 'bg-cyan/15 text-cyan',
    glowFrom: 'from-cyan/25',
  },
};
