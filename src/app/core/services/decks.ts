import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Board } from '../models/card.model';
import {
  AddCardPayload,
  CreateDeckPayload,
  Deck,
  DeckWithCards,
  GameType,
  ImportEntry,
  ImportResult,
  PublicDeck,
  UpdateDeckPayload,
} from '../models/deck.model';

/**
 * Every card mutation answers with the whole updated deck, so callers can
 * replace their state instead of patching it (or reloading to learn the
 * internal id of a card they just added).
 */
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

  /** The owner's deck, or anyone's public deck (signed out too). */
  getDeck(deckId: string): Observable<DeckWithCards> {
    return this.http.get<DeckWithCards>(`${this.baseUrl}/${deckId}`);
  }

  createDeck(payload: CreateDeckPayload): Observable<Deck> {
    return this.http.post<Deck>(this.baseUrl, payload);
  }

  updateDeck(deckId: string, changes: UpdateDeckPayload): Observable<DeckWithCards> {
    return this.http.patch<DeckWithCards>(`${this.baseUrl}/${deckId}`, changes);
  }

  deleteDeck(deckId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${deckId}`);
  }

  /** Copies an own or public deck into the signed-in user's decks, as private. */
  duplicateDeck(deckId: string): Observable<Deck> {
    return this.http.post<Deck>(`${this.baseUrl}/${deckId}/duplicate`, {});
  }

  /** Adds `quantity` copies (default 1) to `board` (default main). */
  addCard(deckId: string, payload: AddCardPayload): Observable<DeckWithCards> {
    return this.http.post<DeckWithCards>(`${this.baseUrl}/${deckId}/cards`, payload);
  }

  /** Exact number of copies in `board`; 0 takes the card out of it. */
  setCardQuantity(
    deckId: string,
    cardId: string,
    board: Board,
    quantity: number,
  ): Observable<DeckWithCards> {
    return this.http.patch<DeckWithCards>(
      `${this.baseUrl}/${deckId}/cards/${cardId}`,
      { quantity },
      { params: { board } },
    );
  }

  /** Moves `quantity` copies (default: all) between boards. */
  moveCard(
    deckId: string,
    cardId: string,
    move: { from: Board; to: Board; quantity?: number },
  ): Observable<DeckWithCards> {
    return this.http.post<DeckWithCards>(`${this.baseUrl}/${deckId}/cards/${cardId}/move`, move);
  }

  /** Removes one copy from `board`, dropping the card at the last one. */
  removeCard(deckId: string, cardId: string, board: Board = 'main'): Observable<DeckWithCards> {
    return this.http.delete<DeckWithCards>(`${this.baseUrl}/${deckId}/cards/${cardId}`, {
      params: { board },
    });
  }

  /** Adds a pasted list; `replace` swaps the deck's whole content for it. */
  importCards(deckId: string, entries: ImportEntry[], replace: boolean): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.baseUrl}/${deckId}/cards/import`, {
      entries,
      replace,
    });
  }
}
