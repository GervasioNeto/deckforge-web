import { DeckCard, PokemonType } from '../../models/card.model';
import { compareNames, compareQuantities, compareText } from '../game-rules';
import { POKEMON_TYPES, isPokemonType } from './energy';

/**
 * What a Pokémon card is, read from the fields the Pokémon TCG API sends
 * (supertype, subtypes, rules). Everything that groups, counts or validates
 * Pokémon cards asks here, so the API's vocabulary lives in one place.
 */

export type PokemonCategory = 'pokemon' | 'trainer' | 'energy';

export const CATEGORY_LABELS: Record<PokemonCategory, string> = {
  pokemon: 'Pokémon',
  trainer: 'Treinadores',
  energy: 'Energias',
};

export type PokemonStage = 'basic' | 'stage1' | 'stage2' | 'other';

export const STAGE_LABELS: Record<PokemonStage, string> = {
  basic: 'Básico',
  stage1: 'Estágio 1',
  stage2: 'Estágio 2',
  other: 'Outras evoluções',
};

export type TrainerKind = 'supporter' | 'item' | 'tool' | 'stadium' | 'other';

export const TRAINER_KIND_LABELS: Record<TrainerKind, string> = {
  supporter: 'Apoiador',
  item: 'Item',
  tool: 'Ferramenta',
  stadium: 'Estádio',
  other: 'Outro Treinador',
};

export type EnergyKind = 'basic' | 'special';

type CardFacts = Pick<DeckCard, 'name' | 'typeLine' | 'supertype' | 'subtypes'>;

const has = (card: Pick<DeckCard, 'subtypes'>, subtype: string) => card.subtypes.includes(subtype);

/** Pokémon, Trainer or Energy; null for anything else (a Magic card). */
export function cardCategory(card: CardFacts): PokemonCategory | null {
  switch (card.supertype) {
    case 'Pokémon':
      return 'pokemon';
    case 'Trainer':
      return 'trainer';
    case 'Energy':
      return 'energy';
  }
  // Without a supertype, the type line ("Trainer — Item") still says it.
  const type = card.typeLine.toLowerCase();
  if (type.startsWith('energy')) return 'energy';
  if (type.startsWith('trainer')) return 'trainer';
  if (type.startsWith('pokémon') || type.startsWith('pokemon')) return 'pokemon';
  return null;
}

/** Basic, Stage 1, Stage 2, or another kind of evolution (VMAX, VSTAR, BREAK...). */
export function pokemonStage(card: DeckCard): PokemonStage | null {
  if (cardCategory(card) !== 'pokemon') return null;
  if (has(card, 'Basic')) return 'basic';
  if (has(card, 'Stage 1')) return 'stage1';
  if (has(card, 'Stage 2')) return 'stage2';
  return 'other';
}

export function trainerKind(card: DeckCard): TrainerKind | null {
  if (cardCategory(card) !== 'trainer') return null;
  // Technical Machines are Pokémon Tools; older Tools were also Items.
  if (card.subtypes.some((subtype) => subtype.startsWith('Pokémon Tool'))) return 'tool';
  if (has(card, 'Technical Machine')) return 'tool';
  if (has(card, 'Supporter')) return 'supporter';
  if (has(card, 'Stadium')) return 'stadium';
  if (has(card, 'Item')) return 'item';
  return 'other';
}

export function energyKind(card: DeckCard): EnergyKind | null {
  if (cardCategory(card) !== 'energy') return null;
  return has(card, 'Basic') || /\bBasic\b/.test(card.typeLine) ? 'basic' : 'special';
}

export const isBasicPokemon = (card: DeckCard) => pokemonStage(card) === 'basic';
export const isBasicEnergy = (card: DeckCard) => energyKind(card) === 'basic';
export const isAceSpec = (card: DeckCard) => has(card, 'ACE SPEC');
export const isRadiant = (card: DeckCard) => has(card, 'Radiant');
export const isPrismStar = (card: DeckCard) => has(card, 'Prism Star') || card.name.includes('◇');

/** The type a card is listed under: a Pokémon's first type, or what a basic Energy provides. */
export function cardType(card: DeckCard): PokemonType | null {
  switch (cardCategory(card)) {
    case 'pokemon':
      return card.types[0] ?? null;
    case 'energy':
      return isBasicEnergy(card) ? basicEnergyType(card.name) : null;
    default:
      return null;
  }
}

/** "Basic Fire Energy" and "Fire Energy" → Fire. */
export function basicEnergyType(name: string): PokemonType | null {
  const type = /\b([A-Z][a-z]+) Energy\b/.exec(name)?.[1];
  return type && isPokemonType(type) ? type : null;
}

const PRIZE_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };

/**
 * Prize cards the opponent takes for knocking this Pokémon out. Rule boxes say
 * it ("Pokémon ex rule: ... your opponent takes 2 Prize cards."); without one, 1.
 */
export function prizeValue(card: DeckCard): number {
  for (const rule of card.rules) {
    const count = /takes (\d+|one|two|three|four) Prize cards?/i.exec(rule)?.[1]?.toLowerCase();
    if (count) return PRIZE_WORDS[count] ?? Number(count);
  }
  return 1;
}

/**
 * The name the rule of four counts by. Two printings are the same card, and so
 * are names that differ only by level ("Gengar LV.X") or the Delta Species mark
 * ("Charizard δ"); other marks (★, ◇, "ex") make a different name.
 */
export function copyName(card: Pick<DeckCard, 'name'>): string {
  return card.name
    .replace(/\s+δ$/u, '')
    .replace(/\s+LV\.\s?(X|\d+)$/i, '')
    .trim();
}

const STAGE_SUBTYPES = new Set(['Basic', 'Stage 1', 'Stage 2']);

/**
 * The type line in Portuguese, for headings: "Pokémon Estágio 2 · ex",
 * "Treinador · Apoiador · ACE SPEC", "Energia Básica".
 */
export function kindLabel(card: DeckCard): string {
  switch (cardCategory(card)) {
    case 'pokemon': {
      const stage = pokemonStage(card)!;
      const extras = card.subtypes.filter((subtype) => !STAGE_SUBTYPES.has(subtype));
      // VMAX, VSTAR, BREAK...: the subtype is the stage.
      if (stage === 'other') return ['Pokémon', ...extras].join(' ');
      return [`Pokémon ${STAGE_LABELS[stage]}`, ...extras].join(' · ');
    }
    case 'trainer': {
      const parts = ['Treinador', TRAINER_KIND_LABELS[trainerKind(card)!]];
      return [...parts, ...(isAceSpec(card) ? ['ACE SPEC'] : [])].join(' · ');
    }
    case 'energy':
      return energyKind(card) === 'basic' ? 'Energia Básica' : 'Energia Especial';
    default:
      return card.typeLine;
  }
}

const RARITY_NAMES: Record<string, string> = {
  Common: 'Comum',
  Uncommon: 'Incomum',
  Rare: 'Rara',
  'Rare Holo': 'Rara Holo',
  'Double Rare': 'Rara Dupla',
  'Ultra Rare': 'Ultra Rara',
  'Illustration Rare': 'Rara Ilustrada',
  'Special Illustration Rare': 'Rara Ilustrada Especial',
  'Hyper Rare': 'Hiper Rara',
  'Rare Secret': 'Rara Secreta',
  'Rare Ultra': 'Ultra Rara',
  'Rare Rainbow': 'Rara Arco-íris',
  'Shiny Rare': 'Rara Brilhante',
  'Shiny Ultra Rare': 'Ultra Rara Brilhante',
  'ACE SPEC Rare': 'Rara ACE SPEC',
  Promo: 'Promo',
};

/** "Rare Holo" → "Rara Holo"; rarities without a translation stay as printed. */
export function rarityName(rarity: string | null): string | null {
  return rarity ? (RARITY_NAMES[rarity] ?? rarity) : null;
}

const STAGE_ORDER: Record<PokemonStage, number> = { basic: 0, stage1: 1, stage2: 2, other: 3 };
const CATEGORY_ORDER: Record<PokemonCategory, number> = { pokemon: 0, trainer: 1, energy: 2 };

/**
 * For each Pokémon name, the first Pokémon of its line among `cards`: Kirlia
 * and Gardevoir ex both lead back to Ralts. A line breaks where a link is
 * missing (Rare Candy decks without the Stage 1).
 */
export function lineRoots(cards: readonly DeckCard[]): Map<string, string> {
  const parents = new Map<string, string | null>();
  for (const card of cards) {
    if (cardCategory(card) === 'pokemon' && !parents.has(card.name)) {
      parents.set(card.name, card.evolvesFrom);
    }
  }

  const roots = new Map<string, string>();
  for (const name of parents.keys()) {
    let root = name;
    const seen = new Set([name]);
    let parent = parents.get(root);
    while (parent && parents.has(parent) && !seen.has(parent)) {
      root = parent;
      seen.add(parent);
      parent = parents.get(root);
    }
    roots.set(name, root);
  }
  return roots;
}

/**
 * The order deck lists are read in: Pokémon by evolution line (biggest line
 * first, each from Basic up), then Trainers and Energy by copies.
 */
export function sortByLine(cards: readonly DeckCard[]): DeckCard[] {
  const roots = lineRoots(cards);
  const lineSize = new Map<string, number>();
  for (const card of cards) {
    const root = roots.get(card.name);
    if (root) lineSize.set(root, (lineSize.get(root) ?? 0) + card.quantity);
  }

  const category = (card: DeckCard) => CATEGORY_ORDER[cardCategory(card) ?? 'energy'];

  return [...cards].sort((a, b) => {
    const byCategory = category(a) - category(b);
    if (byCategory !== 0) return byCategory;

    const rootA = roots.get(a.name);
    const rootB = roots.get(b.name);
    if (!rootA || !rootB) return compareQuantities(a, b);

    if (rootA !== rootB) {
      return lineSize.get(rootB)! - lineSize.get(rootA)! || compareText(rootA, rootB);
    }
    return STAGE_ORDER[pokemonStage(a)!] - STAGE_ORDER[pokemonStage(b)!] || compareNames(a, b);
  });
}

/** Evolution lines with more than one stage, as players write them: "Ralts 3-2-2". */
export function evolutionLines(cards: readonly DeckCard[]): { root: string; counts: number[] }[] {
  const roots = lineRoots(cards);
  const lines = new Map<string, Map<string, number>>();
  for (const card of sortByLine(cards)) {
    const root = roots.get(card.name);
    if (!root) continue;
    const members = lines.get(root) ?? new Map<string, number>();
    members.set(card.name, (members.get(card.name) ?? 0) + card.quantity);
    lines.set(root, members);
  }
  return [...lines]
    .filter(([, members]) => members.size > 1)
    .map(([root, members]) => ({ root, counts: [...members.values()] }));
}

/** Types in the order of the energy symbols, for a stable display. */
export const typeOrder = (type: PokemonType) => POKEMON_TYPES.indexOf(type);
