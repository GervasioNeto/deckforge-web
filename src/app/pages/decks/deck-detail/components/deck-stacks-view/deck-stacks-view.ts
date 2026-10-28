import { Component, input, output } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';
import { DeckCard } from '../../../../../core/models/card.model';
import { thumbnailUrl } from '../../../../../core/utils/card-image-url';
import { CardImage } from '../../../../../shared/card-image/card-image';
import { CardGroup } from '../../state/deck-sections';

/**
 * Visual stacks: one column per group, cards overlapped so only each title
 * bar shows, like a pile on the table. Hovering (or focusing) a card lifts it
 * whole above the rest. One card per entry, with its copies as a badge, keeps
 * a 24-land column from running off the page.
 */
@Component({
  selector: 'app-deck-stacks-view',
  imports: [CardImage, LucideTriangleAlert],
  templateUrl: './deck-stacks-view.html',
})
export class DeckStacksView {
  readonly groups = input.required<CardGroup[]>();
  readonly cardIssues = input.required<ReadonlyMap<string, string>>();
  readonly inspect = output<DeckCard>();

  /** Light scans: a stack loads every card at once. */
  protected readonly thumbnail = thumbnailUrl;
}
