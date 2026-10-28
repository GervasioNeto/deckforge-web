import { Service, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, Subscription, catchError, concatMap, map, of } from 'rxjs';
import { GAME_RULES } from '../../../../core/games/games';
import { Board, DeckCard } from '../../../../core/models/card.model';
import {
  Deck,
  DeckWithCards,
  ImportEntry,
  ImportResult,
  UpdateDeckPayload,
} from '../../../../core/models/deck.model';
import { Decks } from '../../../../core/services/decks';
import { apiErrorMessage } from '../../../../core/utils/api-error';
import { Toasts } from '../../../../shared/toast/toasts';

/** A card the store can add to a board without asking the API who it is. */
export type KnownCard = Omit<DeckCard, 'board' | 'quantity'>;

interface Mutation<T> {
  deckId: string;
  request: () => Observable<T>;
  deckOf: (result: T) => DeckWithCards;
  errorMessage: string;
  errorCodes?: Record<string, string>;
  resolve: (result: T | null) => void;
}

type QueueResult<T> =
  | { mutation: Mutation<T>; result: T; error: null }
  | { mutation: Mutation<T>; result: null; error: unknown };

const CARD_ERRORS: Record<string, string> = {
  CARD_NOT_IN_DECK: 'Essa carta não está mais no deck.',
  DECK_NOT_FOUND: 'Deck não encontrado.',
};

/**
 * State of the deck open in the detail page (provided by the page, so each
 * visit starts fresh).
 *
 * Edits are optimistic: the view changes at once, and the requests run one at
 * a time, in order (rapid "+ + +" clicks arrive as 5, 6, 7, never out of
 * order). Every response carries the whole deck; once the queue drains the
 * view becomes exactly what the API last confirmed, which also rolls back any
 * change that failed along the way.
 */
@Service({ autoProvided: false })
export class DeckStore {
  private readonly decksService = inject(Decks);
  private readonly toasts = inject(Toasts);

  private readonly state = signal<DeckWithCards | null>(null);
  readonly deck = this.state.asReadonly();
  readonly cards = computed(() => this.state()?.cards ?? []);
  readonly rules = computed(() => GAME_RULES[this.state()?.game ?? 'mtg']);
  readonly canEdit = computed(() => this.state()?.isOwner ?? false);

  private readonly loadingState = signal(true);
  readonly loading = this.loadingState.asReadonly();
  private readonly loadErrorState = signal<string | null>(null);
  readonly loadError = this.loadErrorState.asReadonly();

  private readonly pendingCount = signal(0);
  /** Requests queued or in flight. */
  readonly saving = computed(() => this.pendingCount() > 0);

  private deckId: string | null = null;
  /** Last state the API confirmed; `state` runs ahead of it while edits are pending. */
  private serverDeck: DeckWithCards | null = null;
  private loadSubscription?: Subscription;
  private readonly queue = new Subject<Mutation<unknown>>();

  constructor() {
    this.queue
      .pipe(
        concatMap((mutation) =>
          mutation.request().pipe(
            map((result): QueueResult<unknown> => ({ mutation, result, error: null })),
            catchError((error: unknown) =>
              of<QueueResult<unknown>>({ mutation, result: null, error }),
            ),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.settle(outcome));
  }

  load(deckId: string): void {
    this.deckId = deckId;
    this.serverDeck = null;
    this.state.set(null);
    this.pendingCount.set(0);
    this.loadingState.set(true);
    this.loadErrorState.set(null);
    this.fetch(deckId);
  }

  /** Fetches again without blanking the page (e.g. after signing in or out). */
  refresh(): void {
    if (this.deckId && !this.saving()) {
      this.fetch(this.deckId);
    }
  }

  /** The entry for a card in a board, as currently shown. */
  entry(cardId: string, board: Board): DeckCard | undefined {
    return this.cards().find((card) => card.id === cardId && card.board === board);
  }

  /** Exact copies of an entry; 0 takes it out of its board. */
  setQuantity(entry: DeckCard, quantity: number): Promise<DeckWithCards | null> {
    const next = Math.max(0, quantity);
    return this.run({
      optimistic: (deck) =>
        replaceEntry(deck, entry.id, entry.board, (current) =>
          current && next > 0 ? { ...current, quantity: next } : null,
        ),
      request: (deckId) => this.decksService.setCardQuantity(deckId, entry.id, entry.board, next),
      errorMessage: 'Não foi possível alterar a quantidade.',
      errorCodes: CARD_ERRORS,
    });
  }

  /** ±copies of a card in a board, adding it there if it's new to that board. */
  changeQuantity(card: KnownCard, board: Board, delta: number): Promise<DeckWithCards | null> {
    const entry = this.entry(card.id, board);
    if (entry) {
      return this.setQuantity(entry, entry.quantity + delta);
    }
    if (delta <= 0) {
      return Promise.resolve(null);
    }
    return this.run({
      optimistic: (deck) =>
        replaceEntry(deck, card.id, board, () => ({ ...card, board, quantity: delta })),
      request: (deckId) =>
        this.decksService.addCard(deckId, { externalId: card.externalId, quantity: delta, board }),
      errorMessage: `Não foi possível adicionar "${card.name}".`,
    });
  }

  /** Moves copies of an entry (default: all) to another board, merging with what's there. */
  move(entry: DeckCard, to: Board, quantity = entry.quantity): Promise<DeckWithCards | null> {
    const moving = Math.min(quantity, entry.quantity);
    return this.run({
      optimistic: (deck) => {
        const left = replaceEntry(deck, entry.id, entry.board, (current) =>
          current && current.quantity > moving
            ? { ...current, quantity: current.quantity - moving }
            : null,
        );
        return replaceEntry(left, entry.id, to, (current) => ({
          ...entry,
          board: to,
          quantity: (current?.quantity ?? 0) + moving,
        }));
      },
      request: (deckId) =>
        this.decksService.moveCard(deckId, entry.id, { from: entry.board, to, quantity: moving }),
      errorMessage: 'Não foi possível mover a carta.',
      errorCodes: CARD_ERRORS,
    });
  }

  /**
   * Adds by name; the API resolves it (fuzzy on Magic, exact and newest
   * printing on Pokémon), so nothing shows until it answers.
   */
  addByName(name: string, quantity: number, board: Board): Promise<DeckWithCards | null> {
    return this.run({
      request: (deckId) => this.decksService.addCard(deckId, { name, quantity, board }),
      errorMessage: `Não foi possível adicionar "${name}".`,
      errorCodes: { CARD_NOT_FOUND: `Nenhuma carta encontrada com o nome "${name}".` },
    });
  }

  /** Adds one printing picked from a search; like `addByName`, it shows once the API answers. */
  addPrinting(
    externalId: string,
    name: string,
    quantity: number,
    board: Board,
  ): Promise<DeckWithCards | null> {
    return this.run({
      request: (deckId) => this.decksService.addCard(deckId, { externalId, quantity, board }),
      errorMessage: `Não foi possível adicionar "${name}".`,
      errorCodes: { CARD_NOT_FOUND: `Essa impressão de "${name}" não foi encontrada.` },
    });
  }

  importList(entries: ImportEntry[], replace: boolean): Promise<ImportResult | null> {
    return this.run<ImportResult>({
      request: (deckId) => this.decksService.importCards(deckId, entries, replace),
      deckOf: (result) => result.deck,
      errorMessage: 'Não foi possível importar a lista.',
      errorCodes: { NO_CARDS_RECOGNIZED: 'Nenhuma carta da lista foi reconhecida.' },
    });
  }

  update(changes: UpdateDeckPayload): Promise<DeckWithCards | null> {
    return this.run({
      optimistic: (deck) => ({ ...deck, ...changes }),
      request: (deckId) => this.decksService.updateDeck(deckId, changes),
      errorMessage: 'Não foi possível salvar as alterações do deck.',
    });
  }

  setCover(card: DeckCard): Promise<DeckWithCards | null> {
    return this.run({
      optimistic: (deck) => ({ ...deck, coverCardId: card.id, coverImageUrl: card.imageUrl }),
      request: (deckId) => this.decksService.updateDeck(deckId, { coverCardId: card.id }),
      errorMessage: 'Não foi possível trocar a capa.',
    });
  }

  /** Straight to the API (no queue): the page leaves right after. */
  deleteDeck(): Promise<boolean> {
    const deckId = this.deckId;
    if (!deckId) return Promise.resolve(false);
    return new Promise((resolve) =>
      this.decksService.deleteDeck(deckId).subscribe({
        next: () => resolve(true),
        error: (error: unknown) => {
          this.toasts.error(apiErrorMessage(error, 'Não foi possível excluir o deck.'));
          resolve(false);
        },
      }),
    );
  }

  duplicate(): Promise<Deck | null> {
    const deckId = this.deckId;
    if (!deckId) return Promise.resolve(null);
    return new Promise((resolve) =>
      this.decksService.duplicateDeck(deckId).subscribe({
        next: (copy) => resolve(copy),
        error: (error: unknown) => {
          this.toasts.error(apiErrorMessage(error, 'Não foi possível copiar o deck.'));
          resolve(null);
        },
      }),
    );
  }

  private fetch(deckId: string): void {
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.decksService.getDeck(deckId).subscribe({
      next: (deck) => {
        this.serverDeck = deck;
        this.state.set(deck);
        this.loadingState.set(false);
      },
      error: (error: unknown) => {
        // A failed background refresh keeps what's on screen.
        if (!this.state()) {
          this.loadErrorState.set(
            apiErrorMessage(error, 'Não foi possível carregar o deck.', {
              DECK_NOT_FOUND: 'Este deck não existe, foi excluído ou é privado.',
            }),
          );
        }
        this.loadingState.set(false);
      },
    });
  }

  private run<T = DeckWithCards>(options: {
    optimistic?: (deck: DeckWithCards) => DeckWithCards;
    request: (deckId: string) => Observable<T>;
    deckOf?: (result: T) => DeckWithCards;
    errorMessage: string;
    errorCodes?: Record<string, string>;
  }): Promise<T | null> {
    const deckId = this.deckId;
    if (!deckId || !this.state()) {
      return Promise.resolve(null);
    }

    if (options.optimistic) {
      this.state.update((deck) => deck && options.optimistic!(deck));
    }
    this.pendingCount.update((count) => count + 1);

    return new Promise<T | null>((resolve) => {
      const mutation: Mutation<T> = {
        deckId,
        request: () => options.request(deckId),
        deckOf: options.deckOf ?? ((result) => result as unknown as DeckWithCards),
        errorMessage: options.errorMessage,
        errorCodes: options.errorCodes,
        resolve,
      };
      this.queue.next(mutation as Mutation<unknown>);
    });
  }

  private settle({ mutation, result, error }: QueueResult<unknown>): void {
    // Answer for a deck the page already left.
    if (mutation.deckId !== this.deckId) {
      mutation.resolve(null);
      return;
    }

    this.pendingCount.update((count) => Math.max(0, count - 1));
    if (error) {
      this.toasts.error(apiErrorMessage(error, mutation.errorMessage, mutation.errorCodes));
    } else {
      this.serverDeck = mutation.deckOf(result);
    }

    if (this.pendingCount() === 0 && this.serverDeck) {
      this.state.set(this.serverDeck);
    }
    mutation.resolve(error ? null : result);
  }
}

/**
 * Replaces (or adds, or with null drops) the entry for a card in a board. New
 * entries go to the end; the view sorts them anyway.
 */
function replaceEntry(
  deck: DeckWithCards,
  cardId: string,
  board: Board,
  change: (current: DeckCard | undefined) => DeckCard | null,
): DeckWithCards {
  const index = deck.cards.findIndex((card) => card.id === cardId && card.board === board);
  const next = change(index === -1 ? undefined : deck.cards[index]);
  const cards = [...deck.cards];

  if (index === -1) {
    if (next) cards.push(next);
  } else if (next) {
    cards[index] = next;
  } else {
    cards.splice(index, 1);
  }
  return { ...deck, cards };
}
