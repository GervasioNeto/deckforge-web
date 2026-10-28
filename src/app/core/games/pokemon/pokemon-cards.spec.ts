import { DeckCard, withCardDefaults } from '../../models/card.model';
import {
  basicEnergyType,
  copyName,
  evolutionLines,
  kindLabel,
  prizeValue,
  trainerKind,
} from './pokemon-cards';

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

describe('prizeValue', () => {
  it('reads the Prize cards from the rule box', () => {
    const ex = card({
      name: 'Charizard ex',
      supertype: 'Pokémon',
      rules: [
        'Pokémon ex rule: When your Pokémon ex is Knocked Out, your opponent takes 2 Prize cards.',
      ],
    });
    const vmax = card({
      name: 'Pikachu VMAX',
      supertype: 'Pokémon',
      rules: [
        'VMAX rule: When your Pokémon VMAX is Knocked Out, your opponent takes 3 Prize cards.',
      ],
    });

    expect(prizeValue(ex)).toBe(2);
    expect(prizeValue(vmax)).toBe(3);
    expect(prizeValue(card({ name: 'Pikachu', supertype: 'Pokémon' }))).toBe(1);
  });
});

describe('copyName', () => {
  it('drops levels and the Delta Species mark, but keeps the other marks', () => {
    expect(copyName({ name: 'Gengar LV.X' })).toBe('Gengar');
    expect(copyName({ name: 'Gengar LV. 43' })).toBe('Gengar');
    expect(copyName({ name: 'Charizard δ' })).toBe('Charizard');
    expect(copyName({ name: 'Charizard ★ δ' })).toBe('Charizard ★');
    expect(copyName({ name: 'Charizard ex' })).toBe('Charizard ex');
  });
});

describe('trainerKind', () => {
  it('counts Technical Machines and older Item Tools as Tools', () => {
    const tm = card({
      name: 'Technical Machine: Evolution',
      supertype: 'Trainer',
      subtypes: ['Pokémon Tool', 'Technical Machine'],
    });
    const oldTool = card({
      name: 'Float Stone',
      supertype: 'Trainer',
      subtypes: ['Item', 'Pokémon Tool'],
    });
    const ace = card({
      name: 'Prime Catcher',
      supertype: 'Trainer',
      subtypes: ['Item', 'ACE SPEC'],
    });

    expect(trainerKind(tm)).toBe('tool');
    expect(trainerKind(oldTool)).toBe('tool');
    expect(trainerKind(ace)).toBe('item');
  });
});

describe('basicEnergyType', () => {
  it('reads both the new and the old basic Energy names', () => {
    expect(basicEnergyType('Basic Fire Energy')).toBe('Fire');
    expect(basicEnergyType('Darkness Energy')).toBe('Darkness');
    expect(basicEnergyType('Double Turbo Energy')).toBeNull();
  });
});

describe('kindLabel', () => {
  it('says what the card is in Portuguese', () => {
    const ex = card({ name: 'Gardevoir ex', supertype: 'Pokémon', subtypes: ['Stage 2', 'ex'] });
    const vmax = card({ name: 'Pikachu VMAX', supertype: 'Pokémon', subtypes: ['VMAX'] });
    const ace = card({
      name: 'Prime Catcher',
      supertype: 'Trainer',
      subtypes: ['Item', 'ACE SPEC'],
    });
    const special = card({ name: 'Jet Energy', supertype: 'Energy', subtypes: ['Special'] });

    expect(kindLabel(ex)).toBe('Pokémon Estágio 2 · ex');
    expect(kindLabel(vmax)).toBe('Pokémon VMAX');
    expect(kindLabel(ace)).toBe('Treinador · Item · ACE SPEC');
    expect(kindLabel(special)).toBe('Energia Especial');
  });
});

describe('evolutionLines', () => {
  it('writes each line from the Basic up, as players do', () => {
    const lines = evolutionLines([
      card({
        name: 'Charizard ex',
        quantity: 2,
        supertype: 'Pokémon',
        subtypes: ['Stage 2', 'ex'],
        evolvesFrom: 'Charmeleon',
      }),
      card({ name: 'Charmander', quantity: 4, supertype: 'Pokémon', subtypes: ['Basic'] }),
      card({
        name: 'Charmeleon',
        quantity: 1,
        supertype: 'Pokémon',
        subtypes: ['Stage 1'],
        evolvesFrom: 'Charmander',
      }),
      card({ name: 'Pidgey', quantity: 2, supertype: 'Pokémon', subtypes: ['Basic'] }),
      card({ name: 'Mew ex', quantity: 1, supertype: 'Pokémon', subtypes: ['Basic', 'ex'] }),
    ]);

    // Pidgot isn't in the deck, so Pidgey and Mew ex aren't lines.
    expect(lines).toEqual([{ root: 'Charmander', counts: [4, 1, 2] }]);
  });
});
