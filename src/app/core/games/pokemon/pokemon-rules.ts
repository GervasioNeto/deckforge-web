import { DeckCard, Legality } from '../../models/card.model';
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
import { TYPE_NAMES } from './energy';
import {
  CATEGORY_LABELS,
  PokemonCategory,
  STAGE_LABELS,
  TRAINER_KIND_LABELS,
  cardCategory,
  cardType,
  copyName,
  energyKind,
  isAceSpec,
  isBasicEnergy,
  isBasicPokemon,
  isPrismStar,
  isRadiant,
  pokemonStage,
  sortByLine,
  trainerKind,
  typeOrder,
} from './pokemon-cards';

/**
 * Pokémon TCG deck rules (Play! Pokémon): exactly 60 cards with at least one
 * Basic Pokémon; up to 4 copies of a name, except basic Energy; one ACE SPEC
 * and one Radiant Pokémon per deck; one copy of each Prism Star card.
 */

const DECK_SIZE = 60;
const COPY_LIMIT = 4;

/**
 * Standard is decided by the regulation mark printed on each card: this one
 * and every later letter are legal (2026–27 season, since April 10, 2026,
 * when G rotated out). Move it forward at each yearly rotation. The Pokémon
 * TCG API stopped updating its legalities (it still says G and older cards
 * are legal), so for Standard the mark wins; bans still come from the API.
 */
export const STANDARD_MIN_MARK = 'H';

/** Whether a printing with this regulation mark can be played in Standard. */
export function isStandardMark(mark: string | null | undefined): boolean {
  return !!mark && mark.toUpperCase() >= STANDARD_MIN_MARK;
}

const FORMATS: readonly DeckFormat[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'expanded', label: 'Expanded' },
  { id: 'unlimited', label: 'Unlimited' },
];

/** Basic Energy is legal everywhere, whatever the printing; Standard follows the mark. */
function legality(card: DeckCard, formatId: string): Legality {
  if (isBasicEnergy(card)) return 'legal';
  const fromApi = card.legalities[formatId] ?? 'not_legal';
  if (formatId !== 'standard' || fromApi === 'banned') return fromApi;
  return isStandardMark(card.regulationMark) ? 'legal' : 'not_legal';
}

/** Why a card isn't legal, as specific as the data allows. */
function illegalReason(card: DeckCard, legality: Legality, format: DeckFormat): string {
  if (legality === 'banned') return `Banida no ${format.label}`;
  if (format.id === 'standard') {
    return card.regulationMark
      ? `Marca ${card.regulationMark.toUpperCase()}: fora do Standard`
      : 'Sem marca de regulação: fora do Standard';
  }
  return `Não é legal no ${format.label}`;
}

const CATEGORY_ORDER: Record<PokemonCategory, number> = { pokemon: 0, trainer: 1, energy: 2 };
const OTHER: CardGroupInfo = { key: 'other', label: 'Outras', order: 99 };

function categoryGroup(card: DeckCard): CardGroupInfo {
  const category = cardCategory(card);
  return category
    ? { key: category, label: CATEGORY_LABELS[category], order: CATEGORY_ORDER[category] }
    : OTHER;
}

/** Pokémon by stage, Trainers by kind, Energy basic or special: how players count a list. */
function stageGroup(card: DeckCard): CardGroupInfo {
  const stage = pokemonStage(card);
  if (stage) {
    const order = { basic: 0, stage1: 1, stage2: 2, other: 3 }[stage];
    const label = stage === 'other' ? STAGE_LABELS.other : `Pokémon ${STAGE_LABELS[stage]}`;
    return { key: stage, label, order };
  }
  const kind = trainerKind(card);
  if (kind) {
    const groups = {
      supporter: { label: 'Apoiadores', order: 10 },
      item: { label: 'Itens', order: 11 },
      tool: { label: 'Ferramentas', order: 12 },
      stadium: { label: 'Estádios', order: 13 },
      other: { label: TRAINER_KIND_LABELS.other, order: 14 },
    };
    return { key: kind, ...groups[kind] };
  }
  const energy = energyKind(card);
  if (energy) {
    return energy === 'basic'
      ? { key: 'basic-energy', label: 'Energias Básicas', order: 20 }
      : { key: 'special-energy', label: 'Energias Especiais', order: 21 };
  }
  return OTHER;
}

/** Pokémon by their type; Trainers and Energy keep their own groups. */
function energyGroup(card: DeckCard): CardGroupInfo {
  if (cardCategory(card) !== 'pokemon') {
    const group = categoryGroup(card);
    return { ...group, order: 50 + group.order };
  }
  const type = cardType(card);
  return type
    ? { key: type, label: TYPE_NAMES[type], order: typeOrder(type) }
    : { key: 'no-type', label: 'Sem tipo', order: 20 };
}

function groupOf(card: DeckCard, grouping: GroupingId): CardGroupInfo {
  switch (grouping) {
    case 'type':
      return categoryGroup(card);
    case 'stage':
      return stageGroup(card);
    case 'energy':
      return energyGroup(card);
    // Also the groupings Pokémon doesn't offer (Magic's cost and color).
    default:
      return { key: 'all', label: 'Cartas', order: 0 };
  }
}

function sortCards(cards: readonly DeckCard[], sort: SortId): DeckCard[] {
  switch (sort) {
    case 'name':
      return [...cards].sort(compareNames);
    case 'quantity':
      return [...cards].sort(compareQuantities);
    // Also Magic's cost sort, which Pokémon doesn't offer.
    default:
      return sortByLine(cards);
  }
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

const sum = (cards: readonly DeckCard[]) => cards.reduce((total, card) => total + card.quantity, 0);

function validate(cards: readonly DeckCard[], formatId: string | null): DeckValidation {
  const format = FORMATS.find((candidate) => candidate.id === formatId);
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

  // Pokémon has no sideboard: the deck is the main board (the maybeboard is a shortlist).
  const deck = cards.filter((card) => card.board === 'main');
  const size = sum(deck);

  if (size !== DECK_SIZE) {
    issues.push({
      severity: size > DECK_SIZE ? 'error' : 'warning',
      message: `O deck tem ${plural(size, 'carta', 'cartas')}; o ${format.label} pede exatamente ${DECK_SIZE}.`,
    });
  }

  if (size > 0 && !deck.some(isBasicPokemon)) {
    issues.push({
      severity: 'error',
      message: 'O deck precisa de pelo menos 1 Pokémon Básico para começar a partida.',
    });
  }

  // Copies by name: two printings (or "Gengar" and "Gengar LV.X") are the same card.
  const byName = new Map<string, DeckCard[]>();
  for (const card of deck) {
    if (isBasicEnergy(card)) continue;
    const name = copyName(card);
    byName.set(name, [...(byName.get(name) ?? []), card]);
  }
  let overLimit = 0;
  for (const entries of byName.values()) {
    const limit = isPrismStar(entries[0]) ? 1 : COPY_LIMIT;
    const total = sum(entries);
    if (total > limit) {
      overLimit++;
      const reason =
        limit === 1
          ? 'Prism Star: só 1 cópia com o mesmo nome'
          : `${total} cópias; o máximo é ${limit}`;
      entries.forEach((card) => flag(card, reason));
    }
  }
  if (overLimit > 0) {
    issues.push({
      severity: 'error',
      message: `${plural(overLimit, 'carta passa', 'cartas passam')} do limite de cópias.`,
    });
  }

  // One of each kind per deck, whatever the name.
  const oncePerDeck = [
    { matches: isAceSpec, reason: 'Só 1 ACE SPEC por deck', many: 'cartas ACE SPEC' },
    { matches: isRadiant, reason: 'Só 1 Pokémon Radiante por deck', many: 'Pokémon Radiantes' },
  ];
  for (const { matches, reason, many } of oncePerDeck) {
    const entries = deck.filter(matches);
    const total = sum(entries);
    if (total > 1) {
      entries.forEach((card) => flag(card, reason));
      issues.push({
        severity: 'error',
        message: `O deck tem ${total} ${many}; o limite é 1 por deck.`,
      });
    }
  }

  const illegal = new Set<string>();
  for (const card of deck) {
    const status = legality(card, format.id);
    if (status !== 'legal') {
      flag(card, illegalReason(card, status, format));
      illegal.add(copyName(card));
    }
  }
  if (illegal.size > 0) {
    issues.push({
      severity: 'error',
      message: `${plural(illegal.size, 'carta não é legal', 'cartas não são legais')} no ${format.label}.`,
    });
  }

  issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
  return {
    issues,
    cardIssues: new Map([...cardIssues].map(([id, reasons]) => [id, reasons.join(' · ')])),
  };
}

export const POKEMON_RULES: GameRules = {
  groupings: [
    // "Tipo" in Pokémon is the energy type, so the supertype is the "categoria".
    { id: 'type', label: 'Categoria' },
    { id: 'stage', label: 'Estágio e subtipo' },
    { id: 'energy', label: 'Tipo de energia' },
    { id: 'none', label: 'Sem agrupamento' },
  ],
  sorts: [
    { id: 'line', label: 'Linha evolutiva' },
    { id: 'quantity', label: 'Quantidade' },
    { id: 'name', label: 'Nome' },
  ],
  formats: FORMATS,
  hasMana: false,
  // Pokémon has no sideboard.
  boards: () => ['main', 'maybe'],
  groupOf,
  sortCards,
  legality,
  isLand: () => false,
  validate,
};
