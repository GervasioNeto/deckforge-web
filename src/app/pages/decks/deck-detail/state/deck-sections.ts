import {
  BOARD_LABELS,
  GameRules,
  GroupingId,
  SortId,
  sumQuantities,
} from '../../../../core/games/game-rules';
import { Board, DeckCard } from '../../../../core/models/card.model';

export interface CardGroup {
  key: string;
  label: string;
  /** Copies in the group (sum of quantities). */
  count: number;
  cards: DeckCard[];
}

export interface BoardSection {
  board: Board;
  label: string;
  count: number;
  groups: CardGroup[];
}

/**
 * The deck as it's displayed: one section per board (in the game's order), each
 * split into groups (by type, cost...) sorted the game's way. The main deck is
 * always there, even empty; other boards only when they have cards.
 */
export function buildSections(
  cards: readonly DeckCard[],
  rules: GameRules,
  options: { boards: readonly Board[]; grouping: GroupingId; sort: SortId },
): BoardSection[] {
  return options.boards
    .map((board) => {
      const inBoard = cards.filter((card) => card.board === board);
      const groups = new Map<string, CardGroup & { order: number }>();

      for (const card of inBoard) {
        const info = rules.groupOf(card, options.grouping);
        const group = groups.get(info.key) ?? { ...info, count: 0, cards: [] };
        group.cards.push(card);
        group.count += card.quantity;
        groups.set(info.key, group);
      }

      return {
        board,
        label: BOARD_LABELS[board],
        count: sumQuantities(inBoard),
        groups: [...groups.values()]
          .sort((a, b) => a.order - b.order)
          .map(({ order: _order, ...group }) => ({
            ...group,
            cards: rules.sortCards(group.cards, options.sort),
          })),
      };
    })
    .filter((section) => section.board === 'main' || section.count > 0);
}
