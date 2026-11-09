import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Auth } from '../../../core/auth/auth';
import { UserService } from '../../../core/services/user';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { formatFullDate, formatLongDate } from '../../../core/utils/date-format';
import { DeckStack } from '../../../shared/deck-stack/deck-stack';
import { PublicDeckCard } from '../../decks/decks-explore/public-deck-card/public-deck-card';

/**
 * Someone's public profile: name, when they joined and their public decks
 * (never the private ones, even on your own profile). Opens signed out too.
 */
@Component({
  selector: 'app-user-profile',
  imports: [RouterLink, DeckStack, PublicDeckCard],
  templateUrl: './user-profile.html',
})
export class UserProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly userService = inject(UserService);
  private readonly auth = inject(Auth);

  protected readonly skeletons = Array.from({ length: 4 }, (_, i) => i);

  /** From the URL, so going from one profile to another loads the new one. */
  private readonly userId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('userId')!)),
    { requireSync: true },
  );

  protected readonly profile = rxResource({
    params: () => this.userId(),
    stream: ({ params }) => this.userService.getProfile(params),
  });

  /** 404 for an unknown user, 400 for an id that isn't one: the same to whoever followed the link. */
  protected readonly notFound = computed(() => {
    const error = this.profile.error();
    return error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
  });

  protected readonly loadError = computed(() => {
    const error = this.profile.error();
    return error && !this.notFound()
      ? apiErrorMessage(error, 'Não foi possível carregar o perfil.')
      : null;
  });

  protected readonly isMe = computed(
    () => this.profile.hasValue() && this.auth.currentUser()?.id === this.profile.value().id,
  );

  protected readonly initial = computed(() =>
    this.profile.hasValue() ? this.profile.value().name.trim().charAt(0).toUpperCase() || '?' : '?',
  );

  /** "26 de setembro de 2026", with date and time for the tooltip. */
  protected readonly joinedAt = computed(() => {
    if (!this.profile.hasValue()) {
      return null;
    }
    const timestamp = this.profile.value().createdAt;
    const date = new Date(timestamp);
    return { iso: timestamp, label: formatLongDate(date), title: formatFullDate(date) };
  });

  protected readonly deckSummary = computed(() => {
    const total = this.profile.hasValue() ? this.profile.value().decks.length : 0;
    return `${total} ${total === 1 ? 'deck público' : 'decks públicos'}`;
  });
}
