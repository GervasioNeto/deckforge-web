import { Component, computed, inject, output, signal } from '@angular/core';
import { LucideHand, LucidePlus, LucideRotateCcw, LucideShuffle } from '@lucide/angular';
import { DeckCard } from '../../../../../core/models/card.model';
import { CardImage } from '../../../../../shared/card-image/card-image';
import { Dialog } from '../../../../../shared/dialog/dialog';
import { DeckStore } from '../../state/deck-store';

const HAND_SIZE = 7;

/** Fisher–Yates with crypto randomness, so hands aren't biased. */
function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  const random = new Uint32Array(result.length);
  crypto.getRandomValues(random);
  for (let i = result.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Goldfish an opening hand: draw 7 from the main deck, take a mulligan (London
 * rule: draw 7 again, then bottom one card per mulligan) or keep drawing.
 */
@Component({
  selector: 'app-sample-hand-dialog',
  imports: [Dialog, CardImage, LucideShuffle, LucideRotateCcw, LucidePlus, LucideHand],
  templateUrl: './sample-hand-dialog.html',
})
export class SampleHandDialog {
  private readonly store = inject(DeckStore);

  readonly closed = output<void>();

  /** One element per copy in the main deck (the commander stays in the command zone). */
  private readonly library = computed(() =>
    this.store
      .cards()
      .filter((card) => card.board === 'main')
      .flatMap((card) => Array.from({ length: card.quantity }, () => card)),
  );

  protected readonly order = signal<DeckCard[]>([]);
  protected readonly drawn = signal(HAND_SIZE);
  protected readonly mulligans = signal(0);

  protected readonly hand = computed(() => this.order().slice(0, this.drawn()));
  protected readonly remaining = computed(() => this.order().length - this.drawn());
  protected readonly enoughCards = computed(() => this.library().length >= HAND_SIZE);

  constructor() {
    this.newHand();
  }

  protected newHand(): void {
    this.order.set(shuffle(this.library()));
    this.drawn.set(Math.min(HAND_SIZE, this.library().length));
    this.mulligans.set(0);
  }

  protected mulligan(): void {
    this.order.set(shuffle(this.library()));
    this.drawn.set(Math.min(HAND_SIZE, this.library().length));
    this.mulligans.update((count) => count + 1);
  }

  protected draw(): void {
    if (this.remaining() > 0) {
      this.drawn.update((count) => count + 1);
    }
  }
}
