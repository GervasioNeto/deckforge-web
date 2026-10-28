import { DeckCard, withCardDefaults } from '../../../../core/models/card.model';
import { analyzePokemonDeck, chanceAllPrized, chanceByFirstDraw } from './pokemon-deck-analysis';

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

/** 10 Basics (one of them an ex), 4 Stage 1, 12 Supporters, 22 Items, 12 Energy. */
function deck(): DeckCard[] {
  return [
    card({
      name: 'Pikachu',
      quantity: 4,
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      types: ['Lightning'],
    }),
    card({
      name: 'Raichu',
      quantity: 4,
      supertype: 'Pokémon',
      subtypes: ['Stage 1'],
      types: ['Lightning'],
      evolvesFrom: 'Pikachu',
    }),
    card({
      name: 'Mimikyu',
      quantity: 5,
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      types: ['Psychic'],
    }),
    card({
      name: 'Miraidon ex',
      quantity: 1,
      supertype: 'Pokémon',
      subtypes: ['Basic', 'ex'],
      types: ['Lightning'],
      rules: [
        'Pokémon ex rule: When your Pokémon ex is Knocked Out, your opponent takes 2 Prize cards.',
      ],
    }),
    card({ name: 'Iono', quantity: 4, supertype: 'Trainer', subtypes: ['Supporter'] }),
    card({ name: 'Arven', quantity: 4, supertype: 'Trainer', subtypes: ['Supporter'] }),
    card({ name: "Boss's Orders", quantity: 4, supertype: 'Trainer', subtypes: ['Supporter'] }),
    card({ name: 'Ultra Ball', quantity: 21, supertype: 'Trainer', subtypes: ['Item'] }),
    card({
      name: 'Prime Catcher',
      quantity: 1,
      supertype: 'Trainer',
      subtypes: ['Item', 'ACE SPEC'],
    }),
    card({
      name: 'Basic Lightning Energy',
      quantity: 10,
      supertype: 'Energy',
      subtypes: ['Basic'],
    }),
    card({ name: 'Jet Energy', quantity: 2, supertype: 'Energy', subtypes: ['Special'] }),
    card({
      name: 'Zapdos',
      quantity: 1,
      board: 'maybe',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
    }),
  ];
}

describe('analyzePokemonDeck', () => {
  it('splits the deck the way Pokémon lists are read', () => {
    const analysis = analyzePokemonDeck(deck());

    expect(analysis.deckCount).toBe(60);
    expect(analysis.maybeCount).toBe(1);
    expect(analysis.categories.map((row) => row.count)).toEqual([14, 34, 12]);
    expect(analysis.stages).toEqual([
      { key: 'basic', label: 'Básico', count: 10 },
      { key: 'stage1', label: 'Estágio 1', count: 4 },
    ]);
    expect(analysis.types.map((row) => [row.label, row.count])).toEqual([
      ['Elétrico', 9],
      ['Psíquico', 5],
    ]);
    expect(analysis.trainers.map((row) => [row.label, row.count])).toEqual([
      ['Apoiador', 12],
      ['Item', 22],
    ]);
    expect(analysis.aceSpecCount).toBe(1);
    expect(analysis.energies.map((row) => [row.label, row.count])).toEqual([
      ['Elétrico', 10],
      ['Especiais', 2],
    ]);
    expect(analysis.multiPrizeCount).toBe(1);
    expect(analysis.lines).toEqual([{ root: 'Pikachu', counts: [4, 4] }]);
  });

  it('works out the opening odds exactly', () => {
    const analysis = analyzePokemonDeck(deck());

    // Reference values from enumerating every opening (see the spec of chanceByFirstDraw).
    expect(analysis.basicCount).toBe(10);
    expect(analysis.mulliganChance).toBeCloseTo(0.2586292342975108, 12);
    expect(analysis.supporterChance).toBeCloseTo(0.8351666534305044, 12);
  });

  it('has no odds without a Basic or under 7 cards', () => {
    const noBasic = analyzePokemonDeck([
      card({ name: 'Iono', quantity: 60, supertype: 'Trainer', subtypes: ['Supporter'] }),
    ]);
    const tiny = analyzePokemonDeck([
      card({ name: 'Pikachu', quantity: 3, supertype: 'Pokémon', subtypes: ['Basic'] }),
    ]);

    expect(noBasic.mulliganChance).toBeNull();
    expect(noBasic.supporterChance).toBeNull();
    expect(tiny.mulliganChance).toBeNull();
  });
});

describe('chanceByFirstDraw', () => {
  // Checked against an exact enumeration of every 7-card hand with a Basic, then the 8th card.
  it('matches the exact odds once mulligans are accounted for', () => {
    expect(chanceByFirstDraw(60, 14, 8)).toBeCloseTo(0.6907699297298522, 12);
    expect(chanceByFirstDraw(60, 1, 0)).toBe(0);
  });
});

describe('chanceAllPrized', () => {
  it('is 10% for a single copy and drops fast with more', () => {
    expect(chanceAllPrized(60, 1)).toBeCloseTo(0.1, 12);
    expect(chanceAllPrized(60, 2)).toBeCloseTo(0.00847457627118644, 12);
    expect(chanceAllPrized(60, 4)).toBeCloseTo(0.0000307607124180996, 15);
    expect(chanceAllPrized(60, 7)).toBeNull();
  });
});
