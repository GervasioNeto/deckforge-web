import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../../core/auth/auth';

@Component({
  selector: 'app-sign-out-everywhere',
  templateUrl: './sign-out-everywhere.html',
})
export class SignOutEverywhere {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly confirming = signal(false);
  protected readonly loading = signal(false);

  async signOutEverywhere(): Promise<void> {
    this.loading.set(true);

    // Either way this browser is signed out, so both paths end on the login page.
    let reason = 'signed-out-everywhere';
    try {
      await this.auth.signOut('global');
    } catch {
      reason = 'signed-out-partial';
    }
    await this.router.navigate(['/login'], { queryParams: { reason } });
  }
}
