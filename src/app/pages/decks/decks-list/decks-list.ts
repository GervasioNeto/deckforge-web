import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Deck, DeckVisibility, GameType } from '../../../core/models/deck.model';
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
  /** Errors from actions on a single deck; shown above the list without hiding it. */
  protected readonly actionError = signal<string | null>(null);
  protected readonly confirmingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly gameLabels: Record<GameType, string> = {
    mtg: 'Magic',
    pokemon: 'Pokémon',
  };

  protected readonly visibilityLabels: Record<DeckVisibility, string> = {
    public: 'Público',
    private: 'Privado',
  };

  private readonly relativeTime = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  /** "Editado há 2 dias", or "Criado ontem" while the deck was never edited. */
  protected activityLabel(deck: Deck): string | null {
    const timestamp = deck.updatedAt ?? deck.createdAt;
    if (!timestamp) {
      return null;
    }

    const edited = !!deck.updatedAt && deck.updatedAt !== deck.createdAt;
    const prefix = edited ? 'Editado' : 'Criado';
    return `${prefix} ${this.formatRelative(new Date(timestamp))}`;
  }

  private formatRelative(date: Date): string {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 60 * 60 * 24 * 365],
      ['month', 60 * 60 * 24 * 30],
      ['week', 60 * 60 * 24 * 7],
      ['day', 60 * 60 * 24],
      ['hour', 60 * 60],
      ['minute', 60],
    ];

    for (const [unit, unitSeconds] of units) {
      if (Math.abs(seconds) >= unitSeconds) {
        return this.relativeTime.format(Math.round(seconds / unitSeconds), unit);
      }
    }
    return 'agora mesmo';
  }

  private readonly fullDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  /** Absolute date for the activity tooltip, e.g. "26/09/2026, 14:03". */
  protected activityTitle(deck: Deck): string | null {
    const timestamp = deck.updatedAt ?? deck.createdAt;
    return timestamp ? this.fullDate.format(new Date(timestamp)) : null;
  }

  ngOnInit(): void {
    this.loadDecks();
  }

  loadDecks(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
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

  askRemoveDeck(deckId: string): void {
    this.actionError.set(null);
    this.confirmingDeleteId.set(deckId);
  }

  cancelRemoveDeck(): void {
    this.confirmingDeleteId.set(null);
  }

  removeDeck(deckId: string): void {
    this.deletingId.set(deckId);
    this.decksService.deleteDeck(deckId).subscribe({
      next: () => {
        this.decks.update((decks) => decks.filter((deck) => deck.id !== deckId));
        this.confirmingDeleteId.set(null);
        this.deletingId.set(null);
      },
      error: () => {
        this.actionError.set('Não foi possível remover o deck. Tente novamente.');
        this.confirmingDeleteId.set(null);
        this.deletingId.set(null);
      },
    });
  }
}
