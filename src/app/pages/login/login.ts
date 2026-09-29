import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth';

const loginNotices: Record<string, string> = {
  expired: 'Sua sessão expirou. Entre novamente.',
  'signed-out': 'Sua sessão foi encerrada em outra aba ou dispositivo.',
  'signed-out-everywhere': 'Você saiu de todos os dispositivos.',
  'signed-out-partial':
    'Você saiu deste dispositivo, mas não conseguimos encerrar as outras sessões. Entre e tente novamente.',
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Why the user was sent here, from the `reason` query param set on redirects. */
  protected readonly notice =
    loginNotices[this.route.snapshot.queryParamMap.get('reason') ?? ''] ?? null;

  protected readonly form = this.fb.nonNullable.group({
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
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email, password);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/decks';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      this.loading.set(false);
    }
  }
}
