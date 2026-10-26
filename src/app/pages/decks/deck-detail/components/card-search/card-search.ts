import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { LucideFileUp, LucideLoaderCircle, LucideSearch } from '@lucide/angular';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { BOARD_SHORT_LABELS } from '../../../../../core/games/game-rules';
import { Board } from '../../../../../core/models/card.model';
import { Cards } from '../../../../../core/services/cards';
import { Toasts } from '../../../../../shared/toast/toasts';
import { DeckStore } from '../../state/deck-store';

/** Up to how many suggestions the list shows. */
const MAX_SUGGESTIONS = 8;

const ADDED_TO: Record<Board, string> = {
  main: 'ao deck principal',
  side: 'ao sideboard',
  maybe: 'ao maybeboard',
  commander: 'como comandante',
};

/** "4 Lightning Bolt" / "4x Lightning Bolt" → 4 copies; anything else is 1. */
function parseQuery(raw: string): { quantity: number; name: string } {
  const match = /^(\d{1,3})\s*x?\s+(.+)$/i.exec(raw.trim());
  return match
    ? { quantity: Math.max(1, Number(match[1])), name: match[2].trim() }
    : { quantity: 1, name: raw.trim() };
}

/** Text split around the typed term, so the match can be bold. */
function highlight(name: string, term: string): { before: string; match: string; after: string } {
  const index = term ? name.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (index === -1) {
    return { before: name, match: '', after: '' };
  }
  return {
    before: name.slice(0, index),
    match: name.slice(index, index + term.length),
    after: name.slice(index + term.length),
  };
}

/**
 * The "add a card" bar: an autocomplete combobox (ARIA 1.2 pattern) plus the
 * board new cards go to. Enter adds the highlighted suggestion, or the typed
 * name as is (the API matches it loosely).
 */
@Component({
  selector: 'app-card-search',
  imports: [LucideSearch, LucideLoaderCircle, LucideFileUp],
  templateUrl: './card-search.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class CardSearch {
  private readonly cardsService = inject(Cards);
  private readonly store = inject(DeckStore);
  private readonly toasts = inject(Toasts);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Boards the deck uses; new cards go to `board` (main by default). */
  readonly boards = input.required<readonly Board[]>();
  readonly importRequested = output<void>();

  protected readonly boardLabels = BOARD_SHORT_LABELS;
  protected readonly board = signal<Board>('main');
  /** Boards offered as targets: commander last, since it's picked once. */
  protected readonly targets = computed(() => {
    const boards = this.boards();
    return [
      ...boards.filter((board) => board !== 'commander'),
      ...boards.filter((board) => board === 'commander'),
    ];
  });

  protected readonly query = signal('');
  protected readonly parsed = computed(() => parseQuery(this.query()));
  protected readonly suggestions = signal<string[]>([]);
  protected readonly loadingSuggestions = signal(false);
  protected readonly open = signal(false);
  /** Highlighted suggestion; -1 means "use what was typed". */
  protected readonly active = signal(-1);
  protected readonly adding = signal(false);

  protected readonly listboxId = 'card-search-listbox';
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly highlighted = computed(() =>
    this.suggestions().map((name) => highlight(name, this.parsed().name)),
  );

  constructor() {
    toObservable(computed(() => this.parsed().name))
      .pipe(
        debounceTime(180),
        distinctUntilChanged(),
        switchMap((name) => {
          if (name.length < 2) {
            return of<string[]>([]);
          }
          this.loadingSuggestions.set(true);
          // A failed suggestion lookup is silent: Enter still adds the typed name.
          return this.cardsService.autocomplete(name).pipe(catchError(() => of<string[]>([])));
        }),
        map((names) => names.slice(0, MAX_SUGGESTIONS)),
        takeUntilDestroyed(),
      )
      .subscribe((names) => {
        this.loadingSuggestions.set(false);
        this.suggestions.set(names);
        this.active.set(names.length > 0 ? 0 : -1);
      });
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    if (parseQuery(value).name.length < 2) {
      this.suggestions.set([]);
      this.active.set(-1);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.suggestions().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        if (count) this.active.update((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.active.update((index) => (index <= 0 ? count - 1 : index - 1));
        break;
      case 'Enter':
        event.preventDefault();
        this.add(this.open() ? this.suggestions()[this.active()] : undefined);
        break;
      case 'Escape':
        if (this.open() && count) {
          event.preventDefault();
          this.open.set(false);
        } else if (this.query()) {
          event.preventDefault();
          this.query.set('');
        }
        break;
    }
  }

  protected async add(suggestion?: string): Promise<void> {
    const { quantity, name: typed } = this.parsed();
    const name = suggestion ?? typed;
    if (!name || this.adding()) {
      return;
    }

    const board = this.board();
    this.adding.set(true);
    this.open.set(false);
    const deck = await this.store.addByName(name, quantity, board);
    this.adding.set(false);

    if (deck) {
      this.toasts.success(`${quantity}× ${name} adicionada ${ADDED_TO[board]}.`);
      this.query.set('');
      this.suggestions.set([]);
      this.active.set(-1);
    }
    // Ready for the next card either way (on error, to fix the name).
    const input = this.input().nativeElement;
    input.focus();
    if (!deck) input.select();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
