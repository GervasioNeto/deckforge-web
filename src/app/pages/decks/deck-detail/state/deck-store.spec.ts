import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { DeckCard } from '../../../../core/models/card.model';
import { DeckWithCards } from '../../../../core/models/deck.model';
import { Toasts } from '../../../../shared/toast/toasts';
import { DeckStore } from './deck-store';

const DECK_URL = `${environment.apiBaseUrl}/decks/deck-1`;
const CARD_URL = `${DECK_URL}/cards/card-1`;

function deckWith(quantity: number): DeckWithCards {
  return {
    id: 'deck-1',
    name: 'Teste',
    game: 'mtg',
    format: null,
    description: null,
    visibility: 'private',
    coverCardId: null,
    isOwner: true,
    author: { id: 'u1', name: 'Dono' },
    cards: [
      { id: 'card-1', externalId: 'ext-1', name: 'Opt', board: 'main', quantity } as DeckCard,
    ],
  };
}

describe('DeckStore', () => {
  let store: DeckStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DeckStore],
    });
    store = TestBed.inject(DeckStore);
    http = TestBed.inject(HttpTestingController);

    store.load('deck-1');
    http.expectOne(DECK_URL).flush(deckWith(2));
  });

  afterEach(() => http.verify());

  const quantity = () => store.cards()[0]?.quantity;
  const entry = () => store.entry('card-1', 'main')!;

  it('shows edits at once and sends them one at a time, in order', () => {
    store.setQuantity(entry(), 3);
    store.setQuantity(entry(), 4);
    expect(quantity()).toBe(4);
    expect(store.saving()).toBe(true);

    // Only the first request is in flight; the second waits for it.
    const first = http.expectOne((req) => req.url === CARD_URL);
    expect(first.request.body).toEqual({ quantity: 3 });
    first.flush(deckWith(3));
    // The first answer is already stale: the view keeps the newer edit.
    expect(quantity()).toBe(4);

    const second = http.expectOne((req) => req.url === CARD_URL);
    expect(second.request.body).toEqual({ quantity: 4 });
    second.flush(deckWith(4));

    expect(quantity()).toBe(4);
    expect(store.saving()).toBe(false);
  });

  it('goes back to what the API last confirmed when an edit fails', async () => {
    const result = store.setQuantity(entry(), 5);
    expect(quantity()).toBe(5);

    http
      .expectOne((req) => req.url === CARD_URL)
      .flush({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500, statusText: 'Error' });

    expect(await result).toBeNull();
    expect(quantity()).toBe(2);
  });

  it('removes the entry right away when its quantity drops to zero', () => {
    store.setQuantity(entry(), 0);
    expect(store.cards()).toEqual([]);

    const req = http.expectOne((r) => r.url === CARD_URL && r.params.get('board') === 'main');
    req.flush({ ...deckWith(0), cards: [] });
    expect(store.cards()).toEqual([]);
  });

  it('moves copies between boards optimistically', () => {
    store.move(entry(), 'side', 1);

    expect(store.entry('card-1', 'main')?.quantity).toBe(1);
    expect(store.entry('card-1', 'side')?.quantity).toBe(1);

    const req = http.expectOne(`${CARD_URL}/move`);
    expect(req.request.body).toEqual({ from: 'main', to: 'side', quantity: 1 });
    req.flush(deckWith(1));
  });

  describe('feedback', () => {
    let success: ReturnType<typeof vi.spyOn>;
    let error: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      const toasts = TestBed.inject(Toasts);
      success = vi.spyOn(toasts, 'success');
      error = vi.spyOn(toasts, 'error');
    });

    it('announces a removal once the API confirms it', async () => {
      const result = store.setQuantity(entry(), 0);
      expect(success).not.toHaveBeenCalled();

      http.expectOne((r) => r.url === CARD_URL).flush({ ...deckWith(0), cards: [] });
      await result;

      expect(success).toHaveBeenCalledWith('Opt removida do deck principal.');
    });

    it('stays quiet while the quantity only changes', async () => {
      const result = store.setQuantity(entry(), 3);
      http.expectOne((r) => r.url === CARD_URL).flush(deckWith(3));
      await result;

      expect(success).not.toHaveBeenCalled();
    });

    it('says where a card was moved, and how many copies when not all of them', async () => {
      const all = store.move(entry(), 'side');
      http.expectOne(`${CARD_URL}/move`).flush(deckWith(2));
      await all;
      expect(success).toHaveBeenLastCalledWith('Opt movida para o sideboard.');

      const one = store.move(entry(), 'maybe', 1);
      http.expectOne(`${CARD_URL}/move`).flush(deckWith(1));
      await one;
      expect(success).toHaveBeenLastCalledWith('1 cópia de Opt movida para o maybeboard.');
    });

    it('confirms a new cover', async () => {
      const result = store.setCover(entry());
      http.expectOne((r) => r.url === DECK_URL && r.method === 'PATCH').flush(deckWith(2));
      await result;

      expect(success).toHaveBeenCalledWith('Capa do deck atualizada.');
    });

    it('shows only the error when the API fails', async () => {
      const result = store.setQuantity(entry(), 0);
      http
        .expectOne((r) => r.url === CARD_URL)
        .flush({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500, statusText: 'Error' });
      await result;

      expect(error).toHaveBeenCalledWith('Não foi possível alterar a quantidade.');
      expect(success).not.toHaveBeenCalled();
    });
  });
});
