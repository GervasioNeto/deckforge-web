import { Component, computed, input } from '@angular/core';
import { GameType } from '../../core/models/deck.model';
import { GAME_ACCENTS } from '../../core/theme/game-accents';

/**
 * Decorative stack of three sleeved card backs, standing in for deck art the API
 * doesn't send. It fans out while hovering the closest `.group` ancestor.
 */
@Component({
  selector: 'app-deck-stack',
  templateUrl: './deck-stack.html',
  host: {
    'aria-hidden': 'true',
    class: 'grid w-fit items-end justify-items-center',
  },
})
export class DeckStack {
  /** Tints the emblem with the game's accent; null draws empty, dashed outlines. */
  readonly game = input<GameType | null>(null);

  protected readonly accent = computed(() => {
    const game = this.game();
    return game ? GAME_ACCENTS[game] : null;
  });
}
