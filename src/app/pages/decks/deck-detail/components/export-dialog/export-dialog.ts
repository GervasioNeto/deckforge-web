import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { LucideCheck, LucideCopy, LucideDownload } from '@lucide/angular';
import { Dialog } from '../../../../../shared/dialog/dialog';
import { Toasts } from '../../../../../shared/toast/toasts';
import { ExportStyle, serializeDeckList } from '../../state/deck-text';
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

/** The deck as text, to copy into another site or MTG Arena, or save as a file. */
@Component({
  selector: 'app-export-dialog',
  imports: [Dialog, LucideCopy, LucideCheck, LucideDownload],
  templateUrl: './export-dialog.html',
})
export class ExportDialog {
  protected readonly store = inject(DeckStore);
  private readonly toasts = inject(Toasts);

  readonly closed = output<void>();
  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('output');

  protected readonly style = signal<ExportStyle>('text');
  protected readonly copied = signal(false);
  protected readonly text = computed(() => serializeDeckList(this.store.cards(), this.style()));

  protected readonly styles: { id: ExportStyle; label: string; hint: string }[] = [
    { id: 'text', label: 'Texto', hint: 'Quantidade e nome; funciona na maioria dos sites.' },
    {
      id: 'arena',
      label: 'MTG Arena',
      hint: 'Com edição e número, pronto para importar no Arena.',
    },
  ];

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
