import {
  BOARD_LABELS,
  GameRules,
  GroupingId,
  sumQuantities,
} from '../../../../core/games/game-rules';
import { Board, DeckCard } from '../../../../core/models/card.model';

export type DeckSort = 'cmc' | 'name' | 'quantity';

export const SORT_LABELS: Record<DeckSort, string> = {
  cmc: 'Custo',
  name: 'Nome',
  quantity: 'Quantidade',
};

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

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

const byName = (a: DeckCard, b: DeckCard) => collator.compare(a.name, b.name);

const COMPARATORS: Record<DeckSort, (a: DeckCard, b: DeckCard) => number> = {
  cmc: (a, b) => a.cmc - b.cmc || byName(a, b),
  name: byName,
  quantity: (a, b) => b.quantity - a.quantity || byName(a, b),
};

export function sortCards(cards: readonly DeckCard[], sort: DeckSort): DeckCard[] {
  return [...cards].sort(COMPARATORS[sort]);
}

/**
 * The deck as it's displayed: one section per board (in the game's order), each
 * split into groups (by type, cost...). The main deck is always there, even
 * empty; other boards only when they have cards.
 */
export function buildSections(
  cards: readonly DeckCard[],
  rules: GameRules,
  options: { boards: readonly Board[]; grouping: GroupingId; sort: DeckSort },
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
            cards: sortCards(group.cards, options.sort),
          })),
      };
    })
    .filter((section) => section.board === 'main' || section.count > 0);
}
