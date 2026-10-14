import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateDeckPayload, Deck, DeckWithCards, GameType, PublicDeck } from '../models/deck.model';

@Service()
export class Decks {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/decks`;

  getDecks(): Observable<Deck[]> {
    return this.http.get<Deck[]>(this.baseUrl);
  }

  /** Public decks from every user, newest first. Works signed out. */
  getPublicDecks(game?: GameType | null): Observable<PublicDeck[]> {
    return this.http.get<PublicDeck[]>(`${this.baseUrl}/public`, {
      params: game ? { game } : {},
    });
  }

  getDeck(deckId: string): Observable<DeckWithCards> {
    return this.http.get<DeckWithCards>(`${this.baseUrl}/${deckId}`);
  }

  createDeck(payload: CreateDeckPayload): Observable<Deck> {
    return this.http.post<Deck>(this.baseUrl, payload);
  }

  deleteDeck(deckId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${deckId}`);
  }

  addCard(deckId: string, externalId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${deckId}/cards`, { externalId });
  }

  removeCard(deckId: string, cardId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${deckId}/cards/${cardId}`);
  }
}
