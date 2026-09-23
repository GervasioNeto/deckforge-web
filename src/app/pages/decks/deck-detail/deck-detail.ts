import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Card, DeckCard } from '../../../core/models/card.model';
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

  // GET /api/decks/:deckId ainda não existe (task #37 no backlog) — lista
  // de cartas do deck é mantida localmente até o backend entregar a rota.
  protected readonly deckCards = signal<DeckCard[]>([]);

  protected readonly searchTerm = signal('');
  protected readonly searchResults = signal<Card[]>([]);
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly feedback = signal<string | null>(null);

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
        this.deckCards.update((cards) => [
          ...cards,
          { cardId: card.id, externalId: card.id, name: card.name, imageUrl: card.imageUrl },
        ]);
        this.feedback.set(`"${card.name}" adicionada ao deck.`);
      },
      error: () => this.feedback.set('Não foi possível adicionar a carta.'),
    });
  }
}
