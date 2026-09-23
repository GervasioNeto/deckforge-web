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

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
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

    this.decksService.createDeck({ name, game, visibility }).subscribe({
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
