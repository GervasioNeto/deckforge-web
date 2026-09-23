import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Deck } from '../../../core/models/deck.model';
import { Decks } from '../../../core/services/decks';

@Component({
  selector: 'app-decks-list',
  imports: [RouterLink],
  templateUrl: './decks-list.html',
})
export class DecksList implements OnInit {
  private readonly decksService = inject(Decks);

  protected readonly decks = signal<Deck[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.decksService.getDecks().subscribe({
      next: (decks) => {
        this.decks.set(decks);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar seus decks.');
        this.loading.set(false);
      },
    });
  }

  removeDeck(deckId: string): void {
    this.decksService.deleteDeck(deckId).subscribe({
      next: () => this.decks.update((decks) => decks.filter((deck) => deck.id !== deckId)),
      error: () => this.errorMessage.set('Não foi possível remover o deck.'),
    });
  }
}
