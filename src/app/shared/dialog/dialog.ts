import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LucideX } from '@lucide/angular';

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const WIDTHS: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  /** Nearly the whole screen, for rows of cards that need to be read (e.g. a sample hand). */
  full: 'max-w-[90rem]',
};

let nextId = 0;

/**
 * Modal on the native <dialog>, which brings focus trapping, Esc to close and
 * the top layer for free. It opens as soon as it renders, so the parent shows
 * it with `@if` and hides it on `(closed)`:
 *
 *   @if (editing()) { <app-dialog title="..." (closed)="editing.set(false)">...</app-dialog> }
 *
 * Content after `[dialogFooter]` goes in the bottom bar (buttons).
 */
@Component({
  selector: 'app-dialog',
  imports: [LucideX],
  templateUrl: './dialog.html',
})
export class Dialog {
  readonly title = input.required<string>();
  /** Small line under the title. */
  readonly subtitle = input<string | null>(null);
  readonly size = input<DialogSize>('md');
  readonly closed = output<void>();

  protected readonly titleId = `dialog-title-${nextId++}`;
  protected readonly widthClass = computed(() => WIDTHS[this.size()]);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  /** A click whose target is the <dialog> itself landed on the backdrop. */
  protected onClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}
