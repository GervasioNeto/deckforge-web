import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import { authErrorMessage } from '../../../core/auth/auth-errors';
import { UserService } from '../../../core/services/user';

export interface ProfileSaved {
  /** Set when an e-mail change was requested and awaits confirmation. */
  newEmail: string | null;
}

@Component({
  selector: 'app-edit-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-profile.html',
})
export class EditProfile {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly userService = inject(UserService);

  readonly saved = output<ProfileSaved>();
  readonly cancelled = output<void>();

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly nameMaxLength = 60;

  private readonly currentEmail = this.auth.currentUser()?.email ?? '';

  protected readonly form = this.fb.nonNullable.group({
    // The pattern rejects names made only of whitespace.
    displayName: [
      this.auth.displayName() ?? '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(this.nameMaxLength)],
    ],
    email: [this.currentEmail, [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const displayName = this.form.controls.displayName.value.trim();
    const email = this.form.controls.email.value.trim().toLowerCase();
    const emailChanged = email !== this.currentEmail.toLowerCase();

    try {
      // The API first: it holds the name other players see, so a failure there changes nothing.
      await firstValueFrom(this.userService.updateMe(displayName));
      await this.auth.updateProfile({ displayName, email: emailChanged ? email : undefined });
      this.saved.emit({ newEmail: emailChanged ? email : null });
    } catch (error) {
      this.errorMessage.set(authErrorMessage(error, 'Não foi possível salvar as alterações.'));
      this.loading.set(false);
    }
  }
}
