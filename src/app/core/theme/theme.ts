import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';

export type ThemeName = 'light' | 'dark';

/** Also read by the inline script in index.html, which applies the theme before boot. */
const STORAGE_KEY = 'deckforge-theme';

function readStoredTheme(): ThemeName | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

@Service()
export class Theme {
  private readonly document = inject(DOCUMENT);
  // matchMedia is missing outside real browsers (e.g. jsdom in unit tests).
  private readonly lightQuery =
    typeof this.document.defaultView?.matchMedia === 'function'
      ? this.document.defaultView.matchMedia('(prefers-color-scheme: light)')
      : undefined;

  /** The user's explicit choice; null follows the OS setting. */
  private readonly chosen = signal<ThemeName | null>(readStoredTheme());
  private readonly system = signal<ThemeName>(this.lightQuery?.matches ? 'light' : 'dark');

  readonly theme = computed(() => this.chosen() ?? this.system());

  constructor() {
    this.lightQuery?.addEventListener('change', (event) =>
      this.system.set(event.matches ? 'light' : 'dark'),
    );

    effect(() => {
      this.document.documentElement.dataset['theme'] = this.theme();
    });
  }

  toggle(): void {
    const next: ThemeName = this.theme() === 'dark' ? 'light' : 'dark';
    this.chosen.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked (e.g. private mode): the choice lasts until reload.
    }
  }
}
