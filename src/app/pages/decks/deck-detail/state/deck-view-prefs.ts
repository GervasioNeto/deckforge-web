import { Service, effect, signal } from '@angular/core';
import { GroupingId, SortId } from '../../../../core/games/game-rules';
import { GameType, isGameType } from '../../../../core/models/deck.model';

export type DeckViewMode = 'list' | 'stacks' | 'grid';

const STORAGE_KEY = 'deckforge-deck-view';

const MODES: readonly DeckViewMode[] = ['list', 'stacks', 'grid'];
const GROUPINGS: readonly GroupingId[] = [
  'type',
  'cmc',
  'color',
  'rarity',
  'stage',
  'energy',
  'none',
];
const SORTS: readonly SortId[] = ['cmc', 'line', 'name', 'quantity'];

type PerGame<T> = Partial<Record<GameType, T>>;

interface StoredPrefs {
  mode: DeckViewMode;
  /** Each game has its own groupings and sorts, so each keeps its own choice. */
  grouping: PerGame<GroupingId>;
  sort: PerGame<SortId>;
}

function pick<T>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** A per-game choice; a single value is the older format, saved when only Magic had decks. */
function pickPerGame<T>(options: readonly T[], value: unknown): PerGame<T> {
  if (typeof value === 'string') {
    return options.includes(value as T) ? { mtg: value as T } : {};
  }
  const result: PerGame<T> = {};
  if (value && typeof value === 'object') {
    for (const [game, choice] of Object.entries(value)) {
      if (isGameType(game) && options.includes(choice as T)) {
        result[game] = choice as T;
      }
    }
  }
  return result;
}

function readStored(): StoredPrefs {
  let stored: Record<string, unknown> = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    // Blocked or corrupted storage: defaults.
  }
  return {
    mode: pick(MODES, stored['mode'], 'list'),
    grouping: pickPerGame(GROUPINGS, stored['grouping']),
    sort: pickPerGame(SORTS, stored['sort']),
  };
}

/**
 * How the user likes to see decks, kept across visits: the view mode for
 * every deck, and per game the grouping and sort. A game without a saved
 * choice (or with one it no longer offers) uses its default (see GameRules).
 */
@Service()
export class DeckViewPrefs {
  private readonly initial = readStored();

  readonly mode = signal<DeckViewMode>(this.initial.mode);
  private readonly groupings = signal<PerGame<GroupingId>>(this.initial.grouping);
  private readonly sorts = signal<PerGame<SortId>>(this.initial.sort);

  constructor() {
    effect(() => {
      const prefs: StoredPrefs = {
        mode: this.mode(),
        grouping: this.groupings(),
        sort: this.sorts(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      } catch {
        // Storage blocked (e.g. private mode): the choice lasts until reload.
      }
    });
  }

  grouping(game: GameType): GroupingId | undefined {
    return this.groupings()[game];
  }

  sort(game: GameType): SortId | undefined {
    return this.sorts()[game];
  }

  setGrouping(game: GameType, grouping: GroupingId): void {
    this.groupings.update((current) => ({ ...current, [game]: grouping }));
  }

  setSort(game: GameType, sort: SortId): void {
    this.sorts.update((current) => ({ ...current, [game]: sort }));
  }
}
