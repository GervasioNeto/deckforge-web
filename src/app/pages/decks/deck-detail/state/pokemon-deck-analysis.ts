import { sumQuantities } from '../../../../core/games/game-rules';
import { TYPE_NAMES, sortTypes } from '../../../../core/games/pokemon/energy';
import {
  CATEGORY_LABELS,
  PokemonCategory,
  PokemonStage,
  STAGE_LABELS,
  TRAINER_KIND_LABELS,
  TrainerKind,
  basicEnergyType,
  cardCategory,
  cardType,
  energyKind,
  evolutionLines,
  isAceSpec,
  isBasicPokemon,
  pokemonStage,
  prizeValue,
  trainerKind,
} from '../../../../core/games/pokemon/pokemon-cards';
import { DeckCard, PokemonType } from '../../../../core/models/card.model';
import { chanceOfNone, choose } from '../../../../core/utils/probability';

export const OPENING_HAND = 7;
export const PRIZE_CARDS = 6;

export interface CountRow<K extends string = string> {
  key: K;
  label: string;
  count: number;
}

export interface PokemonDeckAnalysis {
  /** Main deck (Pokémon has no sideboard). */
  deckCount: number;
  maybeCount: number;
  /** Pokémon, Trainers and Energy, always all three. */
  categories: CountRow<PokemonCategory>[];
  /** Pokémon copies per stage (only stages in use). */
  stages: CountRow<PokemonStage>[];
  /** Pokémon copies per type (their first type), in the energy symbols' order. */
  types: { type: PokemonType; label: string; count: number; share: number }[];
  /** Trainer copies per kind (only kinds in use). */
  trainers: CountRow<TrainerKind>[];
  aceSpecCount: number;
  /** Basic Energy per type, then Special Energy. */
  energies: (CountRow & { type: PokemonType | null })[];
  basicCount: number;
  /** Copies of Pokémon that give up 2 or more Prize cards (ex, V, VMAX...). */
  multiPrizeCount: number;
  /** Lines with more than one stage, e.g. Ralts 3-2-2. */
  lines: { root: string; counts: number[] }[];
  /** Chance the opening 7 has no Basic Pokémon (a mulligan); null with no Basic or under 7 cards. */
  mulliganChance: number | null;
  /**
   * Chance of a Supporter among the first 8 cards (the kept hand plus the first
   * draw); null when it can't be worked out (no Basic, under 8 cards).
   */
  supporterChance: number | null;
}

const CATEGORIES: PokemonCategory[] = ['pokemon', 'trainer', 'energy'];
const STAGES: PokemonStage[] = ['basic', 'stage1', 'stage2', 'other'];
const TRAINER_KINDS: TrainerKind[] = ['supporter', 'item', 'tool', 'stadium', 'other'];

function countBy<K extends string>(
  cards: readonly DeckCard[],
  keyOf: (card: DeckCard) => K | null,
): Map<K, number> {
  const counts = new Map<K, number>();
  for (const card of cards) {
    const key = keyOf(card);
    if (key) counts.set(key, (counts.get(key) ?? 0) + card.quantity);
  }
  return counts;
}

function rows<K extends string>(
  order: readonly K[],
  counts: Map<K, number>,
  labels: Record<K, string>,
): CountRow<K>[] {
  return order
    .filter((key) => counts.has(key))
    .map((key) => ({ key, label: labels[key], count: counts.get(key)! }));
}

/**
 * Chance of at least one of `targets` among the first 8 cards, given the
 * opening 7 had a Basic (the hand players actually keep, after mulligans).
 * Targets must not be Basic Pokémon (e.g. Supporters).
 */
export function chanceByFirstDraw(size: number, basics: number, targets: number): number | null {
  if (size < OPENING_HAND + 1 || basics === 0) return null;
  if (targets === 0) return 0;

  const keep = 1 - chanceOfNone(size, basics, OPENING_HAND);
  // No target in the 7 but at least one Basic...
  const noTargetKept =
    (choose(size - targets, OPENING_HAND) - choose(size - targets - basics, OPENING_HAND)) /
    choose(size, OPENING_HAND);
  // ...and the first draw isn't one either.
  const rest = size - OPENING_HAND;
  const missDraw = (rest - targets) / rest;
  return 1 - (noTargetKept * missDraw) / keep;
}

export function analyzePokemonDeck(cards: readonly DeckCard[]): PokemonDeckAnalysis {
  const deck = cards.filter((card) => card.board === 'main');
  const deckCount = sumQuantities(deck);
  const pokemon = deck.filter((card) => cardCategory(card) === 'pokemon');

  const categories = countBy(deck, cardCategory);

  const types = countBy(pokemon, cardType);
  const typedTotal = [...types.values()].reduce((total, count) => total + count, 0);

  const energies = deck.filter((card) => cardCategory(card) === 'energy');
  const basicEnergy = countBy(energies, (card) =>
    energyKind(card) === 'basic' ? basicEnergyType(card.name) : null,
  );
  const specialEnergy = sumQuantities(energies.filter((card) => energyKind(card) === 'special'));

  const basicCount = sumQuantities(deck.filter(isBasicPokemon));
  const supporters = sumQuantities(deck.filter((card) => trainerKind(card) === 'supporter'));

  return {
    deckCount,
    maybeCount: sumQuantities(cards.filter((card) => card.board === 'maybe')),
    categories: CATEGORIES.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      count: categories.get(key) ?? 0,
    })),
    stages: rows(STAGES, countBy(pokemon, pokemonStage), STAGE_LABELS),
    types: sortTypes(types.keys()).map((type) => ({
      type,
      label: TYPE_NAMES[type],
      count: types.get(type)!,
      share: types.get(type)! / typedTotal,
    })),
    trainers: rows(TRAINER_KINDS, countBy(deck, trainerKind), TRAINER_KIND_LABELS),
    aceSpecCount: sumQuantities(deck.filter(isAceSpec)),
    energies: [
      ...sortTypes(basicEnergy.keys()).map((type) => ({
        key: type,
        label: TYPE_NAMES[type],
        type,
        count: basicEnergy.get(type)!,
      })),
      ...(specialEnergy > 0
        ? [{ key: 'special', label: 'Especiais', type: null, count: specialEnergy }]
        : []),
    ],
    basicCount,
    multiPrizeCount: sumQuantities(pokemon.filter((card) => prizeValue(card) >= 2)),
    lines: evolutionLines(pokemon),
    mulliganChance:
      deckCount >= OPENING_HAND && basicCount > 0
        ? chanceOfNone(deckCount, basicCount, OPENING_HAND)
        : null,
    supporterChance: chanceByFirstDraw(deckCount, basicCount, supporters),
  };
}

/** Chance that every copy of a card ends up among the 6 Prize cards. */
export function chanceAllPrized(deckCount: number, copies: number): number | null {
  if (copies < 1 || copies > PRIZE_CARDS || deckCount < PRIZE_CARDS) return null;
  return choose(deckCount - copies, PRIZE_CARDS - copies) / choose(deckCount, PRIZE_CARDS);
}
