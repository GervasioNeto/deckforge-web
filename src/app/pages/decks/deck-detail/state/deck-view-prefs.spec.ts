import { TestBed } from '@angular/core/testing';
import { DeckViewPrefs } from './deck-view-prefs';

const STORAGE_KEY = 'deckforge-deck-view';

describe('DeckViewPrefs', () => {
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('reads the older format, from when only Magic had decks, as Magic choices', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: 'grid', grouping: 'color', sort: 'name' }),
    );

    const prefs = TestBed.inject(DeckViewPrefs);

    expect(prefs.mode()).toBe('grid');
    expect(prefs.grouping('mtg')).toBe('color');
    expect(prefs.sort('mtg')).toBe('name');
    expect(prefs.grouping('pokemon')).toBeUndefined();
  });

  it('keeps each game’s choice apart', () => {
    const prefs = TestBed.inject(DeckViewPrefs);

    prefs.setGrouping('pokemon', 'energy');
    prefs.setGrouping('mtg', 'cmc');

    expect(prefs.grouping('pokemon')).toBe('energy');
    expect(prefs.grouping('mtg')).toBe('cmc');
  });

  it('drops choices it no longer knows', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ grouping: { mtg: 'type', pokemon: 'shape', chess: 'type' } }),
    );

    const prefs = TestBed.inject(DeckViewPrefs);

    expect(prefs.grouping('mtg')).toBe('type');
    expect(prefs.grouping('pokemon')).toBeUndefined();
  });
});
