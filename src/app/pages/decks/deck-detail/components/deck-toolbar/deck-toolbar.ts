import { Component, inject, input, model, output } from '@angular/core';
import {
  LucideFunnel,
  LucideGalleryVerticalEnd,
  LucideLayoutGrid,
  LucideList,
} from '@lucide/angular';
import {
  GroupingId,
  GroupingOption,
  SortId,
  SortOption,
} from '../../../../../core/games/game-rules';
import { DeckViewMode, DeckViewPrefs } from '../../state/deck-view-prefs';

/** View mode, grouping, sort and a name filter: everything that changes how the deck reads. */
@Component({
  selector: 'app-deck-toolbar',
  imports: [LucideList, LucideGalleryVerticalEnd, LucideLayoutGrid, LucideFunnel],
  templateUrl: './deck-toolbar.html',
})
export class DeckToolbar {
  protected readonly prefs = inject(DeckViewPrefs);

  /** The game's options; its saved choices may not be among them, so the page passes the ones in effect. */
  readonly groupings = input.required<readonly GroupingOption[]>();
  readonly grouping = input.required<GroupingId>();
  readonly sorts = input.required<readonly SortOption[]>();
  readonly sort = input.required<SortId>();
  readonly filter = model('');
  readonly groupingChange = output<GroupingId>();
  readonly sortChange = output<SortId>();

  protected readonly modes: { id: DeckViewMode; label: string }[] = [
    { id: 'list', label: 'Lista' },
    { id: 'stacks', label: 'Pilhas' },
    { id: 'grid', label: 'Grade' },
  ];
}
