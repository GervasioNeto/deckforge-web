import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { LucideCheck, LucideCopy, LucideDownload, LucideTriangleAlert } from '@lucide/angular';
import { Dialog } from '../../../../../shared/dialog/dialog';
import { Toasts } from '../../../../../shared/toast/toasts';
import { DECK_LIST_FORMATS } from '../../state/deck-list-formats';
import { ExportStyle } from '../../state/deck-text';
import { DeckStore } from '../../state/deck-store';

/** "Dimir Combo!" → "dimir-combo", for the downloaded file. */
function fileName(deckName: string): string {
  const slug = deckName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'deck'}.txt`;
}

/**
 * The deck as text, in its game's formats (MTG Arena, Pokémon TCG Live...),
 * to copy into another site or app, or save as a file.
 */
@Component({
  selector: 'app-export-dialog',
  imports: [Dialog, LucideCopy, LucideCheck, LucideDownload, LucideTriangleAlert],
  templateUrl: './export-dialog.html',
})
export class ExportDialog {
  protected readonly store = inject(DeckStore);
  private readonly toasts = inject(Toasts);

  readonly closed = output<void>();
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('output');

  private readonly format = DECK_LIST_FORMATS[this.store.deck()?.game ?? 'mtg'];
  protected readonly styles = this.format.styles;
  protected readonly style = signal<ExportStyle>(this.styles[0].id);
  protected readonly copied = signal(false);
  protected readonly text = computed(() => this.format.serialize(this.store.cards(), this.style()));

  /** Lines the chosen style can't write fully, e.g. cards without a set code for Live. */
  protected readonly incomplete = computed(
    () => this.format.incomplete?.(this.store.cards(), this.style()) ?? [],
  );

  protected setStyle(style: ExportStyle): void {
    this.style.set(style);
    this.copied.set(false);
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text());
      this.copied.set(true);
      this.toasts.success('Lista copiada.');
    } catch {
      // Clipboard blocked (permissions, insecure context): select it for Ctrl+C.
      this.textarea()?.nativeElement.select();
      this.toasts.warning('Não foi possível copiar. A lista está selecionada: use Ctrl+C.');
    }
  }

  protected download(): void {
    const blob = new Blob([this.text() + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName(this.store.deck()?.name ?? 'deck');
    link.click();
    URL.revokeObjectURL(url);
  }
}
