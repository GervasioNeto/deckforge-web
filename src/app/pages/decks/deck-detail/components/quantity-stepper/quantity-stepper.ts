import { Component, computed, input, output } from '@angular/core';
import { LucideMinus, LucidePlus, LucideTrash } from '@lucide/angular';

export type StepperSize = 'sm' | 'md';

/** − quantity + for one card. At one copy, − turns into a trash can: the next click removes it. */
@Component({
  selector: 'app-quantity-stepper',
  imports: [LucideMinus, LucidePlus, LucideTrash],
  template: `
    <button
      type="button"
      (click)="$event.stopPropagation(); changed.emit(-1)"
      [disabled]="value() === 0"
      [attr.aria-label]="value() === 1 ? 'Remover ' + name() : 'Remover uma cópia de ' + name()"
      [title]="value() === 1 ? 'Remover' : 'Remover uma cópia'"
      class="flex items-center justify-center rounded-l-[inherit] text-text-muted transition-colors hover:bg-bg hover:text-purple disabled:pointer-events-none disabled:opacity-30"
      [class]="buttonSize()"
    >
      @if (value() === 1) {
        <svg lucideTrash [size]="iconSize()" />
      } @else {
        <svg lucideMinus [size]="iconSize()" />
      }
    </button>
    <span
      class="min-w-6 px-0.5 text-center font-medium tabular-nums text-text"
      [class]="size() === 'sm' ? 'text-xs' : 'text-sm'"
      aria-live="polite"
    >
      {{ value() }}
    </span>
    <button
      type="button"
      (click)="$event.stopPropagation(); changed.emit(1)"
      [attr.aria-label]="'Adicionar uma cópia de ' + name()"
      title="Adicionar uma cópia"
      class="flex items-center justify-center rounded-r-[inherit] text-text-muted transition-colors hover:bg-bg hover:text-cyan"
      [class]="buttonSize()"
    >
      <svg lucidePlus [size]="iconSize()" />
    </button>
  `,
  host: {
    class: 'inline-flex shrink-0 items-center rounded-md border border-border bg-surface',
  },
})
export class QuantityStepper {
  readonly value = input.required<number>();
  /** Card name, for the buttons' accessible labels. */
  readonly name = input.required<string>();
  readonly size = input<StepperSize>('md');
  readonly changed = output<-1 | 1>();

  protected readonly buttonSize = computed(() => (this.size() === 'sm' ? 'h-6 w-6' : 'h-8 w-8'));
  protected readonly iconSize = computed(() => (this.size() === 'sm' ? 13 : 15));
}
