import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, finalize, retry } from 'rxjs';
import { Card, DeckCard } from '../../../core/models/card.model';
import { DeckWithCards } from '../../../core/models/deck.model';
import { Cards } from '../../../core/services/cards';
import { Decks } from '../../../core/services/decks';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { Toasts } from '../../../shared/toast/toasts';

/** What the page needs to add a copy, whether it comes from the search or the grid. */
type CardRef = Pick<DeckCard, 'externalId' | 'name' | 'imageUrl'>;

@Component({
  selector: 'app-deck-detail',
  imports: [RouterLink, FormsModule],
  templateUrl: './deck-detail.html',
})
export class DeckDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly decksService = inject(Decks);
  private readonly cardsService = inject(Cards);
  private readonly toasts = inject(Toasts);

  protected readonly deckId = this.route.snapshot.paramMap.get('deckId')!;

  protected readonly deck = signal<DeckWithCards | null>(null);
  protected readonly deckCards = computed(() => this.deck()?.cards ?? []);
  /** Sum of quantities, e.g. 4 copies of one card count as 4. */
  protected readonly totalCards = computed(() =>
    this.deckCards().reduce((sum, card) => sum + card.quantity, 0),
  );
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  protected readonly searchTerm = signal('');
  protected readonly searchResult = signal<Card | null>(null);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  private searchSubscription?: Subscription;

  /**
   * The card being added/removed right now. Only one change runs at a time:
   * each request moves the quantity by one, so overlapping requests (or a
   * double click) would leave the optimistic state out of sync.
   */
  protected readonly pending = signal<{ externalId: string; action: 'add' | 'remove' } | null>(null);
  protected readonly busy = computed(() => this.pending() !== null);

  /** Copies of the searched card already in the deck (0 when it isn't there). */
  protected readonly quantityInDeck = computed(() => {
    const result = this.searchResult();
    if (!result) {
      return 0;
    }
    return this.deckCards().find((card) => card.externalId === result.id)?.quantity ?? 0;
  });

  constructor() {
    this.loadDeck();
  }

  protected onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
    // The result/error belong to the previous term.
    this.searchSubscription?.unsubscribe();
    this.searching.set(false);
    this.searchResult.set(null);
    this.searchError.set(null);
  }

  search(): void {
    const name = this.searchTerm().trim();
    if (!name) {
      return;
    }

    this.searchSubscription?.unsubscribe();
    this.searching.set(true);
    this.searchResult.set(null);
    this.searchError.set(null);

    this.searchSubscription = this.cardsService.searchCard(name).subscribe({
      next: (card) => {
        this.searchResult.set(card);
        this.searching.set(false);
      },
      error: (error) => {
        this.searchError.set(apiErrorMessage(error, 'Não foi possível buscar cartas.'));
        this.searching.set(false);
      },
    });
  }

  protected addSearchResult(card: Card): void {
    this.addCopy({ externalId: card.id, name: card.name, imageUrl: card.imageUrl }, true);

    // Ready for the next name: the user can type right away.
    const input = this.searchInput()?.nativeElement;
    input?.focus();
    input?.select();
  }

  /** `notify` shows a success toast; the grid buttons skip it since the change is in view. */
  protected addCopy(card: CardRef, notify = false): void {
    if (this.busy()) {
      return;
    }
    this.pending.set({ externalId: card.externalId, action: 'add' });

    const snapshot = this.deck();
    const isNew = !this.deckCards().some((deckCard) => deckCard.externalId === card.externalId);
    this.changeQuantityLocally(card, 1);

    this.decksService.addCard(this.deckId, card.externalId).subscribe({
      next: () => {
        if (notify) {
          this.toasts.success(`"${card.name}" adicionada ao deck.`);
        }

        if (!isNew) {
          this.pending.set(null);
          return;
        }

        // Só o backend sabe o `id` interno da carta nova (usado no DELETE), então
        // recarrega em segundo plano. Mantém `pending` até lá para um segundo
        // clique não ser sobrescrito por essa resposta.
        this.decksService
          .getDeck(this.deckId)
          .pipe(
            retry({ count: 2, delay: 1000 }),
            finalize(() => this.pending.set(null)),
          )
          .subscribe({
            next: (deck) => this.deck.set(deck),
            error: () =>
              this.toasts.warning(
                `"${card.name}" foi adicionada, mas não foi possível atualizar o deck. Recarregue a página para editá-la.`,
              ),
          });
      },
      error: (error) => {
        this.deck.set(snapshot);
        this.toasts.error(apiErrorMessage(error, 'Não foi possível adicionar a carta.'));
        this.pending.set(null);
      },
    });
  }

  /** The backend removes one copy per request, deleting the entry at the last one. */
  protected removeCopy(card: DeckCard): void {
    if (this.busy() || this.isProvisional(card)) {
      return;
    }
    this.pending.set({ externalId: card.externalId, action: 'remove' });

    const snapshot = this.deck();
    const isLastCopy = card.quantity === 1;
    this.changeQuantityLocally(card, -1);

    this.decksService
      .removeCard(this.deckId, card.id)
      .pipe(finalize(() => this.pending.set(null)))
      .subscribe({
        next: () => {
          if (isLastCopy) {
            this.toasts.success(`"${card.name}" removida do deck.`);
          }
        },
        error: (error) => {
          this.deck.set(snapshot);
          this.toasts.error(
            apiErrorMessage(error, 'Não foi possível remover a carta.', {
              CARD_NOT_FOUND: 'Carta não encontrada.',
              CARD_NOT_IN_DECK: 'Essa carta não está mais no deck. Recarregue a página.',
            }),
          );
        },
      });
  }

  /**
   * A card added in this session still carries its external id as `id` until
   * the reload brings the internal one, so it can't be removed yet.
   */
  protected isProvisional(card: DeckCard): boolean {
    return card.id === card.externalId;
  }

  /** Optimistic update mirroring the backend: new entry, ±1 copy, or drop at zero. */
  private changeQuantityLocally(card: CardRef, delta: 1 | -1): void {
    this.deck.update((deck) => {
      if (!deck) {
        return deck;
      }

      const existing = deck.cards.some((deckCard) => deckCard.externalId === card.externalId);
      const cards: DeckCard[] = existing
        ? deck.cards
            .map((deckCard) =>
              deckCard.externalId === card.externalId
                ? { ...deckCard, quantity: deckCard.quantity + delta }
                : deckCard,
            )
            .filter((deckCard) => deckCard.quantity > 0)
        : [
            ...deck.cards,
            // `id` provisório até o reload trazer o id interno.
            { id: card.externalId, externalId: card.externalId, name: card.name, imageUrl: card.imageUrl, quantity: 1 },
          ];

      return { ...deck, cards };
    });
  }

  private loadDeck(): void {
    this.loadError.set(null);

    this.decksService.getDeck(this.deckId).subscribe({
      next: (deck) => {
        this.deck.set(deck);
        this.loading.set(false);
      },
      error: (error) => {
        this.loadError.set(apiErrorMessage(error, 'Não foi possível carregar o deck.'));
        this.loading.set(false);
      },
    });
  }
}
