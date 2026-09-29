import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card } from '../../../core/models/card.model';
import { DeckWithCards } from '../../../core/models/deck.model';
import { Cards } from '../../../core/services/cards';
import { Decks } from '../../../core/services/decks';

@Component({
  selector: 'app-deck-detail',
  imports: [RouterLink, FormsModule],
  templateUrl: './deck-detail.html',
})
export class DeckDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly decksService = inject(Decks);
  private readonly cardsService = inject(Cards);

  protected readonly deckId = this.route.snapshot.paramMap.get('deckId')!;

  protected readonly deck = signal<DeckWithCards | null>(null);
  protected readonly deckCards = computed(() => this.deck()?.cards ?? []);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly searchResults = signal<Card[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly feedback = signal<string | null>(null);

  constructor() {
    this.loadDeck();
  }

  search(): void {
    const name = this.searchTerm().trim();
    if (!name) {
      return;
    }

    this.searching.set(true);
    this.searchError.set(null);

    this.cardsService.searchCard(name).subscribe({
      next: (cards) => {
        this.searchResults.set(cards);
        this.searching.set(false);
      },
      error: () => {
        this.searchError.set('Não foi possível buscar cartas.');
        this.searching.set(false);
      },
    });
  }

  addCard(card: Card): void {
    this.feedback.set(null);

    this.decksService.addCard(this.deckId, card.id).subscribe({
      next: () => {
        // Recarrega do backend: ele incrementa `quantity` quando a carta já
        // está no deck e é a fonte do `cardId` interno usado no DELETE.
        this.loadDeck();
        this.feedback.set(`"${card.name}" adicionada ao deck.`);
      },
      error: () => this.feedback.set('Não foi possível adicionar a carta.'),
    });
  }

  private loadDeck(): void {
    this.loadError.set(null);

    this.decksService.getDeck(this.deckId).subscribe({
      next: (deck) => {
        this.deck.set(deck);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Não foi possível carregar o deck.');
        this.loading.set(false);
      },
    });
  }
}
