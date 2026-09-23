import { Component, OnInit, inject, signal } from '@angular/core';
import { AppUser } from '../../core/models/user.model';
import { UserService } from '../../core/services/user';

@Component({
  selector: 'app-perfil',
  imports: [],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit {
  private readonly userService = inject(UserService);

  protected readonly user = signal<AppUser | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.userService.getMe().subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar seu perfil.');
        this.loading.set(false);
      },
    });
  }
}
