import { Board, DeckCard, Legality } from '../models/card.model';

/**
 * What a game (Magic, Pokémon...) teaches the deck pages: how cards group and
 * sort, which formats and boards exist, and what makes a deck legal. Pages only
 * talk to this interface, so a new game plugs in by implementing it (see games.ts).
 */
export interface GameRules {
  /** The first one is the default. */
  readonly groupings: readonly GroupingOption[];
  /** The first one is the default. */
  readonly sorts: readonly SortOption[];
  readonly formats: readonly DeckFormat[];
  /** Whether cards have mana costs/colors (enables pips, curve and color stats). */
  readonly hasMana: boolean;
  /** Boards a deck in `format` uses, in display order. */
  boards(format: string | null): readonly Board[];
  groupOf(card: DeckCard, grouping: GroupingId): CardGroupInfo;
  /** The cards of one group, in display order. */
  sortCards(cards: readonly DeckCard[], sort: SortId): DeckCard[];
  /** Whether a card can be played in a format (what validation and the card dialog show). */
  legality(card: DeckCard, formatId: string): Legality;
  isLand(card: DeckCard): boolean;
  validate(cards: readonly DeckCard[], format: string | null): DeckValidation;
}

export type GroupingId = 'type' | 'cmc' | 'color' | 'rarity' | 'stage' | 'energy' | 'none';

export interface GroupingOption {
  id: GroupingId;
  label: string;
}

/** `line` keeps each Pokémon evolution line together (Basic, then what evolves from it). */
export type SortId = 'cmc' | 'line' | 'name' | 'quantity';

export interface SortOption {
  id: SortId;
  label: string;
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/** Alphabetical, ignoring case and accents. */
export const compareText = (a: string, b: string): number => collator.compare(a, b);

export const compareNames = (a: DeckCard, b: DeckCard): number => compareText(a.name, b.name);

/** Most copies first, as deck lists are usually read; ties by name. */
export const compareQuantities = (a: DeckCard, b: DeckCard): number =>
  b.quantity - a.quantity || compareNames(a, b);

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

/** How toasts name a board: "adicionada ao…", "removida do…", "movida para o…". */
export const BOARD_PHRASES: Record<Board, { to: string; from: string; into: string }> = {
  main: { to: 'ao deck principal', from: 'do deck principal', into: 'para o deck principal' },
  side: { to: 'ao sideboard', from: 'do sideboard', into: 'para o sideboard' },
  maybe: { to: 'ao maybeboard', from: 'do maybeboard', into: 'para o maybeboard' },
  commander: {
    to: 'como comandante',
    from: 'da zona de comandante',
    into: 'para a zona de comandante',
  },
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
