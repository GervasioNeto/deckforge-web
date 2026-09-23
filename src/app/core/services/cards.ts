import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Card } from '../models/card.model';

@Service()
export class Cards {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/cards`;

  searchCard(name: string): Observable<Card[]> {
    return this.http.get<Card[]>(this.baseUrl, { params: { name } });
  }
}
