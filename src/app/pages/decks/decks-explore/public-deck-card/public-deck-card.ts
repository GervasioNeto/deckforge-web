import { Component, computed, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_LABELS, PublicDeck } from '../../../../core/models/deck.model';
import { GAME_ACCENTS } from '../../../../core/theme/game-accents';
import { formatFullDate, formatRelative } from '../../../../core/utils/date-format';
import { artCropFallback, toArtCrop } from '../../../../core/utils/scryfall-image';
import { DeckStack } from '../../../../shared/deck-stack/deck-stack';

@Component({
  selector: 'app-public-deck-card',
  imports: [RouterLink, DeckStack],
  templateUrl: './public-deck-card.html',
  host: { class: 'block h-full' },
})
export class PublicDeckCard {
  readonly deck = input.required<PublicDeck>();
  /** The signed-in user's own deck, badged "Seu deck". Every public deck opens its detail page. */
  readonly owned = input(false);
  /** The author's name opens their profile; off on that profile, where it would lead back. */
  readonly linkAuthor = input(true);

  protected readonly accent = computed(() => GAME_ACCENTS[this.deck().game]);
  protected readonly gameLabel = computed(() => GAME_LABELS[this.deck().game]);
  protected readonly authorInitial = computed(
    () => this.deck().user.name.trim().charAt(0).toUpperCase() || '?',
  );

  protected readonly cover = linkedSignal(() => {
    const url = this.deck().coverImageUrl;
    return url ? toArtCrop(url) : null;
  });

  /** Art crop failed: back to the full card, then to the placeholder stack. */
  protected onCoverError(): void {
    this.cover.set(artCropFallback(this.cover()));
  }

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
