import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DeckVisibility, GameType } from '../../../core/models/deck.model';
import { Decks } from '../../../core/services/decks';

@Component({
  selector: 'app-deck-new',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './deck-new.html',
})
export class DeckNew {
  private readonly fb = inject(FormBuilder);
  private readonly decksService = inject(Decks);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Matches the backend column (Deck.name is VARCHAR(120)). */
  protected readonly nameMaxLength = 120;

  protected readonly form = this.fb.nonNullable.group({
    // The pattern rejects names made only of whitespace.
    name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(this.nameMaxLength)]],
    game: ['mtg' as GameType, Validators.required],
    visibility: ['private' as DeckVisibility],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { name, game, visibility } = this.form.getRawValue();

    this.decksService.createDeck({ name: name.trim(), game, visibility }).subscribe({
      next: (deck) => {
        this.router.navigate(['/decks', deck.id]);
      },
      error: () => {
        this.errorMessage.set('Não foi possível criar o deck.');
        this.loading.set(false);
      },
    });
  }
}
