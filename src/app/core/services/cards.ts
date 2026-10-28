import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Card, CardPrint, withCardDefaults } from '../models/card.model';
import { GameType } from '../models/deck.model';

/** Every route takes the game; the API looks Magic up on Scryfall and Pokémon on the Pokémon TCG API. */
@Service()
export class Cards {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/cards`;

  /** One card by name: fuzzy on Magic; exact on Pokémon, which answers the newest printing. */
  searchCard(name: string, game: GameType): Observable<Card> {
    return this.http
      .get<Card>(this.baseUrl, { params: { name, game } })
      .pipe(map((card) => withCardDefaults(card)));
  }

  /** Up to 20 card names matching what was typed; empty under 2 characters. */
  autocomplete(query: string, game: GameType): Observable<string[]> {
    return this.http
      .get<{ names: string[] }>(`${this.baseUrl}/autocomplete`, { params: { q: query, game } })
      .pipe(map((response) => response.names));
  }

  /** Every printing of a card (exact name), newest first. */
  searchPrints(name: string, game: GameType): Observable<CardPrint[]> {
    return this.http
      .get<{ prints: CardPrint[] }>(`${this.baseUrl}/search`, { params: { q: name, game } })
      .pipe(map((response) => response.prints));
  }
}
