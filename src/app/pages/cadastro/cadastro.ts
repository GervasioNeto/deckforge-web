import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { authErrorMessage } from '../../core/auth/auth-errors';
import { Toasts } from '../../shared/toast/toasts';

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cadastro.html',
})
export class Cadastro {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly success = signal(false);

  protected readonly nameMaxLength = 60;

  protected readonly form = this.fb.nonNullable.group({
    // The pattern rejects names made only of whitespace.
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(this.nameMaxLength)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const { name, email, password } = this.form.getRawValue();
      const signedIn = await this.auth.signUp(name.trim(), email, password);
      if (signedIn) {
        this.toasts.success('Conta criada. Bem-vindo ao DeckForge!');
        await this.router.navigateByUrl('/decks');
      } else {
        this.success.set(true);
      }
    } catch (error) {
      this.errorMessage.set(authErrorMessage(error, 'Não foi possível cadastrar.'));
    } finally {
      this.loading.set(false);
    }
  }
}
