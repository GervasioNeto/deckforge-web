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
import { LucideArrowLeft, LucideFileUp, LucideLoaderCircle, LucideSearch } from '@lucide/angular';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { BOARD_SHORT_LABELS } from '../../../../../core/games/game-rules';
import { isStandardMark } from '../../../../../core/games/pokemon/pokemon-rules';
import { Board, CardPrint } from '../../../../../core/models/card.model';
import { GameType } from '../../../../../core/models/deck.model';
import { Cards } from '../../../../../core/services/cards';
import { thumbnailUrl } from '../../../../../core/utils/card-image-url';
import { CardImage } from '../../../../../shared/card-image/card-image';
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

const PLACEHOLDERS: Record<GameType, string> = {
  mtg: 'Adicionar carta — ex.: 4 Lightning Bolt',
  pokemon: 'Adicionar carta — ex.: 4 Pikachu ex',
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
 * board new cards go to.
 *
 * Magic: Enter adds the highlighted suggestion, or the typed name as is (the
 * API matches it loosely). Pokémon: picking a name lists its printings (art,
 * set and number), newest first, and Enter adds the highlighted one; so two
 * Enters add the newest printing. A typed name with no suggestion is added as
 * is (the API takes the newest printing).
 */
@Component({
  selector: 'app-card-search',
  imports: [CardImage, LucideSearch, LucideLoaderCircle, LucideFileUp, LucideArrowLeft],
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
  readonly game = input.required<GameType>();
  /** The deck's format: in a Standard Pokémon deck, printings out of Standard are pointed out. */
  readonly format = input<string | null>(null);
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
  protected readonly placeholder = computed(() => PLACEHOLDERS[this.game()]);
  /** Pokémon picks a printing before adding; Magic adds by name. */
  protected readonly picksPrintings = computed(() => this.game() === 'pokemon');

  protected readonly query = signal('');
  protected readonly parsed = computed(() => parseQuery(this.query()));
  protected readonly suggestions = signal<string[]>([]);
  protected readonly loadingSuggestions = signal(false);
  protected readonly open = signal(false);
  /** Highlighted option (suggestion or printing); -1 means "use what was typed". */
  protected readonly active = signal(-1);
  protected readonly adding = signal(false);

  /** The name whose printings are listed (Pokémon); null while suggesting names. */
  protected readonly printsOf = signal<string | null>(null);
  protected readonly prints = signal<CardPrint[]>([]);
  protected readonly loadingPrints = signal(false);
  protected readonly printsFailed = signal(false);
  private readonly printRequests = new Subject<string>();

  protected readonly listboxId = 'card-search-listbox';
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly highlighted = computed(() =>
    this.suggestions().map((name) => highlight(name, this.parsed().name)),
  );
  protected readonly thumbnail = thumbnailUrl;
  /** Standard goes by the printing (its regulation mark), so it matters which one is picked. */
  protected readonly checksStandard = computed(
    () => this.picksPrintings() && this.format() === 'standard',
  );
  protected readonly isStandardMark = isStandardMark;

  /** How many options the open list has, in whichever step it is. */
  private readonly optionCount = computed(() =>
    this.printsOf() ? this.prints().length : this.suggestions().length,
  );
  protected readonly activeId = computed(() => {
    const index = this.active();
    if (index < 0) return null;
    return this.printsOf() ? `${this.listboxId}-print-${index}` : `${this.listboxId}-${index}`;
  });

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
          return this.cardsService
            .autocomplete(name, this.game())
            .pipe(catchError(() => of<string[]>([])));
        }),
        map((names) => names.slice(0, MAX_SUGGESTIONS)),
        takeUntilDestroyed(),
      )
      .subscribe((names) => {
        this.loadingSuggestions.set(false);
        this.suggestions.set(names);
        if (!this.printsOf()) {
          this.active.set(names.length > 0 ? 0 : -1);
        }
      });

    this.printRequests
      .pipe(
        switchMap((name) =>
          this.cardsService.searchPrints(name, this.game()).pipe(
            map((prints) => ({ prints, failed: false })),
            catchError(() => of({ prints: [] as CardPrint[], failed: true })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ prints, failed }) => {
        this.loadingPrints.set(false);
        this.printsFailed.set(failed);
        this.prints.set(prints);
        this.active.set(prints.length > 0 ? 0 : -1);
      });
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    // Typing again goes back to the names.
    this.printsOf.set(null);
    if (parseQuery(value).name.length < 2) {
      this.suggestions.set([]);
      this.active.set(-1);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.optionCount();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        if (count) this.moveActive((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.moveActive((index) => (index <= 0 ? count - 1 : index - 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (this.printsOf()) {
          this.addPrinting(this.prints()[this.active()]);
        } else {
          this.choose(this.open() ? this.suggestions()[this.active()] : undefined);
        }
        break;
      case 'Escape':
        if (this.printsOf()) {
          event.preventDefault();
          this.closePrints();
        } else if (this.open() && count) {
          event.preventDefault();
          this.open.set(false);
        } else if (this.query()) {
          event.preventDefault();
          this.query.set('');
        }
        break;
    }
  }

  /** A suggestion picked: Pokémon lists its printings; Magic adds it. */
  protected choose(suggestion?: string): void {
    if (suggestion && this.picksPrintings()) {
      this.showPrints(suggestion);
    } else {
      void this.add(suggestion);
    }
  }

  protected showPrints(name: string): void {
    this.printsOf.set(name);
    this.prints.set([]);
    this.printsFailed.set(false);
    this.loadingPrints.set(true);
    this.active.set(-1);
    this.open.set(true);
    this.printRequests.next(name);
  }

  protected closePrints(): void {
    const name = this.printsOf();
    this.printsOf.set(null);
    this.active.set(Math.max(0, this.suggestions().indexOf(name ?? '')));
    this.input().nativeElement.focus();
  }

  /** By name: the highlighted suggestion or what was typed. */
  protected async add(suggestion?: string): Promise<void> {
    const { quantity, name: typed } = this.parsed();
    const name = suggestion ?? typed;
    if (!name || this.adding()) {
      return;
    }
    const board = this.board();
    await this.finish(this.store.addByName(name, quantity, board), `${quantity}× ${name}`, board);
  }

  /** A printing; with none listed (failed or empty), the newest by name. */
  protected async addPrinting(print?: CardPrint): Promise<void> {
    const name = this.printsOf();
    if (!name || this.adding()) {
      return;
    }
    if (!print) {
      await this.add(name);
      return;
    }
    const { quantity } = this.parsed();
    const board = this.board();
    const where = [print.setName, print.collectorNumber ? `#${print.collectorNumber}` : null]
      .filter(Boolean)
      .join(' ');
    await this.finish(
      this.store.addPrinting(print.externalId, print.name, quantity, board),
      `${quantity}× ${print.name}${where ? ` (${where})` : ''}`,
      board,
    );
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private async finish(request: Promise<unknown>, added: string, board: Board): Promise<void> {
    this.adding.set(true);
    this.open.set(false);
    const deck = await request;
    this.adding.set(false);

    if (deck) {
      this.toasts.success(`${added} adicionada ${ADDED_TO[board]}.`);
      this.query.set('');
      this.suggestions.set([]);
      this.printsOf.set(null);
      this.active.set(-1);
    }
    // Ready for the next card either way (on error, to fix the name).
    const input = this.input().nativeElement;
    input.focus();
    if (!deck) input.select();
  }

  /** Moves the highlight and keeps it in view (the printings list scrolls). */
  private moveActive(next: (index: number) => number): void {
    this.active.update(next);
    queueMicrotask(() => {
      const id = this.activeId();
      if (id) this.host.nativeElement.querySelector(`#${id}`)?.scrollIntoView({ block: 'nearest' });
    });
  }
}
