import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Auth } from '../../../core/auth/auth';
import { PublicDeck } from '../../../core/models/deck.model';
import { DecksExplore } from './decks-explore';

const DECKS: PublicDeck[] = [
  {
    id: 'deck-1',
    name: 'Dragões Vermelhos',
    game: 'mtg',
    visibility: 'public',
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    user: { id: 'user-1', name: 'Emerson' },
  },
  {
    id: 'deck-2',
    name: 'Água Turbulenta',
    game: 'pokemon',
    visibility: 'public',
    createdAt: '2026-09-20T12:00:00.000Z',
    updatedAt: '2026-09-20T12:00:00.000Z',
    user: { id: 'me', name: 'Gervásio' },
  },
];

describe('DecksExplore', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'explorar', component: DecksExplore }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // The real Auth talks to Supabase; the page only reads who is signed in.
        {
          provide: Auth,
          useValue: { currentUser: signal({ id: 'me' }), isAuthenticated: signal(true) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  /** Runs effects and change detection, without waiting on the request in flight. */
  function render(): void {
    TestBed.tick();
    harness.detectChanges();
  }

  function pendingRequest(): TestRequest {
    return http.expectOne((req) => req.url.endsWith('/decks/public'));
  }

  async function open(url: string): Promise<TestRequest> {
    await harness.navigateByUrl(url, DecksExplore);
    render();
    return pendingRequest();
  }

  /** rxResource takes in its first value on a microtask, so wait for it before rendering. */
  async function respond(req: TestRequest, ...args: Parameters<TestRequest['flush']>) {
    req.flush(...args);
    await harness.fixture.whenStable();
    render();
  }

  function page(): HTMLElement {
    return harness.routeNativeElement!;
  }

  function deckNames(): string[] {
    return Array.from(page().querySelectorAll('app-public-deck-card h2')).map((h2) =>
      h2.textContent!.trim(),
    );
  }

  function search(term: string): void {
    const input = page().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = term;
    input.dispatchEvent(new Event('input'));
    render();
  }

  it('lists public decks from every game', async () => {
    const req = await open('/explorar');
    expect(req.request.params.has('game')).toBe(false);

    await respond(req, DECKS);

    expect(deckNames()).toEqual(['Dragões Vermelhos', 'Água Turbulenta']);
    expect(page().textContent).toContain('2 decks públicos');
  });

  it('links every public deck and marks the signed-in user’s own', async () => {
    await respond(await open('/explorar'), DECKS);

    const links = [...page().querySelectorAll<HTMLAnchorElement>('app-public-deck-card a')];
    expect(links.map((link) => link.getAttribute('href')).sort()).toEqual([
      '/decks/deck-1',
      '/decks/deck-2',
    ]);
    expect(page().textContent).toContain('Seu deck');
  });

  it('passes the game from the URL to the API', async () => {
    const req = await open('/explorar?jogo=pokemon');
    expect(req.request.params.get('game')).toBe('pokemon');

    await respond(req, [DECKS[1]]);

    expect(page().textContent).toContain('1 deck público de Pokémon');
  });

  it('ignores an unknown game in the URL instead of sending it', async () => {
    const req = await open('/explorar?jogo=yugioh');
    expect(req.request.params.has('game')).toBe(false);
    await respond(req, []);
  });

  it('searches deck and author names ignoring case and accents', async () => {
    await respond(await open('/explorar'), DECKS);

    search('DRAGOES');
    expect(deckNames()).toEqual(['Dragões Vermelhos']);
    expect(page().textContent).toContain('1 de 2 decks');

    search('gervasio');
    expect(deckNames()).toEqual(['Água Turbulenta']);

    search('nada parecido');
    expect(deckNames()).toEqual([]);
    expect(page().textContent).toContain('Nenhum deck encontrado');
  });

  it('shows an empty state when no deck is public', async () => {
    await respond(await open('/explorar'), []);

    expect(page().textContent).toContain('Nenhum deck público ainda');
    expect(page().querySelector('a[href="/decks/novo"]')).not.toBeNull();
  });

  it('offers a retry when loading fails', async () => {
    await respond(await open('/explorar'), null, { status: 500, statusText: 'Server Error' });

    const alert = page().querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Não foi possível carregar os decks públicos.');

    alert.querySelector('button')!.click();
    render();
    await respond(pendingRequest(), DECKS);

    expect(page().querySelector('[role="alert"]')).toBeNull();
    expect(deckNames()).toHaveLength(2);
  });

  it('tells the user when the API is unreachable', async () => {
    const req = await open('/explorar');
    req.error(new ProgressEvent('error'), { status: 0 });
    await harness.fixture.whenStable();
    render();

    expect(page().querySelector('[role="alert"]')!.textContent).toContain(
      'Sem conexão com o servidor.',
    );
  });
});
