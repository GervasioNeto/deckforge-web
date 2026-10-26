import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import {
  LucideArrowRightLeft,
  LucideExternalLink,
  LucideImage,
  LucideRefreshCw,
  LucideTriangleAlert,
} from '@lucide/angular';
import { BOARD_LABELS } from '../../../../../core/games/game-rules';
import { Board, DeckCard, Legality } from '../../../../../core/models/card.model';
import { CardImage } from '../../../../../shared/card-image/card-image';
import { Dialog } from '../../../../../shared/dialog/dialog';
import { ManaCost } from '../../../../../shared/mana-cost/mana-cost';
import { RulesText } from '../../../../../shared/rules-text/rules-text';
import { DeckStore } from '../../state/deck-store';
import { QuantityStepper } from '../quantity-stepper/quantity-stepper';

const RARITY_LABELS: Record<string, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  mythic: 'Mítica',
  special: 'Especial',
  bonus: 'Bônus',
};

const LEGALITY: Record<Legality, { label: string; dot: string }> = {
  legal: { label: 'Legal', dot: 'bg-cyan' },
  restricted: { label: 'Restrita', dot: 'bg-warning' },
  banned: { label: 'Banida', dot: 'bg-purple' },
  not_legal: { label: 'Não legal', dot: 'bg-text-muted/40' },
};

/**
 * Everything about one card, and (for the owner) how many copies sit in each
 * board. Opened from any view; it reads quantities live from the store, so it
 * stays right while edits are saving, and still works after the last copy is
 * removed (to put it back).
 */
@Component({
  selector: 'app-card-dialog',
  imports: [
    Dialog,
    CardImage,
    ManaCost,
    RulesText,
    QuantityStepper,
    LucideArrowRightLeft,
    LucideExternalLink,
    LucideImage,
    LucideRefreshCw,
    LucideTriangleAlert,
  ],
  templateUrl: './card-dialog.html',
})
export class CardDialog {
  protected readonly store = inject(DeckStore);

  /** The entry it was opened from; card details don't change while open. */
  readonly card = input.required<DeckCard>();
  readonly issue = input<string | undefined>(undefined);
  readonly closed = output<void>();

  private readonly dialog = viewChild.required(Dialog);

  protected readonly showBack = signal(false);
  /** The `normal` scan the views already loaded, so it shows at once. */
  protected readonly image = computed(() => {
    const { imageUrl, backImageUrl } = this.card();
    return this.showBack() && backImageUrl ? backImageUrl : imageUrl;
  });

  protected readonly boards = computed(() =>
    this.store.rules().boards(this.store.deck()?.format ?? null),
  );

  /** Copies per board, live. */
  protected readonly placements = computed(() => {
    const card = this.card();
    return this.boards().map((board) => ({
      board,
      label: BOARD_LABELS[board],
      entry: this.store.entry(card.id, board),
    }));
  });

  protected readonly inDeck = computed(() =>
    this.placements().some((placement) => placement.entry),
  );
  protected readonly isCover = computed(() => this.store.deck()?.coverCardId === this.card().id);

  protected readonly meta = computed(() => {
    const card = this.card();
    return {
      set: [
        card.setName,
        card.setCode && card.collectorNumber
          ? `${card.setCode.toUpperCase()} #${card.collectorNumber}`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      rarity: card.rarity ? (RARITY_LABELS[card.rarity] ?? card.rarity) : null,
      stats: card.loyalty
        ? `Lealdade ${card.loyalty}`
        : card.power !== null && card.toughness !== null
          ? `${card.power}/${card.toughness}`
          : null,
    };
  });

  protected readonly legalities = computed(() => {
    const legalities = this.card().legalities;
    return this.store.rules().formats.map((format) => {
      const status = legalities[format.id] ?? 'not_legal';
      return {
        id: format.id,
        format: format.label,
        status: LEGALITY[status].label,
        dot: LEGALITY[status].dot,
      };
    });
  });

  protected change(board: Board, delta: number): void {
    this.store.changeQuantity(this.card(), board, delta);
  }

  /** "Mover…" select: moves every copy, then goes back to the placeholder. */
  protected onMove(from: DeckCard, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const to = select.value as Board;
    select.value = '';
    if (to) this.store.move(from, to);
  }

  protected setCover(): void {
    const entry = this.placements().find((placement) => placement.entry)?.entry;
    if (entry) this.store.setCover(entry);
  }

  close(): void {
    this.dialog().close();
  }
}
