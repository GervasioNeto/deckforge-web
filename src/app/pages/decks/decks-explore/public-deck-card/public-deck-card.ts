import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_LABELS, PublicDeck } from '../../../../core/models/deck.model';
import { GAME_ACCENTS } from '../../../../core/theme/game-accents';
import { formatFullDate, formatRelative } from '../../../../core/utils/date-format';
import { DeckStack } from '../../../../shared/deck-stack/deck-stack';

@Component({
  selector: 'app-public-deck-card',
  imports: [RouterLink, DeckStack],
  templateUrl: './public-deck-card.html',
  host: { class: 'block h-full' },
})
export class PublicDeckCard {
  readonly deck = input.required<PublicDeck>();
  /**
   * The signed-in user's own deck. Only these link anywhere: GET /decks/:deckId
   * serves the owner alone, and there is no public detail route yet.
   */
  readonly owned = input(false);

  protected readonly accent = computed(() => GAME_ACCENTS[this.deck().game]);
  protected readonly gameLabel = computed(() => GAME_LABELS[this.deck().game]);
  protected readonly authorInitial = computed(
    () => this.deck().user.name.trim().charAt(0).toUpperCase() || '?',
  );

  /** "há 2 dias", with the absolute date for the tooltip. */
  protected readonly createdAt = computed(() => {
    const timestamp = this.deck().createdAt;
    if (!timestamp) {
      return null;
    }
    const date = new Date(timestamp);
    return { iso: timestamp, label: formatRelative(date), title: formatFullDate(date) };
  });
}
