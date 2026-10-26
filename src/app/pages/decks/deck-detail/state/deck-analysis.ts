import { GameRules, sumQuantities } from '../../../../core/games/game-rules';
import { MANA_COLORS, ManaColor, parseManaCost } from '../../../../core/games/mtg/mana';
import { DeckCard } from '../../../../core/models/card.model';

/** Mana values with their own column; higher ones join the last ("7+"). */
export const CURVE_MAX = 7;

export interface DeckAnalysis {
  /** Main deck plus commander. */
  deckCount: number;
  sideCount: number;
  maybeCount: number;
  landCount: number;
  /** Average mana value of the nonland cards in the deck; null without any. */
  averageCmc: number | null;
  /** Nonland copies per mana value, 0 to CURVE_MAX+. */
  curve: { cmc: number; count: number }[];
  /** Colored mana symbols across the deck's costs, in WUBRG order (only colors used). */
  colorSymbols: { color: ManaColor; count: number; share: number }[];
  types: { key: string; label: string; count: number }[];
}

export function analyzeDeck(cards: readonly DeckCard[], rules: GameRules): DeckAnalysis {
  const deck = cards.filter((card) => card.board === 'main' || card.board === 'commander');
  const nonland = deck.filter((card) => !rules.isLand(card));
  const nonlandCount = sumQuantities(nonland);

  const curve = Array.from({ length: CURVE_MAX + 1 }, (_, cmc) => ({ cmc, count: 0 }));
  for (const card of nonland) {
    curve[Math.min(Math.floor(card.cmc), CURVE_MAX)].count += card.quantity;
  }

  const symbols = new Map<ManaColor, number>();
  if (rules.hasMana) {
    for (const card of deck) {
      for (const face of parseManaCost(card.manaCost)) {
        for (const symbol of face) {
          for (const color of symbol.colors) {
            symbols.set(color, (symbols.get(color) ?? 0) + card.quantity);
          }
        }
      }
    }
  }
  const totalSymbols = [...symbols.values()].reduce((sum, count) => sum + count, 0);

  const types = new Map<string, { key: string; label: string; count: number; order: number }>();
  for (const card of deck) {
    const info = rules.groupOf(card, 'type');
    const type = types.get(info.key) ?? { ...info, count: 0 };
    type.count += card.quantity;
    types.set(info.key, type);
  }

  return {
    deckCount: sumQuantities(deck),
    sideCount: sumQuantities(cards.filter((card) => card.board === 'side')),
    maybeCount: sumQuantities(cards.filter((card) => card.board === 'maybe')),
    landCount: sumQuantities(deck) - nonlandCount,
    averageCmc:
      nonlandCount > 0
        ? nonland.reduce((sum, card) => sum + card.cmc * card.quantity, 0) / nonlandCount
        : null,
    curve: rules.hasMana ? curve : [],
    colorSymbols: MANA_COLORS.filter((color) => symbols.has(color)).map((color) => ({
      color,
      count: symbols.get(color)!,
      share: symbols.get(color)! / totalSymbols,
    })),
    types: [...types.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ key, label, count }) => ({ key, label, count })),
  };
}
