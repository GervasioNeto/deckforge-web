import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from '../../core/auth/auth';
import { authGuard } from '../../core/auth/auth-guard';
import { Theme } from '../../core/theme/theme';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-shell',
  templateUrl: './shell.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly auth = inject(Auth);
  protected readonly theme = inject(Theme);

  protected readonly menuOpen = signal(false);
  private readonly menuContainer = viewChild<ElementRef<HTMLElement>>('menuContainer');
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  private readonly currentUrl = signal(this.router.url);
  /** Highlights the avatar, since the profile link is hidden inside the menu. */
  protected readonly onProfilePage = computed(() => this.currentUrl().startsWith('/perfil'));

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.menuOpen.set(false);
      });

    this.auth.signedOutExternally.pipe(takeUntilDestroyed()).subscribe(() => {
      this.menuOpen.set(false);
      if (this.currentRouteRequiresAuth()) {
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.router.url, reason: 'signed-out' },
        });
      }
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    const container = this.menuContainer()?.nativeElement;
    if (this.menuOpen() && container && !container.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  /** Closes the menu when keyboard focus (Tab) leaves it. */
  protected onMenuFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    // A null target means a click on non-focusable content; onDocumentClick handles clicks.
    if (next && !this.menuContainer()?.nativeElement.contains(next)) {
      this.menuOpen.set(false);
    }
  }

  protected onEscape(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.menuButton()?.nativeElement.focus();
    }
  }

  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
    } finally {
      // The local session is gone even if the server call failed.
      this.router.navigateByUrl('/login');
    }
  }

  private currentRouteRequiresAuth(): boolean {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.pathFromRoot.some((r) => r.routeConfig?.canActivate?.includes(authGuard));
  }
}
