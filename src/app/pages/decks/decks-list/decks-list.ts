import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Deck, GAME_LABELS, GameType, VISIBILITY_LABELS } from '../../../core/models/deck.model';
import { Decks } from '../../../core/services/decks';
import { formatFullDate, formatRelative } from '../../../core/utils/date-format';
import { Toasts } from '../../../shared/toast/toasts';
import { DeckCover, DeckStats } from './deck-cover/deck-cover';

type GameFilter = GameType | 'all';
type DeckSort = 'recent' | 'name';

const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

@Component({
  selector: 'app-decks-list',
  imports: [RouterLink, DeckCover],
  templateUrl: './decks-list.html',
})
export class DecksList implements OnInit {
  private readonly decksService = inject(Decks);
  private readonly toasts = inject(Toasts);

  protected readonly decks = signal<Deck[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly confirmingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  /**
   * Cover/count fetched by each DeckCover while the backend doesn't send them.
   * Kept here so a deck hidden and shown again by the filters isn't fetched twice.
   */
  protected readonly loadedStats = signal<Record<string, DeckStats>>({});

  protected readonly gameFilter = signal<GameFilter>('all');
  protected readonly query = signal('');
  protected readonly sort = signal<DeckSort>('recent');

  protected readonly gameLabels = GAME_LABELS;
  protected readonly visibilityLabels = VISIBILITY_LABELS;
  protected readonly skeletons = [1, 2, 3, 4];

  /** Filter tabs, each with how many decks it would show. */
  protected readonly gameTabs = computed(() => {
    const decks = this.decks();
    const count = (game: GameType) => decks.filter((deck) => deck.game === game).length;
    return [
      { value: 'all' as GameFilter, label: 'Todos', count: decks.length },
      { value: 'mtg' as GameFilter, label: GAME_LABELS.mtg, count: count('mtg') },
      { value: 'pokemon' as GameFilter, label: GAME_LABELS.pokemon, count: count('pokemon') },
    ];
  });

  protected readonly visibleDecks = computed(() => {
    const game = this.gameFilter();
    const query = this.query().trim().toLocaleLowerCase('pt-BR');

    const filtered = this.decks().filter(
      (deck) =>
        (game === 'all' || deck.game === game) &&
        (!query || deck.name.toLocaleLowerCase('pt-BR').includes(query)),
    );

    return this.sort() === 'name'
      ? filtered.sort((a, b) => nameCollator.compare(a.name, b.name))
      : filtered.sort((a, b) => lastActivity(b) - lastActivity(a));
  });

  protected readonly hasActiveFilters = computed(
    () => this.gameFilter() !== 'all' || this.query().trim() !== '',
  );

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

  protected cardCount(deck: Deck): number | undefined {
    return deck.cardCount ?? this.loadedStats()[deck.id]?.cardCount;
  }

  protected onStatsLoaded(deckId: string, stats: DeckStats): void {
    this.loadedStats.update((all) => ({ ...all, [deckId]: stats }));
  }

  protected clearFilters(): void {
    this.gameFilter.set('all');
    this.query.set('');
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
    this.confirmingDeleteId.set(deckId);
  }

  cancelRemoveDeck(): void {
    this.confirmingDeleteId.set(null);
  }

  removeDeck(deck: Deck): void {
    this.deletingId.set(deck.id);
    this.decksService.deleteDeck(deck.id).subscribe({
      next: () => {
        this.decks.update((decks) => decks.filter((d) => d.id !== deck.id));
        this.confirmingDeleteId.set(null);
        this.deletingId.set(null);
        this.toasts.success(`Deck "${deck.name}" excluído.`);
      },
      error: () => {
        this.toasts.error('Não foi possível excluir o deck. Tente novamente.');
        this.confirmingDeleteId.set(null);
        this.deletingId.set(null);
      },
    });
  }
}

function lastActivity(deck: Deck): number {
  const timestamp = deck.updatedAt ?? deck.createdAt;
  return timestamp ? new Date(timestamp).getTime() : 0;
}
