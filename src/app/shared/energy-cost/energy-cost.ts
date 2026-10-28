import { Component, computed, input } from '@angular/core';
import { energyCostLabel } from '../../core/games/pokemon/energy';
import { EnergySymbol, EnergySymbolSize } from '../energy-symbol/energy-symbol';

/** A row of energy symbols read as one ("Custo: Fogo, Fogo e Incolor"): attack and retreat costs. */
@Component({
  selector: 'app-energy-cost',
  imports: [EnergySymbol],
  template: `
    @for (type of cost(); track $index) {
      <app-energy-symbol [type]="type" [size]="size()" decorative />
    }
  `,
  host: {
    class: 'inline-flex shrink-0 items-center gap-0.5',
    '[attr.role]': 'cost().length ? "img" : null',
    '[attr.aria-label]': 'cost().length ? label() + ": " + spoken() : null',
    '[attr.title]': 'cost().length ? spoken() : null',
  },
})
export class EnergyCost {
  readonly cost = input.required<readonly string[]>();
  readonly size = input<EnergySymbolSize>('md');
  /** What the cost is for, read before it. */
  readonly label = input('Custo');

  protected readonly spoken = computed(() => energyCostLabel(this.cost()));
}
