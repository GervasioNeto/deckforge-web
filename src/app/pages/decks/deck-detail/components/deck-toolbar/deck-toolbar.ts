import { Component, inject, input, model } from '@angular/core';
import {
  LucideFunnel,
  LucideGalleryVerticalEnd,
  LucideLayoutGrid,
  LucideList,
} from '@lucide/angular';
import { GroupingId, GroupingOption } from '../../../../../core/games/game-rules';
import { DeckSort, SORT_LABELS } from '../../state/deck-sections';
import { DeckViewMode, DeckViewPrefs } from '../../state/deck-view-prefs';

/** View mode, grouping, sort and a name filter: everything that changes how the deck reads. */
@Component({
  selector: 'app-deck-toolbar',
  imports: [LucideList, LucideGalleryVerticalEnd, LucideLayoutGrid, LucideFunnel],
  templateUrl: './deck-toolbar.html',
})
export class DeckToolbar {
  protected readonly prefs = inject(DeckViewPrefs);

  readonly groupings = input.required<readonly GroupingOption[]>();
  /** The grouping in effect (the saved one may not exist for this game). */
  readonly grouping = input.required<GroupingId>();
  readonly filter = model('');

  protected readonly modes: { id: DeckViewMode; label: string }[] = [
    { id: 'list', label: 'Lista' },
    { id: 'stacks', label: 'Pilhas' },
    { id: 'grid', label: 'Grade' },
  ];

  protected readonly sorts = Object.entries(SORT_LABELS) as [DeckSort, string][];
}
