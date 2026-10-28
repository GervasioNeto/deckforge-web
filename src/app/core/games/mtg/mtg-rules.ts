import { Board, CardRarity, DeckCard } from '../../models/card.model';
import {
  CardGroupInfo,
  DeckFormat,
  DeckIssue,
  DeckValidation,
  GameRules,
  GroupingId,
  NO_ISSUES,
  SortId,
  compareNames,
  compareQuantities,
} from '../game-rules';
import { COLOR_NAMES, MANA_COLORS, ManaColor, sortColors } from './mana';

export type MtgCardType =
  | 'creature'
  | 'planeswalker'
  | 'battle'
  | 'instant'
  | 'sorcery'
  | 'artifact'
  | 'enchantment'
  | 'land'
  | 'other';

/** Group order and title for each card type, the way deck lists are usually read. */
export const MTG_TYPE_GROUPS: Record<MtgCardType, { label: string; order: number }> = {
  creature: { label: 'Criaturas', order: 0 },
  planeswalker: { label: 'Planeswalkers', order: 1 },
  battle: { label: 'Batalhas', order: 2 },
  instant: { label: 'Mágicas instantâneas', order: 3 },
  sorcery: { label: 'Feitiços', order: 4 },
  artifact: { label: 'Artefatos', order: 5 },
  enchantment: { label: 'Encantamentos', order: 6 },
  other: { label: 'Outras', order: 7 },
  land: { label: 'Terrenos', order: 8 },
};

/**
 * The type a card is listed under. Only the front face counts on double-faced
 * cards, and lands win over other types: an "Artifact Land" or Dryad Arbor
 * ("Land Creature") is counted as a land, as players do.
 */
export function mtgCardType(typeLine: string): MtgCardType {
  const front = typeLine.split('//')[0];
  const has = (type: string) => new RegExp(`\\b${type}\\b`).test(front);

  if (has('Land')) return 'land';
  if (has('Creature')) return 'creature';
  if (has('Planeswalker')) return 'planeswalker';
  if (has('Battle')) return 'battle';
  if (has('Instant')) return 'instant';
  if (has('Sorcery')) return 'sorcery';
  if (has('Artifact')) return 'artifact';
  if (has('Enchantment')) return 'enchantment';
  return 'other';
}

const RARITY_GROUPS: Partial<Record<string, { label: string; order: number }>> = {
  mythic: { label: 'Míticas', order: 0 },
  rare: { label: 'Raras', order: 1 },
  uncommon: { label: 'Incomuns', order: 2 },
  common: { label: 'Comuns', order: 3 },
  special: { label: 'Especiais', order: 4 },
  bonus: { label: 'Especiais', order: 4 },
} satisfies Record<CardRarity, { label: string; order: number }>;

/** Highest mana value with its own group; anything above joins "7+". */
const CMC_CAP = 7;

const LAND_GROUP: CardGroupInfo = { key: 'land', label: 'Terrenos', order: 100 };

function groupOf(card: DeckCard, grouping: GroupingId): CardGroupInfo {
  const type = mtgCardType(card.typeLine);

  switch (grouping) {
    case 'type': {
      const group = MTG_TYPE_GROUPS[type];
      return { key: type, ...group };
    }
    case 'cmc': {
      if (type === 'land') return LAND_GROUP;
      const cmc = Math.min(Math.floor(card.cmc), CMC_CAP);
      return {
        key: `cmc-${cmc}`,
        label: cmc === CMC_CAP ? `Custo ${CMC_CAP}+` : `Custo ${cmc}`,
        order: cmc,
      };
    }
    case 'color': {
      if (type === 'land') return LAND_GROUP;
      const colors = sortColors(card.colors);
      if (colors.length === 0) return { key: 'colorless', label: 'Incolores', order: 6 };
      if (colors.length > 1) return { key: 'multi', label: 'Multicoloridas', order: 5 };
      const color = colors[0];
      return { key: color, label: COLOR_NAMES[color], order: MANA_COLORS.indexOf(color) };
    }
    case 'rarity': {
      const group = card.rarity ? RARITY_GROUPS[card.rarity] : undefined;
      return group ? { key: group.label, ...group } : { key: 'unknown', label: 'Outras', order: 5 };
    }
    // Also the groupings Magic doesn't offer (Pokémon's stage and energy type).
    default:
      return { key: 'all', label: 'Cartas', order: 0 };
  }
}

const COMPARATORS: Record<SortId, (a: DeckCard, b: DeckCard) => number> = {
  cmc: (a, b) => a.cmc - b.cmc || compareNames(a, b),
  // Not offered: Magic has no evolution lines (the page falls back to the first sort).
  line: (a, b) => a.cmc - b.cmc || compareNames(a, b),
  name: compareNames,
  quantity: compareQuantities,
};

interface MtgFormat extends DeckFormat {
  /** Main deck plus commander. */
  deckSize: { min: number; exact?: boolean };
  /** Null when the format has no sideboard (Commander). */
  sideboardMax: number | null;
  copyLimit: number;
  commander?: boolean;
}

const CONSTRUCTED = { deckSize: { min: 60 }, sideboardMax: 15, copyLimit: 4 };

const MTG_FORMATS: readonly MtgFormat[] = [
  { id: 'standard', label: 'Standard', ...CONSTRUCTED },
  { id: 'pioneer', label: 'Pioneer', ...CONSTRUCTED },
  { id: 'modern', label: 'Modern', ...CONSTRUCTED },
  { id: 'legacy', label: 'Legacy', ...CONSTRUCTED },
  { id: 'vintage', label: 'Vintage', ...CONSTRUCTED },
  { id: 'pauper', label: 'Pauper', ...CONSTRUCTED },
  {
    id: 'commander',
    label: 'Commander',
    deckSize: { min: 100, exact: true },
    sideboardMax: null,
    copyLimit: 1,
    commander: true,
  },
];

/** Basic lands, and cards like Relentless Rats that say so, ignore the copy limit. */
function hasNoCopyLimit(card: DeckCard): boolean {
  return (
    (/\bBasic\b/.test(card.typeLine) && /\bLand\b/.test(card.typeLine)) ||
    /a deck can have any number of cards named/i.test(card.text ?? '')
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function validate(cards: readonly DeckCard[], formatId: string | null): DeckValidation {
  const format = MTG_FORMATS.find((candidate) => candidate.id === formatId);
  if (!format) {
    return NO_ISSUES;
  }

  const issues: DeckIssue[] = [];
  const cardIssues = new Map<string, string[]>();
  const flag = (card: DeckCard, reason: string) => {
    const reasons = cardIssues.get(card.id) ?? [];
    if (!reasons.includes(reason)) {
      cardIssues.set(card.id, [...reasons, reason]);
    }
  };

  const inBoard = (board: Board) => cards.filter((card) => card.board === board);
  const count = (list: DeckCard[]) => list.reduce((sum, card) => sum + card.quantity, 0);
  const deck = cards.filter((card) => card.board === 'main' || card.board === 'commander');
  const deckSize = count(deck);

  // Size
  const { min, exact } = format.deckSize;
  if (exact && deckSize !== min) {
    issues.push({
      severity: deckSize > min ? 'error' : 'warning',
      message: `O deck tem ${plural(deckSize, 'carta', 'cartas')}; o ${format.label} pede exatamente ${min}.`,
    });
  } else if (!exact && deckSize < min) {
    issues.push({
      severity: 'warning',
      message: `O deck tem ${plural(deckSize, 'carta', 'cartas')}; o ${format.label} pede no mínimo ${min}.`,
    });
  }

  if (format.sideboardMax !== null) {
    const sideboard = count(inBoard('side'));
    if (sideboard > format.sideboardMax) {
      issues.push({
        severity: 'error',
        message: `O sideboard tem ${sideboard} cartas; o máximo é ${format.sideboardMax}.`,
      });
    }
  }

  // Copies, counted across every board that's played (by name: two printings are the same card).
  const playable = cards.filter((card) => card.board !== 'maybe');
  const copiesByName = new Map<string, DeckCard[]>();
  for (const card of playable) {
    copiesByName.set(card.name, [...(copiesByName.get(card.name) ?? []), card]);
  }
  let overLimit = 0;
  for (const entries of copiesByName.values()) {
    const sample = entries[0];
    if (hasNoCopyLimit(sample)) continue;
    const restricted = sample.legalities[format.id] === 'restricted';
    const limit = restricted ? 1 : format.copyLimit;
    const total = count(entries);
    if (total > limit) {
      overLimit++;
      const reason = restricted
        ? `Restrita no ${format.label}: máximo 1 cópia`
        : `${total} cópias; o máximo é ${limit}`;
      entries.forEach((card) => flag(card, reason));
    }
  }
  if (overLimit > 0) {
    issues.push({
      severity: 'error',
      message:
        format.copyLimit === 1
          ? `${plural(overLimit, 'carta repetida', 'cartas repetidas')}: o ${format.label} é singleton.`
          : `${plural(overLimit, 'carta passa', 'cartas passam')} do limite de cópias.`,
    });
  }

  // Legality (Scryfall keys `legalities` by the same format ids).
  const illegal = new Set<string>();
  for (const card of playable) {
    const legality = card.legalities[format.id];
    if (legality === 'banned') {
      flag(card, `Banida no ${format.label}`);
      illegal.add(card.name);
    } else if (legality === 'not_legal') {
      flag(card, `Não é legal no ${format.label}`);
      illegal.add(card.name);
    }
  }
  if (illegal.size > 0) {
    issues.push({
      severity: 'error',
      message: `${plural(illegal.size, 'carta não é legal', 'cartas não são legais')} no ${format.label}.`,
    });
  }

  if (format.commander) {
    const commanders = inBoard('commander');
    if (commanders.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'Escolha o comandante: mova uma criatura lendária para a zona de comandante.',
      });
    } else {
      const identity = new Set(commanders.flatMap((card) => card.colorIdentity));
      let outside = 0;
      for (const card of inBoard('main')) {
        if (card.colorIdentity.some((color) => !identity.has(color))) {
          outside++;
          flag(card, 'Fora da identidade de cor do comandante');
        }
      }
      if (outside > 0) {
        issues.push({
          severity: 'error',
          message: `${plural(outside, 'carta está', 'cartas estão')} fora da identidade de cor do comandante.`,
        });
      }
    }
  }

  issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return {
    issues,
    cardIssues: new Map([...cardIssues].map(([id, reasons]) => [id, reasons.join(' · ')])),
  };
}

export const MTG_RULES: GameRules = {
  groupings: [
    { id: 'type', label: 'Tipo' },
    { id: 'cmc', label: 'Custo de mana' },
    { id: 'color', label: 'Cor' },
    { id: 'rarity', label: 'Raridade' },
    { id: 'none', label: 'Sem agrupamento' },
  ],
  sorts: [
    { id: 'cmc', label: 'Custo' },
    { id: 'name', label: 'Nome' },
    { id: 'quantity', label: 'Quantidade' },
  ],
  formats: MTG_FORMATS,
  hasMana: true,
  boards: (format) =>
    format === 'commander' ? ['commander', 'main', 'maybe'] : ['main', 'side', 'maybe'],
  groupOf,
  sortCards: (cards, sort) => [...cards].sort(COMPARATORS[sort]),
  // Scryfall keys `legalities` by the same format ids.
  legality: (card, formatId) => card.legalities[formatId] ?? 'not_legal',
  isLand: (card) => mtgCardType(card.typeLine) === 'land',
  validate,
};

/** Colors of a deck, for the header: the commander's identity, else what the cards cost. */
export function deckColors(cards: readonly DeckCard[]): ManaColor[] {
  const commanders = cards.filter((card) => card.board === 'commander');
  if (commanders.length > 0) {
    return sortColors(commanders.flatMap((card) => card.colorIdentity));
  }
  return sortColors(
    cards.filter((card) => card.board === 'main').flatMap((card) => card.colorIdentity),
  );
}
