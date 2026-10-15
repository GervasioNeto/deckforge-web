import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GAME_RULES } from '../../../core/games/games';
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
    // Empty = casual (no format).
    format: [''],
    visibility: ['private' as DeckVisibility],
  });

  private readonly game = toSignal(this.form.controls.game.valueChanges, {
    initialValue: this.form.controls.game.value,
  });
  /** Formats of the chosen game (Magic and Pokémon have different ones). */
  protected readonly formats = computed(() => GAME_RULES[this.game()].formats);

  constructor() {
    // A format of the other game would be rejected by the API.
    this.form.controls.game.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.format.setValue(''));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { name, game, format, visibility } = this.form.getRawValue();

    this.decksService
      .createDeck({ name: name.trim(), game, format: format || null, visibility })
      .subscribe({
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
