import { DOCUMENT, Location } from '@angular/common';
import { Component, InjectionToken, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { filter, map } from 'rxjs';

/**
 * Whether the tab's previous history entry is also this app, so going back
 * stays in it. The Navigation API only lists same-origin entries; browsers
 * without it answer `false`, and the button sticks to its fallback route.
 */
export const HAS_PREVIOUS_PAGE = new InjectionToken<() => boolean>('HAS_PREVIOUS_PAGE', {
  providedIn: 'root',
  factory: () => {
    const view: { navigation?: Navigation } | null = inject(DOCUMENT).defaultView;
    return () => view?.navigation?.canGoBack ?? false;
  },
});

/**
 * "← Voltar" at the top of a page. Coming from another page of the app, it goes
 * back to it, filters and scroll included. Opened from a shared link or a new
 * tab, it goes to `fallback` instead and names it ("← Meus Decks").
 */
@Component({
  selector: 'app-back-button',
  imports: [LucideArrowLeft],
  template: `
    <a
      [href]="href()"
      (click)="onClick($event)"
      class="group -mx-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-cyan"
    >
      <svg
        lucideArrowLeft
        [size]="15"
        class="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
      />
      {{ text() }}
    </a>
  `,
})
export class BackButton {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly hasPreviousPage = inject(HAS_PREVIOUS_PAGE);

  /** Names `fallback`; shown when there's no earlier page of the app to go back to. */
  readonly label = input.required<string>();
  /** Where to go without an earlier page, e.g. a deck opened from a shared link. */
  readonly fallback = input.required<string>();

  /** Rechecked after each navigation: a reused page (one deck to the next) keeps its button. */
  private readonly canGoBack = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.hasPreviousPage()),
    ),
    { initialValue: this.hasPreviousPage() },
  );

  protected readonly text = computed(() => (this.canGoBack() ? 'Voltar' : this.label()));
  /** The fallback, so Ctrl+click and "open in new tab" still land on a page. */
  protected readonly href = computed(() => this.location.prepareExternalUrl(this.fallback()));

  protected onClick(event: MouseEvent): void {
    // Ctrl/Cmd/Shift/Alt+click: let the browser open `href` in a new tab or window.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (this.canGoBack()) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(this.fallback());
    }
  }
}
