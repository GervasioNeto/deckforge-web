import { Component, computed, input } from '@angular/core';
import { EnergySymbol } from '../../../../../shared/energy-symbol/energy-symbol';
import { PokemonDeckAnalysis } from '../../state/pokemon-deck-analysis';

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/** The three category segments: one hue, stepped down, so the bar reads as one series. */
const CATEGORY_SHADES = ['bg-cyan', 'bg-cyan/55', 'bg-cyan/25'];

/**
 * What Pokémon players check in a list, in place of Magic's curve and colors:
 * the Pokémon/Trainer/Energy split, stages and evolution lines, types and
 * Energy, Trainer kinds, and how consistently the deck opens.
 */
@Component({
  selector: 'app-pokemon-deck-stats',
  imports: [EnergySymbol],
  templateUrl: './pokemon-deck-stats.html',
})
export class PokemonDeckStats {
  readonly analysis = input.required<PokemonDeckAnalysis>();

  protected readonly categories = computed(() => {
    const { categories, deckCount } = this.analysis();
    return categories.map((category, index) => ({
      ...category,
      shade: CATEGORY_SHADES[index],
      share: deckCount > 0 ? category.count / deckCount : 0,
      shareLabel: deckCount > 0 ? percent.format(category.count / deckCount) : '0%',
    }));
  });

  protected readonly stageMax = computed(() =>
    Math.max(1, ...this.analysis().stages.map((stage) => stage.count)),
  );
  protected readonly trainerMax = computed(() =>
    Math.max(1, ...this.analysis().trainers.map((kind) => kind.count)),
  );
  protected readonly energyMax = computed(() =>
    Math.max(1, ...this.analysis().energies.map((energy) => energy.count)),
  );

  protected readonly types = computed(() =>
    this.analysis().types.map((entry) => ({ ...entry, shareLabel: percent.format(entry.share) })),
  );

  protected readonly odds = computed(() => {
    const { mulliganChance, supporterChance } = this.analysis();
    return {
      mulligan: mulliganChance === null ? null : percent.format(mulliganChance),
      supporter: supporterChance === null ? null : percent.format(supporterChance),
    };
  });
}
