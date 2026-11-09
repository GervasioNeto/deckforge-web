import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { Toasts } from '../../../shared/toast/toasts';
import { DeckNew } from './deck-new';

@Component({ template: '' })
class DeckPage {}

describe('DeckNew', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let success: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'decks/novo', component: DeckNew },
          { path: 'decks/:deckId', component: DeckPage },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    success = vi.spyOn(TestBed.inject(Toasts), 'success');
    harness = await RouterTestingHarness.create('/decks/novo');
  });

  afterEach(() => http.verify());

  function page(): HTMLElement {
    return harness.routeNativeElement!;
  }

  function submit(name: string): void {
    const input = page().querySelector<HTMLInputElement>('input[formControlName="name"]')!;
    input.value = name;
    input.dispatchEvent(new Event('input'));
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  it('confirms the new deck and opens it', async () => {
    submit('  Dragões  ');

    const req = http.expectOne(`${environment.apiBaseUrl}/decks`);
    expect(req.request.body.name).toBe('Dragões');
    req.flush({ id: 'deck-9', name: 'Dragões', game: 'mtg', visibility: 'private' });
    await harness.fixture.whenStable();

    expect(success).toHaveBeenCalledWith('Deck "Dragões" criado.');
    expect(TestBed.inject(Location).path()).toBe('/decks/deck-9');
  });

  it('keeps the form with an error instead of a toast when it fails', async () => {
    submit('Dragões');

    http
      .expectOne(`${environment.apiBaseUrl}/decks`)
      .flush({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500, statusText: 'Error' });
    harness.detectChanges();

    expect(success).not.toHaveBeenCalled();
    expect(page().textContent).toContain('Não foi possível criar o deck.');
  });
});
