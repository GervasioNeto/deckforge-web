import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateDeckPayload, Deck } from '../models/deck.model';

@Service()
export class Decks {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/decks`;

  getDecks(): Observable<Deck[]> {
    return this.http.get<Deck[]>(this.baseUrl);
  }

  getDeck(deckId: string): Observable<Deck> {
    return this.http.get<Deck>(`${this.baseUrl}/${deckId}`);
  }

  createDeck(payload: CreateDeckPayload): Observable<Deck> {
    return this.http.post<Deck>(this.baseUrl, payload);
  }

  deleteDeck(deckId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${deckId}`);
  }

  addCard(deckId: string, externalId: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${deckId}/cards`, { externalId });
  }

  removeCard(deckId: string, cardId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${deckId}/cards/${cardId}`);
  }
}
