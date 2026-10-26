import { Component, input, output, viewChild } from '@angular/core';
import { LucideLoaderCircle } from '@lucide/angular';
import { Dialog } from '../../../../../shared/dialog/dialog';

/** Asks before deleting; the parent does the deleting (and leaves the page). */
@Component({
  selector: 'app-delete-deck-dialog',
  imports: [Dialog, LucideLoaderCircle],
  template: `
    <app-dialog title="Excluir deck" size="sm" (closed)="closed.emit()">
      <p class="text-sm text-text-muted">
        <span class="font-medium text-text">{{ deckName() }}</span> e todas as cartas dele serão
        excluídos. Essa ação não pode ser desfeita.
      </p>

      <div dialogFooter class="contents">
        <button
          type="button"
          (click)="dialog().close()"
          [disabled]="deleting()"
          class="h-9 rounded-md px-3 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          (click)="confirmed.emit()"
          [disabled]="deleting()"
          class="inline-flex h-9 items-center gap-2 rounded-md bg-purple px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          @if (deleting()) {
            <svg lucideLoaderCircle [size]="15" class="animate-spin" />
            Excluindo...
          } @else {
            Excluir deck
          }
        </button>
      </div>
    </app-dialog>
  `,
})
export class DeleteDeckDialog {
  readonly deckName = input.required<string>();
  /** Set by the parent while the request runs. */
  readonly deleting = input(false);
  readonly closed = output<void>();
  readonly confirmed = output<void>();

  protected readonly dialog = viewChild.required(Dialog);
}
