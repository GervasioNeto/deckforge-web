import { Board, DeckCard } from '../models/card.model';

/**
 * What a game (Magic, Pokémon...) teaches the deck pages: how cards group,
 * which formats and boards exist, and what makes a deck legal. Pages only talk
 * to this interface, so a new game plugs in by implementing it (see games.ts).
 */
export interface GameRules {
  readonly groupings: readonly GroupingOption[];
  readonly formats: readonly DeckFormat[];
  /** Whether cards have mana costs/colors (enables pips, curve and color stats). */
  readonly hasMana: boolean;
  /** Boards a deck in `format` uses, in display order. */
  boards(format: string | null): readonly Board[];
  groupOf(card: DeckCard, grouping: GroupingId): CardGroupInfo;
  isLand(card: DeckCard): boolean;
  validate(cards: readonly DeckCard[], format: string | null): DeckValidation;
}

export type GroupingId = 'type' | 'cmc' | 'color' | 'rarity' | 'none';

export interface GroupingOption {
  id: GroupingId;
  label: string;
}

export interface CardGroupInfo {
  key: string;
  label: string;
  /** Groups are shown in ascending order. */
  order: number;
}

export interface DeckFormat {
  id: string;
  label: string;
}

export interface DeckIssue {
  /** `error` breaks the format's rules; `warning` is an unfinished deck (e.g. 58 of 60). */
  severity: 'error' | 'warning';
  message: string;
}

export interface DeckValidation {
  issues: DeckIssue[];
  /** Why a specific card is a problem, keyed by card id (e.g. "Banida no Modern"). */
  cardIssues: ReadonlyMap<string, string>;
}

export const NO_ISSUES: DeckValidation = { issues: [], cardIssues: new Map() };

export const BOARD_LABELS: Record<Board, string> = {
  commander: 'Comandante',
  main: 'Deck principal',
  side: 'Sideboard',
  maybe: 'Maybeboard',
};

/** For tight spots: segmented controls, chips. */
export const BOARD_SHORT_LABELS: Record<Board, string> = {
  commander: 'Comandante',
  main: 'Principal',
  side: 'Side',
  maybe: 'Maybe',
};

/** Boards that make up the playable deck; the maybeboard is only a shortlist. */
export function countsTowardDeck(board: Board): boolean {
  return board !== 'maybe';
}

export function sumQuantities(cards: readonly DeckCard[]): number {
  return cards.reduce((sum, card) => sum + card.quantity, 0);
}
