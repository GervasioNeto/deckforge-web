import { DeckCard, withCardDefaults } from '../../../../core/models/card.model';
import {
  cardsWithoutPrinting,
  parsePokemonDeckList,
  readCardName,
  serializePokemonDeckList,
} from './pokemon-deck-text';

/** A whole list as Pokémon TCG Live exports it (a Gardevoir deck from a Regional, via Limitless). */
const LIVE_EXPORT = `Pokémon: 17
3 Ralts MEG 58
2 Kirlia MEG 59
2 Gardevoir ex SVI 86
3 Munkidori TWM 95
1 Drifloon SVI 89
1 Scream Tail PAR 86
1 Fezandipiti ex SFA 38
1 Lillie's Clefairy ex JTG 56
1 Mew ex MEW 151
1 Frillish WHT 44
1 Mega Diancie ex MEG 64

Trainer: 32
4 Iono PAL 185
4 Lillie's Determination MEG 119
4 Ultra Ball MEG 131
3 Earthen Vessel PAR 163
2 Arven SVI 166
2 Night Stretcher SFA 61
2 Nest Ball SVI 181
2 Rare Candy MEG 125
2 Bravery Charm PAL 173
1 Professor's Research JTG 155
1 Super Rod PAL 188
1 Counter Catcher PAR 160
1 Secret Box TWM 163
1 Technical Machine: Evolution PAR 178
1 Artazon PAL 171
1 Mystery Garden MEG 122

Energy: 11
8 Basic {P} Energy MEE 5
3 Basic {D} Energy MEE 7

Total Cards: 60`;

describe('parsePokemonDeckList', () => {
  it('reads a Pokémon TCG Live export, ignoring headers, set and number', () => {
    const { entries, invalidLines } = parsePokemonDeckList(LIVE_EXPORT);

    expect(invalidLines).toEqual([]);
    expect(entries).toHaveLength(29);
    expect(entries.reduce((sum, entry) => sum + entry.quantity, 0)).toBe(60);
    expect(entries.every((entry) => entry.board === 'main')).toBe(true);
    expect(entries.slice(0, 3)).toEqual([
      { name: 'Ralts', quantity: 3, board: 'main' },
      { name: 'Kirlia', quantity: 2, board: 'main' },
      { name: 'Gardevoir ex', quantity: 2, board: 'main' },
    ]);
  });

  it('keeps names with apostrophes, colons and suffixes whole', () => {
    const names = parsePokemonDeckList(LIVE_EXPORT).entries.map((entry) => entry.name);

    expect(names).toContain("Lillie's Clefairy ex");
    expect(names).toContain('Technical Machine: Evolution');
    expect(names).toContain('Mega Diancie ex');
  });

  it('turns basic Energy symbols into the names the API knows', () => {
    const energy = parsePokemonDeckList(LIVE_EXPORT).entries.slice(-2);

    expect(energy).toEqual([
      { name: 'Basic Psychic Energy', quantity: 8, board: 'main' },
      { name: 'Basic Darkness Energy', quantity: 3, board: 'main' },
    ]);
  });

  it('reads the older Pokémon TCG Online lists', () => {
    const { entries, invalidLines } = parsePokemonDeckList(
      [
        '****** Pokémon Trading Card Game Deck List ******',
        '',
        '##Pokémon - 2',
        '',
        '* 2 Pikachu SUM 28',
        '',
        '##Trainer Cards - 4',
        '',
        "* 4 Professor's Research SSH 178",
        '',
        '##Energy - 4',
        '',
        '* 4 Lightning Energy SUM 167',
        '',
        'Total Cards - 10',
      ].join('\n'),
    );

    expect(invalidLines).toEqual([]);
    expect(entries).toEqual([
      { name: 'Pikachu', quantity: 2, board: 'main' },
      { name: "Professor's Research", quantity: 4, board: 'main' },
      { name: 'Lightning Energy', quantity: 4, board: 'main' },
    ]);
  });

  it('accepts lines without set and number, "x" quantities and promo set codes', () => {
    const { entries } = parsePokemonDeckList('4x Pikachu ex\n1 Pikachu PR-SV 101\nPikachu V');

    expect(entries).toEqual([
      { name: 'Pikachu ex', quantity: 4, board: 'main' },
      { name: 'Pikachu', quantity: 1, board: 'main' },
      { name: 'Pikachu V', quantity: 1, board: 'main' },
    ]);
  });

  it('reads set codes that start with a digit, and names with dots', () => {
    const { entries } = parsePokemonDeckList('4 Ultra Ball 30C 128\n3 Pokégear 3.0 BLK 84');

    expect(entries).toEqual([
      { name: 'Ultra Ball', quantity: 4, board: 'main' },
      { name: 'Pokégear 3.0', quantity: 3, board: 'main' },
    ]);
  });

  it('puts cards after a maybeboard header there, and reports lines that are not cards', () => {
    const { entries, invalidLines } = parsePokemonDeckList(
      "4 Iono PAL 185\nMaybeboard\n1 Boss's Orders PAL 172\n12",
    );

    expect(entries.map((entry) => entry.board)).toEqual(['main', 'maybe']);
    expect(invalidLines).toEqual([{ line: 4, text: '12' }]);
  });
});

describe('readCardName', () => {
  it('replaces every energy symbol', () => {
    expect(readCardName('Basic {L} Energy')).toBe('Basic Lightning Energy');
    expect(readCardName('Basic {M} Energy')).toBe('Basic Metal Energy');
    expect(readCardName('Iono')).toBe('Iono');
  });
});

let nextId = 0;

function card(overrides: Partial<DeckCard> & { name: string }): DeckCard {
  nextId++;
  return withCardDefaults({
    id: `card-${nextId}`,
    externalId: `ext-${nextId}`,
    board: 'main',
    quantity: 1,
    typeLine: '',
    rarity: null,
    setName: null,
    collectorNumber: null,
    imageUrl: null,
    legalities: {},
    ...overrides,
  }) as DeckCard;
}

describe('serializePokemonDeckList', () => {
  const deck = [
    card({
      name: 'Iono',
      quantity: 4,
      supertype: 'Trainer',
      subtypes: ['Supporter'],
      setCode: 'PAL',
      collectorNumber: '185',
    }),
    card({
      name: 'Kirlia',
      quantity: 2,
      supertype: 'Pokémon',
      subtypes: ['Stage 1'],
      evolvesFrom: 'Ralts',
      setCode: 'MEG',
      collectorNumber: '59',
    }),
    card({
      name: 'Ralts',
      quantity: 3,
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      setCode: 'MEG',
      collectorNumber: '58',
    }),
    card({
      name: 'Basic Psychic Energy',
      quantity: 8,
      supertype: 'Energy',
      subtypes: ['Basic'],
      setCode: 'MEE',
      collectorNumber: '5',
    }),
    // An old printing: Live has no set code for it.
    card({
      name: 'Rare Candy',
      quantity: 2,
      supertype: 'Trainer',
      subtypes: ['Item'],
      collectorNumber: '82',
    }),
    card({
      name: 'Mew ex',
      board: 'maybe',
      supertype: 'Pokémon',
      subtypes: ['Basic', 'ex'],
      setCode: 'MEW',
      collectorNumber: '151',
    }),
  ];

  it('writes the Pokémon TCG Live format, which reads back the same', () => {
    const text = serializePokemonDeckList(deck, 'live');

    expect(text).toBe(
      [
        'Pokémon: 5',
        '3 Ralts MEG 58',
        '2 Kirlia MEG 59',
        '',
        'Trainer: 6',
        '4 Iono PAL 185',
        '2 Rare Candy',
        '',
        'Energy: 8',
        '8 Basic {P} Energy MEE 5',
        '',
        'Total Cards: 19',
      ].join('\n'),
    );
    expect(parsePokemonDeckList(text).entries.map((entry) => entry.name)).toEqual([
      'Ralts',
      'Kirlia',
      'Iono',
      'Rare Candy',
      'Basic Psychic Energy',
    ]);
  });

  it('writes names only in the text style, with the maybeboard at the end', () => {
    expect(serializePokemonDeckList(deck, 'text').split('\n\n').at(-1)).toBe(
      'Maybeboard\n1 Mew ex',
    );
  });

  it('lists the cards Live may not recognize', () => {
    expect(cardsWithoutPrinting(deck).map((card) => card.name)).toEqual(['Rare Candy']);
  });
});
