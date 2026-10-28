import { Component, computed, input } from '@angular/core';
import {
  TRAINER_KIND_LABELS,
  cardCategory,
  cardType,
  energyKind,
  isAceSpec,
  trainerKind,
} from '../../../../../core/games/pokemon/pokemon-cards';
import { DeckCard } from '../../../../../core/models/card.model';
import { EnergySymbol } from '../../../../../shared/energy-symbol/energy-symbol';

/**
 * What sits where Magic shows the mana cost in a list row: a Pokémon's types,
 * a Trainer's kind (with ACE SPEC called out) or the Energy's type.
 */
@Component({
  selector: 'app-pokemon-card-tag',
  imports: [EnergySymbol],
  template: `
    @switch (category()) {
      @case ('pokemon') {
        @for (type of card().types; track type) {
          <app-energy-symbol [type]="type" size="sm" />
        }
      }
      @case ('trainer') {
        @if (aceSpec()) {
          <!-- Neutral on purpose: purple is the app's error color. -->
          <span
            class="rounded-sm bg-text/10 px-1 py-px text-[10px] font-semibold tracking-wide text-text"
            title="ACE SPEC: só 1 por deck"
          >
            ACE SPEC
          </span>
        }
        <span class="text-xs text-text-muted">{{ trainerLabel() }}</span>
      }
      @case ('energy') {
        @if (energyType(); as type) {
          <app-energy-symbol [type]="type" size="sm" />
        } @else {
          <span class="text-xs text-text-muted">Especial</span>
        }
      }
    }
  `,
  host: { class: 'inline-flex shrink-0 items-center gap-1' },
})
export class PokemonCardTag {
  readonly card = input.required<DeckCard>();

  protected readonly category = computed(() => cardCategory(this.card()));
  protected readonly aceSpec = computed(() => isAceSpec(this.card()));
  protected readonly trainerLabel = computed(() => {
    const kind = trainerKind(this.card());
    return kind ? TRAINER_KIND_LABELS[kind] : null;
  });
  protected readonly energyType = computed(() =>
    energyKind(this.card()) === 'basic' ? cardType(this.card()) : null,
  );
}
