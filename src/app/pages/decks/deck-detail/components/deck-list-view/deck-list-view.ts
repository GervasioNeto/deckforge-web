import { Component, inject, input, output } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';
import { DeckCard } from '../../../../../core/models/card.model';
import { ManaCost } from '../../../../../shared/mana-cost/mana-cost';
import { CardGroup } from '../../state/deck-sections';
import { DeckStore } from '../../state/deck-store';
import { QuantityStepper } from '../quantity-stepper/quantity-stepper';

/**
 * The classic text list: groups flow into columns, one row per card with
 * quantity, name and cost. Hovering a row previews the card; clicking
 * opens its details. Owners get a stepper on hover (touch screens edit from
 * the details dialog instead).
 */
@Component({
  selector: 'app-deck-list-view',
  imports: [ManaCost, QuantityStepper, LucideTriangleAlert],
  templateUrl: './deck-list-view.html',
})
export class DeckListView {
  protected readonly store = inject(DeckStore);

  readonly groups = input.required<CardGroup[]>();
  readonly cardIssues = input.required<ReadonlyMap<string, string>>();
  readonly hasMana = input(true);
  readonly canEdit = input(false);
  readonly inspect = output<DeckCard>();
  readonly preview = output<DeckCard>();

  protected step(card: DeckCard, delta: number): void {
    this.store.setQuantity(card, card.quantity + delta);
  }
}
