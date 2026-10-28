import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { LucideCircleAlert, LucideLoaderCircle } from '@lucide/angular';
import { BOARD_SHORT_LABELS } from '../../../../../core/games/game-rules';
import { Board } from '../../../../../core/models/card.model';
import { Dialog } from '../../../../../shared/dialog/dialog';
import { Toasts } from '../../../../../shared/toast/toasts';
import { DECK_LIST_FORMATS } from '../../state/deck-list-formats';
import { DeckStore } from '../../state/deck-store';

/** Same cap as the API (POST /decks/:deckId/cards/import). */
const MAX_LINES = 250;

/**
 * Paste a list from another site (MTG Arena, Pokémon TCG Live...) to add it,
 * or to replace the whole deck. The text is read as it's typed, in the deck's
 * game format, so the user sees what was understood before sending.
 */
@Component({
  selector: 'app-import-dialog',
  imports: [Dialog, LucideCircleAlert, LucideLoaderCircle],
  templateUrl: './import-dialog.html',
})
export class ImportDialog {
  private readonly store = inject(DeckStore);
  private readonly toasts = inject(Toasts);

  readonly closed = output<void>();
  private readonly dialog = viewChild.required(Dialog);

  protected readonly format = DECK_LIST_FORMATS[this.store.deck()?.game ?? 'mtg'];
  protected readonly maxLines = MAX_LINES;
  protected readonly text = signal('');
  protected readonly replace = signal(false);
  protected readonly importing = signal(false);
  /** Names the API didn't recognize in the last import; shown instead of closing. */
  protected readonly notFound = signal<string[] | null>(null);

  protected readonly parsed = computed(() => this.format.parse(this.text()));
  protected readonly summary = computed(() => {
    const perBoard = new Map<Board, number>();
    for (const entry of this.parsed().entries) {
      perBoard.set(entry.board, (perBoard.get(entry.board) ?? 0) + entry.quantity);
    }
    return [...perBoard]
      .map(([board, count]) => `${count} ${BOARD_SHORT_LABELS[board].toLowerCase()}`)
      .join(' · ');
  });
  protected readonly tooMany = computed(() => this.parsed().entries.length > MAX_LINES);
  protected readonly canSubmit = computed(
    () => this.parsed().entries.length > 0 && !this.tooMany() && !this.importing(),
  );

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    this.importing.set(true);
    const result = await this.store.importList(this.parsed().entries, this.replace());
    this.importing.set(false);
    if (!result) return;

    const copies = result.imported === 1 ? 'carta importada' : 'cartas importadas';
    this.toasts.success(`${result.imported} ${copies}.`);
    if (result.notFound.length > 0) {
      this.notFound.set(result.notFound);
    } else {
      this.dialog().close();
    }
  }

  protected close(): void {
    this.dialog().close();
  }
}
