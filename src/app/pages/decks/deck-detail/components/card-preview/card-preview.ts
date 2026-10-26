import { Component, input } from '@angular/core';
import { DeckCard } from '../../../../../core/models/card.model';
import { CardImage } from '../../../../../shared/card-image/card-image';

/** The card under the pointer in the list view, at a readable size. */
@Component({
  selector: 'app-card-preview',
  imports: [CardImage],
  template: `
    @if (card(); as card) {
      <app-card-image
        [src]="card.imageUrl"
        [name]="card.name"
        [typeLine]="card.typeLine"
        eager
        class="shadow-xl shadow-black/40 light:shadow-black/15"
      />
      <p class="mt-2 truncate px-0.5 text-xs text-text-muted" aria-live="polite">
        <span class="font-medium text-text">{{ card.name }}</span>
        @if (card.setName) {
          · {{ card.setName }}
        }
      </p>
    } @else {
      <div
        class="card-frame flex aspect-[63/88] items-center justify-center rounded-[4.75%/3.4%] p-6 text-center text-sm text-card-frame-text"
      >
        Passe o mouse sobre uma carta para vê-la aqui.
      </div>
    }
  `,
  host: { class: 'block' },
})
export class CardPreview {
  readonly card = input<DeckCard | null>(null);
}
