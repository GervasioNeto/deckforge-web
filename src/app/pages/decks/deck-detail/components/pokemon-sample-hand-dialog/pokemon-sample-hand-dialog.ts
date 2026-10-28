import { Component, computed, inject, output, signal } from '@angular/core';
import {
  LucideEye,
  LucideHand,
  LucidePlus,
  LucideRotateCcw,
  LucideShuffle,
  LucideTriangleAlert,
} from '@lucide/angular';
import { isBasicPokemon } from '../../../../../core/games/pokemon/pokemon-cards';
import { DeckCard } from '../../../../../core/models/card.model';
import { thumbnailUrl } from '../../../../../core/utils/card-image-url';
import { shuffle } from '../../../../../core/utils/shuffle';
import { CardImage } from '../../../../../shared/card-image/card-image';
import { Dialog } from '../../../../../shared/dialog/dialog';
import { DeckStore } from '../../state/deck-store';
import { OPENING_HAND, PRIZE_CARDS } from '../../state/pokemon-deck-analysis';

/**
 * Goldfish a Pokémon opening: draw 7; with no Basic Pokémon the rules force a
 * mulligan (shuffle and draw 7 again; the opponent may draw a card for each).
 * Once the hand is kept, the next 6 cards are the Prize cards, face down until
 * revealed, and draws come from what's left.
 */
@Component({
  selector: 'app-pokemon-sample-hand-dialog',
  imports: [
    Dialog,
    CardImage,
    LucideShuffle,
    LucideRotateCcw,
    LucidePlus,
    LucideHand,
    LucideEye,
    LucideTriangleAlert,
  ],
  templateUrl: './pokemon-sample-hand-dialog.html',
})
export class PokemonSampleHandDialog {
  private readonly store = inject(DeckStore);

  readonly closed = output<void>();

  /** One element per copy in the deck (the maybeboard stays out). */
  private readonly library = computed(() =>
    this.store
      .cards()
      .filter((card) => card.board === 'main')
      .flatMap((card) => Array.from({ length: card.quantity }, () => card)),
  );

  protected readonly order = signal<DeckCard[]>([]);
  /** Cards drawn after the opening 7. */
  protected readonly extraDraws = signal(0);
  protected readonly mulligans = signal(0);
  protected readonly prizesRevealed = signal(false);

  protected readonly enoughCards = computed(
    () => this.library().length >= OPENING_HAND + PRIZE_CARDS,
  );
  /** The opening 7, then draws from after the Prize cards. */
  protected readonly hand = computed(() => {
    const order = this.order();
    const drawsStart = OPENING_HAND + PRIZE_CARDS;
    return [
      ...order.slice(0, OPENING_HAND),
      ...order.slice(drawsStart, drawsStart + this.extraDraws()),
    ];
  });
  protected readonly prizes = computed(() =>
    this.order().slice(OPENING_HAND, OPENING_HAND + PRIZE_CARDS),
  );
  protected readonly remaining = computed(
    () => this.order().length - OPENING_HAND - PRIZE_CARDS - this.extraDraws(),
  );
  protected readonly hasBasic = computed(() =>
    this.order().slice(0, OPENING_HAND).some(isBasicPokemon),
  );

  protected readonly thumbnail = thumbnailUrl;

  constructor() {
    this.newHand();
  }

  protected newHand(): void {
    this.deal();
    this.mulligans.set(0);
  }

  protected mulligan(): void {
    this.deal();
    this.mulligans.update((count) => count + 1);
  }

  protected draw(): void {
    if (this.remaining() > 0) {
      this.extraDraws.update((count) => count + 1);
    }
  }

  private deal(): void {
    this.order.set(shuffle(this.library()));
    this.extraDraws.set(0);
    this.prizesRevealed.set(false);
  }
}
