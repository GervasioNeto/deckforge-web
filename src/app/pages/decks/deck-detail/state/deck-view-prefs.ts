import { Service, effect, signal } from '@angular/core';
import { GroupingId } from '../../../../core/games/game-rules';
import { DeckSort } from './deck-sections';

export type DeckViewMode = 'list' | 'stacks' | 'grid';

const STORAGE_KEY = 'deckforge-deck-view';

const MODES: readonly DeckViewMode[] = ['list', 'stacks', 'grid'];
const GROUPINGS: readonly GroupingId[] = ['type', 'cmc', 'color', 'rarity', 'none'];
const SORTS: readonly DeckSort[] = ['cmc', 'name', 'quantity'];

interface StoredPrefs {
  mode: DeckViewMode;
  grouping: GroupingId;
  sort: DeckSort;
}

function pick<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function readStored(): StoredPrefs {
  let stored: Partial<StoredPrefs> = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    // Blocked or corrupted storage: defaults.
  }
  return {
    mode: pick(MODES, stored.mode, 'list'),
    grouping: pick(GROUPINGS, stored.grouping, 'type'),
    sort: pick(SORTS, stored.sort, 'cmc'),
  };
}

/** How the user likes to see decks (list/stacks/grid, grouping, sort), kept across visits. */
@Service()
export class DeckViewPrefs {
  private readonly initial = readStored();

  readonly mode = signal<DeckViewMode>(this.initial.mode);
  readonly grouping = signal<GroupingId>(this.initial.grouping);
  readonly sort = signal<DeckSort>(this.initial.sort);

  constructor() {
    effect(() => {
      const prefs: StoredPrefs = {
        mode: this.mode(),
        grouping: this.grouping(),
        sort: this.sort(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      } catch {
        // Storage blocked (e.g. private mode): the choice lasts until reload.
      }
    });
  }
}
