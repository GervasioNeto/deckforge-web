import { Component, inject, input, output } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';
import { DeckCard } from '../../../../../core/models/card.model';
import { CardImage } from '../../../../../shared/card-image/card-image';
import { CardGroup } from '../../state/deck-sections';
import { DeckStore } from '../../state/deck-store';
import { QuantityStepper } from '../quantity-stepper/quantity-stepper';

/** Every card face up in a grid, grouped under headings, with its copies as a badge. */
@Component({
  selector: 'app-deck-grid-view',
  imports: [CardImage, QuantityStepper, LucideTriangleAlert],
  templateUrl: './deck-grid-view.html',
})
export class DeckGridView {
  private readonly store = inject(DeckStore);

  readonly groups = input.required<CardGroup[]>();
  readonly cardIssues = input.required<ReadonlyMap<string, string>>();
  readonly canEdit = input(false);
  readonly inspect = output<DeckCard>();

  protected step(card: DeckCard, delta: number): void {
    this.store.setQuantity(card, card.quantity + delta);
  }
}
