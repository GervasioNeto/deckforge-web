import { GameType } from '../models/deck.model';
import { GameRules } from './game-rules';
import { MTG_RULES } from './mtg/mtg-rules';
import { POKEMON_RULES } from './pokemon/pokemon-rules';

export const GAME_RULES: Record<GameType, GameRules> = {
  mtg: MTG_RULES,
  pokemon: POKEMON_RULES,
};

/** Label for a deck's format, e.g. "Standard"; "Casual" when it has none. */
export function formatLabel(game: GameType, format: string | null | undefined): string {
  return GAME_RULES[game].formats.find((candidate) => candidate.id === format)?.label ?? 'Casual';
}
