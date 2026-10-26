import { DeckCard } from '../../../../core/models/card.model';
import { parseDeckList, serializeDeckList } from './deck-text';

describe('parseDeckList', () => {
  it('reads quantities, "x" and Arena set codes', () => {
    const { entries, invalidLines } = parseDeckList(
      [
        '4 Lightning Bolt',
        '2x Counterspell',
        '1 Fable of the Mirror-Breaker (NEO) 141',
        'Duress',
      ].join('\n'),
    );

    expect(invalidLines).toEqual([]);
    expect(entries).toEqual([
      { name: 'Lightning Bolt', quantity: 4, board: 'main' },
      { name: 'Counterspell', quantity: 2, board: 'main' },
      { name: 'Fable of the Mirror-Breaker', quantity: 1, board: 'main' },
      { name: 'Duress', quantity: 1, board: 'main' },
    ]);
  });

  it('switches boards on section headers', () => {
    const { entries } = parseDeckList(
      [
        'Commander',
        '1 Atraxa',
        '',
        'Deck',
        '1 Sol Ring',
        'Sideboard:',
        '2 Negate',
        'Maybeboard',
        '1 Opt',
      ].join('\n'),
    );

    expect(entries.map((entry) => entry.board)).toEqual(['commander', 'main', 'side', 'maybe']);
  });

  it('treats a blank line as the sideboard break in lists without headers', () => {
    const { entries } = parseDeckList('4 Island\n4 Opt\n\n2 Negate');

    expect(entries.map((entry) => entry.board)).toEqual(['main', 'main', 'side']);
  });

  it('accepts the "SB:" prefix and skips comments', () => {
    const { entries } = parseDeckList('// my deck\n# notes\n4 Island\nSB: 2 Negate');

    expect(entries).toEqual([
      { name: 'Island', quantity: 4, board: 'main' },
      { name: 'Negate', quantity: 2, board: 'side' },
    ]);
  });

  it('reports lines that are not cards', () => {
    expect(parseDeckList('4 Island\n12').invalidLines).toEqual([{ line: 2, text: '12' }]);
  });
});

describe('serializeDeckList', () => {
  const card = (name: string, board: DeckCard['board'], quantity: number) =>
    ({ name, board, quantity, setCode: 'neo', collectorNumber: '141' }) as DeckCard;

  const cards = [
    card('Opt', 'main', 4),
    card('Negate', 'side', 2),
    card('Island', 'main', 20),
    card('Pact', 'maybe', 1),
  ];

  it('writes sections in order, names sorted', () => {
    expect(serializeDeckList(cards, 'text')).toBe(
      'Deck\n20 Island\n4 Opt\n\nSideboard\n2 Negate\n\nMaybeboard\n1 Pact',
    );
  });

  it('adds set and number for MTG Arena and leaves the maybeboard out', () => {
    expect(serializeDeckList(cards, 'arena')).toBe(
      'Deck\n20 Island (NEO) 141\n4 Opt (NEO) 141\n\nSideboard\n2 Negate (NEO) 141',
    );
  });

  it('reads back what it writes', () => {
    const { entries } = parseDeckList(serializeDeckList(cards, 'text'));

    expect(entries).toHaveLength(4);
    expect(entries.find((entry) => entry.name === 'Pact')?.board).toBe('maybe');
  });
});
