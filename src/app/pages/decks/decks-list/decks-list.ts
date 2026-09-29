import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Deck, GAME_LABELS, VISIBILITY_LABELS } from '../../../core/models/deck.model';
import { Decks } from '../../../core/services/decks';
import { formatFullDate, formatRelative } from '../../../core/utils/date-format';

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

  protected readonly gameLabels = GAME_LABELS;
  protected readonly visibilityLabels = VISIBILITY_LABELS;

  /** "Editado há 2 dias", or "Criado ontem" while the deck was never edited. */
  protected activityLabel(deck: Deck): string | null {
    const timestamp = deck.updatedAt ?? deck.createdAt;
    if (!timestamp) {
      return null;
    }

    const edited = !!deck.updatedAt && deck.updatedAt !== deck.createdAt;
    const prefix = edited ? 'Editado' : 'Criado';
    return `${prefix} ${formatRelative(new Date(timestamp))}`;
  }

  /** Absolute date for the activity tooltip, e.g. "26/09/2026, 14:03". */
  protected activityTitle(deck: Deck): string | null {
    const timestamp = deck.updatedAt ?? deck.createdAt;
    return timestamp ? formatFullDate(new Date(timestamp)) : null;
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
