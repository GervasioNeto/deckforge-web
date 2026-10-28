import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideFileUp, LucideSearchX } from '@lucide/angular';
import { distinctUntilChanged, map, skip } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import { GroupingId, SortId, countsTowardDeck } from '../../../core/games/game-rules';
import { formatLabel } from '../../../core/games/games';
import { deckColors } from '../../../core/games/mtg/mtg-rules';
import { TYPE_NAMES } from '../../../core/games/pokemon/energy';
import { kindLabel } from '../../../core/games/pokemon/pokemon-cards';
import { DeckCard, PokemonType } from '../../../core/models/card.model';
import { GameType } from '../../../core/models/deck.model';
import { normalizeForSearch } from '../../../core/utils/search';
import { Toasts } from '../../../shared/toast/toasts';
import { CardDialog } from './components/card-dialog/card-dialog';
import { CardPreview } from './components/card-preview/card-preview';
import { CardSearch } from './components/card-search/card-search';
import { DeckGridView } from './components/deck-grid-view/deck-grid-view';
import { DeckAction, DeckHeader } from './components/deck-header/deck-header';
import { DeckIssues } from './components/deck-issues/deck-issues';
import { DeckListView } from './components/deck-list-view/deck-list-view';
import { DeckSettingsDialog } from './components/deck-settings-dialog/deck-settings-dialog';
import { DeckStacksView } from './components/deck-stacks-view/deck-stacks-view';
import { DeckStats } from './components/deck-stats/deck-stats';
import { DeckToolbar } from './components/deck-toolbar/deck-toolbar';
import { DeleteDeckDialog } from './components/delete-deck-dialog/delete-deck-dialog';
import { ExportDialog } from './components/export-dialog/export-dialog';
import { ImportDialog } from './components/import-dialog/import-dialog';
import { PokemonDeckStats } from './components/pokemon-deck-stats/pokemon-deck-stats';
import { PokemonSampleHandDialog } from './components/pokemon-sample-hand-dialog/pokemon-sample-hand-dialog';
import { SampleHandDialog } from './components/sample-hand-dialog/sample-hand-dialog';
import { analyzeDeck } from './state/deck-analysis';
import { buildSections } from './state/deck-sections';
import { DeckStore } from './state/deck-store';
import { DeckViewPrefs } from './state/deck-view-prefs';
import { HeaderStat, mtgHeaderStats, pokemonHeaderStats } from './state/header-stats';
import { analyzePokemonDeck } from './state/pokemon-deck-analysis';

type DeckDialog = 'settings' | 'import' | 'export' | 'hand' | 'delete';

@Component({
  selector: 'app-deck-detail',
  imports: [
    RouterLink,
    DeckHeader,
    DeckIssues,
    DeckToolbar,
    CardSearch,
    DeckListView,
    DeckStacksView,
    DeckGridView,
    DeckStats,
    PokemonDeckStats,
    CardPreview,
    CardDialog,
    DeckSettingsDialog,
    ImportDialog,
    ExportDialog,
    SampleHandDialog,
    PokemonSampleHandDialog,
    DeleteDeckDialog,
    LucideFileUp,
    LucideSearchX,
  ],
  providers: [DeckStore],
  templateUrl: './deck-detail.html',
})
export class DeckDetail {
  protected readonly store = inject(DeckStore);
  protected readonly prefs = inject(DeckViewPrefs);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly toasts = inject(Toasts);

  protected readonly deck = this.store.deck;
  protected readonly rules = this.store.rules;

  protected readonly game = computed<GameType>(() => this.deck()?.game ?? 'mtg');

  /** The game's saved grouping, unless it no longer offers it; else its default. */
  protected readonly grouping = computed<GroupingId>(() => {
    const saved = this.prefs.grouping(this.game());
    const { groupings } = this.rules();
    return groupings.some((option) => option.id === saved) ? saved! : groupings[0].id;
  });
  protected readonly sort = computed<SortId>(() => {
    const saved = this.prefs.sort(this.game());
    const { sorts } = this.rules();
    return sorts.some((option) => option.id === saved) ? saved! : sorts[0].id;
  });
  protected readonly boards = computed(() => this.rules().boards(this.deck()?.format ?? null));
  protected readonly formatName = computed(() => {
    const deck = this.deck();
    return deck ? formatLabel(deck.game, deck.format) : '';
  });

  protected readonly filter = signal('');
  private readonly visibleCards = computed(() => {
    const term = normalizeForSearch(this.filter().trim());
    const cards = this.store.cards();
    if (!term) return cards;
    const isPokemon = this.game() === 'pokemon';
    return cards.filter((card) => {
      // Pokémon cards also match their kind and types in Portuguese ("apoiador", "fogo").
      const extra = isPokemon
        ? `${kindLabel(card)} ${card.types.map((type) => TYPE_NAMES[type]).join(' ')}`
        : '';
      return normalizeForSearch(`${card.name} ${card.typeLine} ${extra}`).includes(term);
    });
  });

  protected readonly sections = computed(() =>
    buildSections(this.visibleCards(), this.rules(), {
      boards: this.boards(),
      grouping: this.grouping(),
      sort: this.sort(),
    }),
  );
  protected readonly isEmpty = computed(() => this.store.cards().length === 0);
  protected readonly noMatches = computed(
    () => !this.isEmpty() && this.sections().every((section) => section.count === 0),
  );

  /** Each game reads its deck its own way: Magic's curve and colors, Pokémon's split and odds. */
  protected readonly mtgAnalysis = computed(() =>
    this.game() === 'mtg' ? analyzeDeck(this.store.cards(), this.rules()) : null,
  );
  protected readonly pokemonAnalysis = computed(() =>
    this.game() === 'pokemon' ? analyzePokemonDeck(this.store.cards()) : null,
  );
  protected readonly headerStats = computed<HeaderStat[]>(() => {
    const mtg = this.mtgAnalysis();
    const pokemon = this.pokemonAnalysis();
    return mtg ? mtgHeaderStats(mtg) : pokemon ? pokemonHeaderStats(pokemon) : [];
  });
  protected readonly validation = computed(() =>
    this.rules().validate(this.store.cards(), this.deck()?.format ?? null),
  );
  protected readonly colors = computed(() =>
    this.game() === 'mtg' ? deckColors(this.store.cards()) : [],
  );
  /** Pokémon: the deck's types, most played first (up to 4, like the colors of a Magic deck). */
  protected readonly energyTypes = computed<PokemonType[]>(() =>
    [...(this.pokemonAnalysis()?.types ?? [])]
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((entry) => entry.type),
  );

  /** The card under the pointer in the list view; else the cover, else the first card. */
  private readonly hovered = signal<DeckCard | null>(null);
  protected readonly previewCard = computed(() => {
    const cards = this.store.cards();
    const hovered = this.hovered();
    if (hovered && cards.some((card) => card.id === hovered.id)) return hovered;
    const coverId = this.deck()?.coverCardId;
    return (
      cards.find((card) => card.id === coverId) ??
      cards.find((card) => countsTowardDeck(card.board) && card.imageUrl) ??
      null
    );
  });

  protected readonly dialog = signal<DeckDialog | null>(null);
  /** Snapshot of the card whose details are open (it may leave the deck while open). */
  protected readonly inspected = signal<DeckCard | null>(null);
  protected readonly deleting = signal(false);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('deckId')!),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((deckId) => {
        // Duplicating navigates to the copy and reuses this component.
        this.dialog.set(null);
        this.inspected.set(null);
        this.hovered.set(null);
        this.filter.set('');
        this.store.load(deckId);
      });

    // Signing in or out changes what this deck shows (owner tools, private access).
    toObservable(computed(() => this.auth.currentUser()?.id ?? null))
      .pipe(skip(1), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.store.refresh());
  }

  protected onPreview(card: DeckCard): void {
    this.hovered.set(card);
  }

  protected onAction(action: DeckAction): void {
    switch (action) {
      case 'edit':
        this.dialog.set('settings');
        break;
      case 'import':
      case 'export':
      case 'hand':
      case 'delete':
        this.dialog.set(action);
        break;
      case 'duplicate':
        void this.duplicate();
        break;
      case 'share':
        void this.copyLink();
        break;
    }
  }

  protected async deleteDeck(): Promise<void> {
    const name = this.deck()?.name;
    this.deleting.set(true);
    const deleted = await this.store.deleteDeck();
    this.deleting.set(false);
    if (deleted) {
      this.dialog.set(null);
      this.toasts.success(`Deck "${name}" excluído.`);
      void this.router.navigate(['/decks']);
    }
  }

  private async duplicate(): Promise<void> {
    const copy = await this.store.duplicate();
    if (copy) {
      this.toasts.success(`Cópia criada: "${copy.name}".`);
      void this.router.navigate(['/decks', copy.id]);
    }
  }

  private async copyLink(): Promise<void> {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      if (this.deck()?.visibility === 'private') {
        this.toasts.warning('Link copiado. O deck é privado: só você consegue abri-lo.');
      } else {
        this.toasts.success('Link do deck copiado.');
      }
    } catch {
      this.toasts.error('Não foi possível copiar o link.');
    }
  }
}
