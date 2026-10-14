import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Decks } from './decks';

describe('Decks', () => {
  let service: Decks;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Decks);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getPublicDecks', () => {
    const url = `${environment.apiBaseUrl}/decks/public`;

    it('lists every game when no filter is given', () => {
      service.getPublicDecks().subscribe();

      const req = http.expectOne(url);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      req.flush([]);
    });

    it('sends the game filter as a query param', () => {
      service.getPublicDecks('pokemon').subscribe();

      const req = http.expectOne((r) => r.url === url);
      expect(req.request.params.get('game')).toBe('pokemon');
      req.flush([]);
    });
  });
});
