import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { DeckCard } from '../../../../core/models/card.model';
import { Deck } from '../../../../core/models/deck.model';
import { Decks } from '../../../../core/services/decks';
import { artCropFallback, toArtCrop } from '../../../../core/utils/scryfall-image';

export interface DeckStats {
  cardCount: number;
  coverImageUrl: string | null;
}

/**
 * Cover art for a deck in the list; also reports the card count to the parent.
 *
 * GET /api/decks sends `coverImageUrl`/`cardCount`, so normally no request is
 * made. Against an older backend without them, this fetches GET /api/decks/:id
 * per deck; the list renders it inside `@defer (on viewport)` so only decks
 * scrolled into view are fetched, and passes back `stats` it already has (e.g.
 * after a filter re-creates the card).
 */
@Component({
  selector: 'app-deck-cover',
  templateUrl: './deck-cover.html',
})
export class DeckCover implements OnInit {
  private readonly decksService = inject(Decks);

  readonly deck = input.required<Deck>();
  readonly stats = input<DeckStats>();
  readonly statsLoaded = output<DeckStats>();

  protected readonly loading = signal(true);
  protected readonly imageUrl = signal<string | null>(null);

  ngOnInit(): void {
    const deck = this.deck();
    const known =
      this.stats() ??
      (deck.cardCount !== undefined && deck.coverImageUrl !== undefined
        ? { cardCount: deck.cardCount, coverImageUrl: deck.coverImageUrl }
        : undefined);

    if (known) {
      this.showImage(known.coverImageUrl);
      return;
    }

    this.decksService.getDeck(deck.id).subscribe({
      next: ({ cards }) => {
        const stats: DeckStats = {
          cardCount: cards.reduce((sum, card) => sum + card.quantity, 0),
          coverImageUrl: pickCoverImage(cards),
        };
        this.statsLoaded.emit(stats);
        this.showImage(stats.coverImageUrl);
      },
      // The fallback cover is enough; the list itself already loaded.
      error: () => this.showImage(null),
    });
  }

  /** Art crop failed (or isn't a Scryfall URL): fall back to the full card, then to no image. */
  protected onImageError(): void {
    this.imageUrl.set(artCropFallback(this.imageUrl()));
  }

  private showImage(url: string | null): void {
    this.imageUrl.set(url ? toArtCrop(url) : null);
    this.loading.set(false);
  }
}

/** The card with the most copies, skipping cards without an image (e.g. double-faced ones today). */
function pickCoverImage(cards: DeckCard[]): string | null {
  let best: DeckCard | null = null;
  for (const card of cards) {
    if (card.imageUrl && (!best || card.quantity > best.quantity)) {
      best = card;
    }
  }
  return best?.imageUrl ?? null;
}
