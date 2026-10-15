import { Component, inject, output, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideGlobe, LucideLock } from '@lucide/angular';
import { DeckVisibility, UpdateDeckPayload } from '../../../../../core/models/deck.model';
import { Dialog } from '../../../../../shared/dialog/dialog';
import { Toasts } from '../../../../../shared/toast/toasts';
import { DeckStore } from '../../state/deck-store';

/** Match the backend columns (VARCHAR(120) and the description CHECK). */
const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 2000;

/** Name, format, visibility and description. Saves only what changed. */
@Component({
  selector: 'app-deck-settings-dialog',
  imports: [Dialog, ReactiveFormsModule, LucideLock, LucideGlobe],
  templateUrl: './deck-settings-dialog.html',
})
export class DeckSettingsDialog {
  private readonly store = inject(DeckStore);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(Toasts);

  readonly closed = output<void>();
  private readonly dialog = viewChild.required(Dialog);

  protected readonly nameMaxLength = NAME_MAX_LENGTH;
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
  protected readonly formats = this.store.rules().formats;

  private readonly deck = this.store.deck()!;

  protected readonly form = this.fb.nonNullable.group({
    // The pattern rejects names made only of whitespace.
    name: [
      this.deck.name,
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(NAME_MAX_LENGTH)],
    ],
    format: [this.deck.format ?? ''],
    visibility: [this.deck.visibility as DeckVisibility],
    description: [this.deck.description ?? '', Validators.maxLength(DESCRIPTION_MAX_LENGTH)],
  });

  protected readonly visibilities: { id: DeckVisibility; label: string; hint: string }[] = [
    { id: 'private', label: 'Privado', hint: 'Só você vê.' },
    { id: 'public', label: 'Público', hint: 'Aparece no Explorar e qualquer um abre pelo link.' },
  ];

  protected cancel(): void {
    this.dialog().close();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, format, visibility, description } = this.form.getRawValue();
    const changes: UpdateDeckPayload = {};
    if (name.trim() !== this.deck.name) changes.name = name.trim();
    if ((format || null) !== this.deck.format) changes.format = format || null;
    if (visibility !== this.deck.visibility) changes.visibility = visibility;
    if ((description.trim() || null) !== this.deck.description)
      changes.description = description.trim() || null;

    // The store shows the change right away and rolls it back if the API refuses.
    if (Object.keys(changes).length > 0) {
      void this.store
        .update(changes)
        .then((deck) => deck && this.toasts.success('Deck atualizado.'));
    }
    this.dialog().close();
  }
}
