import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/auth/auth';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-shell',
  templateUrl: './shell.html',
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly auth = inject(Auth);

  async logout(): Promise<void> {
    await this.auth.signOut();
    this.router.navigateByUrl('/login');
  }
}
