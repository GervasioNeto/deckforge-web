import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Auth } from '../../../core/auth/auth';
import { authErrorMessage } from '../../../core/auth/auth-errors';

const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordsMismatch: true };
};

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule],
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly success = signal(false);

  /** Same rule as the sign-up form. */
  protected readonly minLength = 6;

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(this.minLength)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.success.set(false);

    try {
      await this.auth.updatePassword(this.form.getRawValue().password);
      this.form.reset();
      this.success.set(true);
    } catch (error) {
      this.errorMessage.set(authErrorMessage(error, 'Não foi possível alterar a senha.'));
    } finally {
      this.loading.set(false);
    }
  }
}
