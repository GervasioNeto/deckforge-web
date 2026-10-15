import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Card } from '../models/card.model';

@Service()
export class Cards {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/cards`;

  searchCard(name: string): Observable<Card> {
    return this.http.get<Card>(this.baseUrl, { params: { name } });
  }

  /** Up to 20 card names matching what was typed; empty under 2 characters. */
  autocomplete(query: string): Observable<string[]> {
    return this.http
      .get<{ names: string[] }>(`${this.baseUrl}/autocomplete`, { params: { q: query } })
      .pipe(map((response) => response.names));
  }
}
