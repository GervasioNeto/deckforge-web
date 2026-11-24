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
import { UserProfile } from './user-profile';

/** As GET /users/:userId answers: the decks come without their author. */
const PROFILE = {
  id: 'user-1',
  name: 'Emerson',
  createdAt: '2026-09-26T12:00:00.000Z',
  decks: [
    {
      id: 'deck-1',
      name: 'Dragões Vermelhos',
      game: 'mtg',
      visibility: 'public',
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    },
    {
      id: 'deck-2',
      name: 'Água Turbulenta',
      game: 'pokemon',
      visibility: 'public',
      createdAt: '2026-09-28T12:00:00.000Z',
      updatedAt: '2026-09-28T12:00:00.000Z',
    },
  ],
};

describe('UserProfile', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  const currentUser = signal<{ id: string } | null>(null);

  beforeEach(async () => {
    currentUser.set(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'usuarios/:userId', component: UserProfile }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // The real Auth talks to Supabase; the page only reads who is signed in.
        { provide: Auth, useValue: { currentUser } },
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

  function pendingRequest(userId = 'user-1'): TestRequest {
    return http.expectOne((req) => req.url.endsWith(`/users/${userId}`));
  }

  async function open(userId = 'user-1'): Promise<TestRequest> {
    await harness.navigateByUrl(`/usuarios/${userId}`, UserProfile);
    render();
    return pendingRequest(userId);
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

  it('shows a skeleton while loading', async () => {
    const req = await open();

    expect(page().querySelector('[role="status"]')!.textContent).toContain('Carregando perfil');
    await respond(req, PROFILE);
  });

  it('shows the name, when they joined and their public decks', async () => {
    await respond(await open(), PROFILE);

    expect(page().querySelector('h1')!.textContent).toContain('Emerson');
    expect(page().textContent).toContain('Membro desde 26 de setembro de 2026');
    expect(page().textContent).toContain('2 decks públicos');
    expect(deckNames()).toEqual(['Dragões Vermelhos', 'Água Turbulenta']);
  });

  it('opens each deck, without linking the author back to this page', async () => {
    await respond(await open(), PROFILE);

    const links = [...page().querySelectorAll<HTMLAnchorElement>('app-public-deck-card a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/decks/deck-1',
      '/decks/deck-2',
    ]);
    expect(page().querySelector('app-public-deck-card')!.textContent).toContain('Emerson');
  });

  it('says so when the user has no public deck', async () => {
    await respond(await open(), { ...PROFILE, decks: [] });

    expect(page().textContent).toContain('Emerson ainda não tem decks públicos');
    expect(page().textContent).toContain('0 decks públicos');
  });

  it('tells an unknown user from a broken link the same way', async () => {
    await respond(await open('ghost'), { error: 'USER_NOT_FOUND' }, {
      status: 404,
      statusText: 'Not Found',
    });
    expect(page().textContent).toContain('Usuário não encontrado');
    expect(page().querySelector('a[href="/explorar"]')).not.toBeNull();

    await respond(await open('abc'), { error: 'INVALID_USER_ID' }, {
      status: 400,
      statusText: 'Bad Request',
    });
    expect(page().textContent).toContain('Usuário não encontrado');
  });

  it('offers a retry when loading fails', async () => {
    await respond(await open(), null, { status: 500, statusText: 'Server Error' });

    const alert = page().querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Não foi possível carregar o perfil.');

    alert.querySelector('button')!.click();
    render();
    await respond(pendingRequest(), PROFILE);

    expect(page().querySelector('[role="alert"]')).toBeNull();
    expect(deckNames()).toHaveLength(2);
  });

  it('points the signed-in user to their own profile settings', async () => {
    currentUser.set({ id: 'user-1' });
    await respond(await open(), PROFILE);

    expect(page().textContent).toContain('Este é o seu perfil público');
    expect(page().querySelector('a[href="/perfil"]')).not.toBeNull();
    expect(page().textContent).toContain('Seu deck');
  });

  it('invites the signed-in user to make a deck public when they have none', async () => {
    currentUser.set({ id: 'user-1' });
    await respond(await open(), { ...PROFILE, decks: [] });

    expect(page().textContent).toContain('Você ainda não tem decks públicos');
    expect(page().querySelector('a[href="/decks/novo"]')).not.toBeNull();
  });
});
