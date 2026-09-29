import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { Deck, GAME_LABELS, GameType } from '../../core/models/deck.model';
import { AppUser } from '../../core/models/user.model';
import { Decks } from '../../core/services/decks';
import { UserService } from '../../core/services/user';
import { formatFullDate, formatLongDate, formatRelative } from '../../core/utils/date-format';
import { ChangePassword } from './change-password/change-password';
import { EditProfile, ProfileSaved } from './edit-profile/edit-profile';
import { SignOutEverywhere } from './sign-out-everywhere/sign-out-everywhere';

@Component({
  selector: 'app-perfil',
  imports: [RouterLink, ChangePassword, EditProfile, SignOutEverywhere],
  templateUrl: './perfil.html',
})
export class Perfil implements OnInit {
  private readonly userService = inject(UserService);
  private readonly decksService = inject(Decks);
  private readonly auth = inject(Auth);

  protected readonly user = signal<AppUser | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  /** Loaded separately so a failure here doesn't hide the profile. */
  protected readonly decks = signal<Deck[]>([]);
  protected readonly decksLoading = signal(true);
  protected readonly decksError = signal<string | null>(null);

  protected readonly gameLabels = GAME_LABELS;

  // Account metadata only lives in the Supabase session, not in GET /me.
  private readonly authUser = this.auth.currentUser;

  protected readonly initial = this.auth.initial;
  protected readonly displayName = this.auth.displayName;
  protected readonly pendingEmail = this.auth.pendingEmail;

  protected readonly editing = signal(false);
  protected readonly profileNotice = signal<string | null>(null);

  protected startEditing(): void {
    this.profileNotice.set(null);
    this.editing.set(true);
  }

  protected onProfileSaved({ newEmail }: ProfileSaved): void {
    this.editing.set(false);
    this.profileNotice.set(
      newEmail
        ? `Perfil salvo. Enviamos um link de confirmação para ${newEmail} (e pode ser preciso confirmar também no e-mail atual). O e-mail só muda depois disso.`
        : 'Perfil atualizado.',
    );
  }

  protected readonly memberSince = computed(() => {
    const createdAt = this.authUser()?.created_at;
    return createdAt ? formatLongDate(new Date(createdAt)) : null;
  });

  protected readonly lastSignIn = computed(() => {
    const lastSignInAt = this.authUser()?.last_sign_in_at;
    if (!lastSignInAt) {
      return null;
    }
    const date = new Date(lastSignInAt);
    return { label: formatRelative(date), title: formatFullDate(date) };
  });

  protected readonly emailConfirmed = computed(() => !!this.authUser()?.email_confirmed_at);

  protected readonly stats = computed(() => {
    const decks = this.decks();
    const withCount = decks.filter((deck) => deck.cardCount !== undefined);

    return {
      total: decks.length,
      public: decks.filter((deck) => deck.visibility === 'public').length,
      private: decks.filter((deck) => deck.visibility === 'private').length,
      byGame: (Object.keys(GAME_LABELS) as GameType[]).map((game) => ({
        game,
        count: decks.filter((deck) => deck.game === game).length,
      })),
      // Only meaningful once the backend sends cardCount for every deck.
      cards:
        withCount.length === decks.length
          ? withCount.reduce((sum, deck) => sum + (deck.cardCount ?? 0), 0)
          : null,
    };
  });

  ngOnInit(): void {
    this.loadProfile();
    this.loadDecks();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
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

  loadDecks(): void {
    this.decksLoading.set(true);
    this.decksError.set(null);
    this.decksService.getDecks().subscribe({
      next: (decks) => {
        this.decks.set(decks);
        this.decksLoading.set(false);
      },
      error: () => {
        this.decksError.set('Não foi possível carregar sua atividade.');
        this.decksLoading.set(false);
      },
    });
  }
}
