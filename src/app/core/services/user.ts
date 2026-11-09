import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Deck } from '../models/deck.model';
import { AppUser, PublicProfile, UserSearchResult } from '../models/user.model';

@Service()
export class UserService {
  private readonly http = inject(HttpClient);

  getMe(): Observable<AppUser> {
    return this.http.get<AppUser>(`${environment.apiBaseUrl}/me`);
  }

  /** The name other players see on the public profile and on the user's decks. */
  updateMe(name: string): Observable<AppUser> {
    return this.http.patch<AppUser>(`${environment.apiBaseUrl}/me`, { name });
  }

  /** Players whose name matches `query`. Works signed out. */
  searchUsers(query: string): Observable<UserSearchResult[]> {
    return this.http
      .get<{ users: UserSearchResult[] }>(`${environment.apiBaseUrl}/users/search`, {
        params: { q: query },
      })
      .pipe(map(({ users }) => users));
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
