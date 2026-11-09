import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Deck } from '../models/deck.model';
import { AppUser, PublicProfile } from '../models/user.model';

@Service()
export class UserService {
  private readonly http = inject(HttpClient);

  getMe(): Observable<AppUser> {
    return this.http.get<AppUser>(`${environment.apiBaseUrl}/me`);
  }

  /**
   * Anyone's public profile, signed out too. The API sends the decks without
   * their author, so each gets the profile's, as GET /decks/public has it.
   */
  getProfile(userId: string): Observable<PublicProfile> {
    return this.http
      .get<Omit<PublicProfile, 'decks'> & { decks: Deck[] }>(
        `${environment.apiBaseUrl}/users/${encodeURIComponent(userId)}`,
      )
      .pipe(
        map((profile) => ({
          ...profile,
          decks: profile.decks.map((deck) => ({
            ...deck,
            user: { id: profile.id, name: profile.name },
          })),
        })),
      );
  }
}
