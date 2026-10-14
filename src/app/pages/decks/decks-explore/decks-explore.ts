import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Auth } from '../../../core/auth/auth';
import { GAME_LABELS, GameType, isGameType } from '../../../core/models/deck.model';
import { Decks } from '../../../core/services/decks';
import { GAME_ACCENTS } from '../../../core/theme/game-accents';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { normalizeForSearch } from '../../../core/utils/search';
import { DeckStack } from '../../../shared/deck-stack/deck-stack';
import { PublicDeckCard } from './public-deck-card/public-deck-card';

interface GameFilter {
  /** Also the `jogo` query param; null removes it. */
  game: GameType | null;
  label: string;
  dot: string;
  activeClass: string;
}

@Component({
  selector: 'app-decks-explore',
  imports: [RouterLink, FormsModule, DeckStack, PublicDeckCard],
  templateUrl: './decks-explore.html',
})
export class DecksExplore {
  private readonly route = inject(ActivatedRoute);
  private readonly decksService = inject(Decks);
  protected readonly auth = inject(Auth);

  protected readonly gameFilters: GameFilter[] = [
    { game: null, label: 'Todos', dot: 'bg-gradient-brand', activeClass: 'bg-text/10 text-text' },
    ...(Object.keys(GAME_LABELS) as GameType[]).map((game) => ({
      game,
      label: GAME_LABELS[game],
      dot: GAME_ACCENTS[game].fill,
      activeClass: GAME_ACCENTS[game].badge,
    })),
  ];

  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);

  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  /** Kept in the URL (?jogo=mtg) so a filtered view survives reloads and can be shared. */
  protected readonly game = computed(() => {
    const value = this.queryParams().get('jogo');
    // Unknown values fall back to "all" instead of making the API answer 400.
    return isGameType(value) ? value : null;
  });

  /** Filtered by the API. Switching games cancels the request still in flight. */
  protected readonly decks = rxResource({
    params: () => ({ game: this.game() }),
    stream: ({ params }) => this.decksService.getPublicDecks(params.game),
  });

  protected readonly loadError = computed(() => {
    const error = this.decks.error();
    return error ? apiErrorMessage(error, 'Não foi possível carregar os decks públicos.') : null;
  });

  /** The API has no text search, so this narrows the loaded decks on the client. */
  protected readonly searchTerm = signal('');

  /** Normalized once per response rather than on every keystroke. */
  private readonly searchIndex = computed(() =>
    (this.decks.hasValue() ? this.decks.value() : []).map((deck) => ({
      deck,
      text: normalizeForSearch(`${deck.name} ${deck.user.name}`),
    })),
  );

  protected readonly totalDecks = computed(() => this.searchIndex().length);

  protected readonly visibleDecks = computed(() => {
    const term = normalizeForSearch(this.searchTerm().trim());
    const entries = term
      ? this.searchIndex().filter((entry) => entry.text.includes(term))
      : this.searchIndex();
    return entries.map((entry) => entry.deck);
  });

  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  /** "12 decks públicos de Magic", or "3 de 12 decks" while searching. */
  protected readonly resultSummary = computed(() => {
    const total = this.totalDecks();
    const noun = total === 1 ? 'deck' : 'decks';

    if (this.searchTerm().trim()) {
      return `${this.visibleDecks().length} de ${total} ${noun}`;
    }

    const game = this.game();
    const suffix = game ? ` de ${GAME_LABELS[game]}` : '';
    return `${total} ${noun} ${total === 1 ? 'público' : 'públicos'}${suffix}`;
  });

  protected readonly emptyTitle = computed(() => {
    const game = this.game();
    return game ? `Nenhum deck público de ${GAME_LABELS[game]}` : 'Nenhum deck público ainda';
  });
}
