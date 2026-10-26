import { Component, computed, input } from '@angular/core';
import { manaCostLabel, parseManaCost } from '../../core/games/mtg/mana';
import { ManaPip, ManaPipSize } from '../mana-pip/mana-pip';

/** A whole mana cost ("{2}{U}{B}") as a row of pips; split cards show both halves. */
@Component({
  selector: 'app-mana-cost',
  imports: [ManaPip],
  template: `
    @for (face of faces(); track $index) {
      @if (!$first) {
        <span class="px-0.5 text-[10px] text-text-muted" aria-hidden="true">//</span>
      }
      @for (symbol of face; track $index) {
        <app-mana-pip [symbol]="symbol" [size]="size()" decorative />
      }
    }
  `,
  host: {
    class: 'inline-flex shrink-0 items-center gap-0.5',
    '[attr.role]': 'faces().length ? "img" : null',
    '[attr.aria-label]': 'faces().length ? "Custo: " + label() : null',
    '[attr.title]': 'faces().length ? label() : null',
  },
})
export class ManaCost {
  readonly cost = input<string | null | undefined>(null);
  readonly size = input<ManaPipSize>('md');

  protected readonly faces = computed(() => parseManaCost(this.cost()));
  protected readonly label = computed(() => manaCostLabel(this.faces()));
}
