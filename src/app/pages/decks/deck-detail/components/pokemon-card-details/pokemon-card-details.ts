import { Component, computed, input } from '@angular/core';
import { cardCategory } from '../../../../../core/games/pokemon/pokemon-cards';
import { DeckCard } from '../../../../../core/models/card.model';
import { EnergyCost } from '../../../../../shared/energy-cost/energy-cost';
import { EnergySymbol } from '../../../../../shared/energy-symbol/energy-symbol';
import { chanceAllPrized } from '../../state/pokemon-deck-analysis';

/** The kinds of abilities older cards print, as the Brazilian cards call them. */
const ABILITY_KINDS: Record<string, string> = {
  Ability: 'Habilidade',
  'Poké-Power': 'Poké-Poder',
  'Poké-Body': 'Poké-Corpo',
  'Pokémon Power': 'Poder Pokémon',
  'Ancient Trait': 'Traço Antigo',
};

// Small chances (0.0026%) keep two significant digits instead of rounding to 0%.
const odds = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumSignificantDigits: 2 });

/**
 * A Pokémon card read the way it's printed: HP and type on top, then
 * abilities and attacks, rule boxes, and weakness, resistance and retreat at
 * the bottom. Trainers and Energy show their text. For a card in the deck,
 * how likely all its copies are to be stuck in the Prize cards.
 */
@Component({
  selector: 'app-pokemon-card-details',
  imports: [EnergySymbol, EnergyCost],
  templateUrl: './pokemon-card-details.html',
  host: { class: 'block space-y-4' },
})
export class PokemonCardDetails {
  readonly card = input.required<DeckCard>();
  /** Copies in the main deck (0 when it's only in the maybeboard). */
  readonly copies = input(0);
  readonly deckSize = input(0);

  protected readonly isPokemon = computed(() => cardCategory(this.card()) === 'pokemon');

  protected readonly abilities = computed(() =>
    this.card().abilities.map((ability) => ({
      ...ability,
      kind: ability.type ? (ABILITY_KINDS[ability.type] ?? ability.type) : null,
    })),
  );

  /** On a Pokémon the rule box is a footnote (the ex rule); on a Trainer or Energy it's the card's text. */
  protected readonly rulesAreText = computed(() => !this.isPokemon());

  protected readonly prized = computed(() => {
    const copies = this.copies();
    const chance = chanceAllPrized(this.deckSize(), copies);
    if (chance === null) return null;
    return {
      label:
        copies === 1
          ? 'Chance de a única cópia ficar nos prêmios'
          : `Chance de as ${copies} cópias ficarem todas nos prêmios`,
      value: odds.format(chance),
    };
  });
}
