import { Component, booleanAttribute, computed, input, linkedSignal } from '@angular/core';

/**
 * A card scan at the real card proportions (63 × 88 mm) and corner radius. While
 * it loads, or when there is no image, it shows a frame with the card's name, so
 * stacks and grids never collapse or jump.
 */
@Component({
  selector: 'app-card-image',
  template: `
    @if (url(); as url) {
      <img
        [src]="url"
        [alt]="decorative() ? '' : name()"
        [attr.loading]="eager() ? null : 'lazy'"
        decoding="async"
        draggable="false"
        (load)="loaded.set(true)"
        (error)="failed.set(true)"
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
        [class.opacity-0]="!loaded()"
      />
    }
    @if (!url() || !loaded()) {
      <div
        class="card-frame absolute inset-0 flex flex-col p-[6%] text-left"
        [class.animate-pulse]="!!url()"
        [attr.aria-hidden]="url() ? 'true' : null"
      >
        <span class="truncate text-[11px] font-semibold text-text">{{ name() }}</span>
        @if (typeLine()) {
          <span class="mt-auto truncate text-[10px] text-card-frame-text">{{ typeLine() }}</span>
        }
      </div>
    }
  `,
  host: {
    class: 'relative block aspect-[63/88] overflow-hidden rounded-[4.75%/3.4%] bg-surface',
  },
})
export class CardImage {
  readonly src = input<string | null | undefined>(null);
  readonly name = input.required<string>();
  readonly typeLine = input<string | null | undefined>(null);
  /** Above the fold (e.g. a dialog): skip lazy loading. */
  readonly eager = input(false, { transform: booleanAttribute });
  /** The name is already next to the image, so screen readers skip it. */
  readonly decorative = input(false, { transform: booleanAttribute });

  /** Reset whenever the source changes (e.g. flipping a double-faced card). */
  protected readonly loaded = linkedSignal({ source: this.src, computation: () => false });
  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });

  protected readonly url = computed(() => (this.failed() ? null : this.src() || null));
}
