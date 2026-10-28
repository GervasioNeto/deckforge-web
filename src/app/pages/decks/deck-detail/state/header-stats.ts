import { DeckAnalysis } from './deck-analysis';
import { PokemonDeckAnalysis } from './pokemon-deck-analysis';

/** One cell of the numbers row under the deck header. */
export interface HeaderStat {
  label: string;
  value: string;
  /** Smaller text after the value, e.g. "+ 15 side". */
  detail?: string | null;
  /** Tooltip explaining the number. */
  title?: string | null;
}

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/** Cards, average mana value and lands. */
export function mtgHeaderStats(analysis: DeckAnalysis): HeaderStat[] {
  const { deckCount, sideCount, landCount, averageCmc } = analysis;
  return [
    {
      label: 'Cartas',
      value: String(deckCount),
      detail: sideCount > 0 ? `+ ${sideCount} side` : null,
    },
    {
      label: 'Custo médio',
      value: averageCmc === null ? '—' : decimal.format(averageCmc),
      title: 'Média do valor de mana, sem terrenos',
    },
    {
      label: 'Terrenos',
      value: String(landCount),
      detail: deckCount > 0 ? `${percent.format(landCount / deckCount)} do deck` : null,
    },
  ];
}

/** Cards, then the Pokémon/Trainer/Energy split, the way Pokémon lists are headed. */
export function pokemonHeaderStats(analysis: PokemonDeckAnalysis): HeaderStat[] {
  const { deckCount, categories } = analysis;
  return [
    { label: 'Cartas', value: String(deckCount) },
    ...categories.map((category) => ({
      label: category.label,
      value: String(category.count),
      title: deckCount > 0 ? `${percent.format(category.count / deckCount)} do deck` : null,
    })),
  ];
}
