import { DeckCard, withCardDefaults } from '../../models/card.model';
import { POKEMON_RULES } from './pokemon-rules';

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
    // A mark legal in Standard, unless a test says otherwise.
    regulationMark: 'H',
    legalities: { standard: 'legal', expanded: 'legal', unlimited: 'legal' },
    ...overrides,
  }) as DeckCard;
}

const basic = (name: string, quantity = 1, extra: Partial<DeckCard> = {}) =>
  card({
    name,
    quantity,
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    types: ['Lightning'],
    ...extra,
  });
const trainer = (name: string, quantity = 1, subtypes = ['Item'], extra: Partial<DeckCard> = {}) =>
  card({ name, quantity, supertype: 'Trainer', subtypes, ...extra });
const basicEnergy = (name: string, quantity: number, extra: Partial<DeckCard> = {}) =>
  card({ name, quantity, supertype: 'Energy', subtypes: ['Basic'], ...extra });

/** 12 Pokémon, 36 Trainers and 12 Energy, all legal. */
function legalDeck(): DeckCard[] {
  return [
    basic('Pikachu ex', 4),
    basic('Raichu V', 4),
    basic('Pichu', 4),
    ...[
      'Iono',
      'Arven',
      'Ultra Ball',
      'Nest Ball',
      'Rare Candy',
      'Super Rod',
      'Switch',
      'Pokégear 3.0',
      'Energy Retrieval',
    ].map((name) => trainer(name, 4)),
    basicEnergy('Basic Lightning Energy', 12),
  ];
}

const messages = (cards: DeckCard[], format = 'standard') =>
  POKEMON_RULES.validate(cards, format).issues.map((issue) => issue.message);

describe('POKEMON_RULES.validate', () => {
  it('has nothing to say about a casual deck', () => {
    expect(POKEMON_RULES.validate([basic('Pikachu', 9)], null).issues).toEqual([]);
  });

  it('accepts a legal 60-card deck', () => {
    expect(POKEMON_RULES.validate(legalDeck(), 'standard')).toEqual({
      issues: [],
      cardIssues: new Map(),
    });
  });

  it('asks for exactly 60 cards: a warning under, an error over', () => {
    const short = [basic('Pikachu', 4), basicEnergy('Basic Lightning Energy', 54)];
    const long = [basic('Pikachu', 4), basicEnergy('Basic Lightning Energy', 57)];

    expect(POKEMON_RULES.validate(short, 'standard').issues).toEqual([
      { severity: 'warning', message: 'O deck tem 58 cartas; o Standard pede exatamente 60.' },
    ]);
    expect(POKEMON_RULES.validate(long, 'expanded').issues).toEqual([
      { severity: 'error', message: 'O deck tem 61 cartas; o Expanded pede exatamente 60.' },
    ]);
  });

  it('requires at least one Basic Pokémon', () => {
    const deck = [
      card({ name: 'Raichu', quantity: 4, supertype: 'Pokémon', subtypes: ['Stage 1'] }),
      basicEnergy('Basic Lightning Energy', 56),
    ];

    expect(messages(deck)).toContain(
      'O deck precisa de pelo menos 1 Pokémon Básico para começar a partida.',
    );
  });

  it('counts copies by name across printings, but not basic Energy', () => {
    const fromSvi = trainer('Ultra Ball', 3, ['Item'], { externalId: 'svi-196' });
    const fromMeg = trainer('Ultra Ball', 2, ['Item'], { externalId: 'meg-131' });
    const deck = [basic('Pikachu', 4), fromSvi, fromMeg, basicEnergy('Basic Lightning Energy', 51)];

    const { issues, cardIssues } = POKEMON_RULES.validate(deck, 'standard');

    expect(issues.map((issue) => issue.message)).toEqual(['1 carta passa do limite de cópias.']);
    expect(cardIssues.get(fromSvi.id)).toBe('5 cópias; o máximo é 4');
    expect(cardIssues.get(fromMeg.id)).toBe('5 cópias; o máximo é 4');
  });

  it('treats a level or the Delta Species mark as the same name', () => {
    const gengar = basic('Gengar', 3);
    const levelX = card({
      name: 'Gengar LV.X',
      quantity: 2,
      supertype: 'Pokémon',
      subtypes: ['LV.X'],
    });
    const delta = basic('Charizard δ', 3);
    const charizard = basic('Charizard', 2);

    const { cardIssues } = POKEMON_RULES.validate(
      [gengar, levelX, delta, charizard, basicEnergy('Basic Fire Energy', 50)],
      'unlimited',
    );

    expect(cardIssues.get(levelX.id)).toBe('5 cópias; o máximo é 4');
    expect(cardIssues.get(delta.id)).toBe('5 cópias; o máximo é 4');
  });

  it('allows one ACE SPEC and one Radiant Pokémon per deck, whatever the name', () => {
    const primeCatcher = trainer('Prime Catcher', 1, ['Item', 'ACE SPEC']);
    const unfairStamp = trainer('Unfair Stamp', 1, ['Item', 'ACE SPEC']);
    const radiantGreninja = basic('Radiant Greninja', 1, { subtypes: ['Basic', 'Radiant'] });
    const radiantCharizard = basic('Radiant Charizard', 1, { subtypes: ['Basic', 'Radiant'] });

    const { issues, cardIssues } = POKEMON_RULES.validate(
      [
        primeCatcher,
        unfairStamp,
        radiantGreninja,
        radiantCharizard,
        basicEnergy('Basic Water Energy', 56),
      ],
      'expanded',
    );

    expect(issues.map((issue) => issue.message)).toEqual([
      'O deck tem 2 cartas ACE SPEC; o limite é 1 por deck.',
      'O deck tem 2 Pokémon Radiantes; o limite é 1 por deck.',
    ]);
    expect(cardIssues.get(unfairStamp.id)).toBe('Só 1 ACE SPEC por deck');
    expect(cardIssues.get(radiantCharizard.id)).toBe('Só 1 Pokémon Radiante por deck');
  });

  it('allows a single copy of each Prism Star card', () => {
    const prism = basic('Giratina ◇', 2, { subtypes: ['Basic', 'Prism Star'] });

    const { cardIssues } = POKEMON_RULES.validate(
      [prism, basicEnergy('Basic Psychic Energy', 58)],
      'unlimited',
    );

    expect(cardIssues.get(prism.id)).toBe('Prism Star: só 1 cópia com o mesmo nome');
  });

  it('flags banned and out-of-format cards, but never basic Energy or the maybeboard', () => {
    const banned = trainer("Lysandre's Trump Card", 1, ['Supporter'], {
      regulationMark: null,
      legalities: { unlimited: 'legal', expanded: 'banned' },
    });
    const notExpanded = basic('Pikachu', 4, { legalities: { standard: 'legal' } });
    const oldEnergy = basicEnergy('Lightning Energy', 54, {
      regulationMark: null,
      legalities: { unlimited: 'legal' },
    });
    const maybe = basic('Mewtwo', 1, { board: 'maybe', legalities: { expanded: 'banned' } });

    const { cardIssues, issues } = POKEMON_RULES.validate(
      [banned, notExpanded, oldEnergy, maybe],
      'expanded',
    );

    expect(cardIssues.get(banned.id)).toBe('Banida no Expanded');
    expect(cardIssues.get(notExpanded.id)).toBe('Não é legal no Expanded');
    expect(cardIssues.has(oldEnergy.id)).toBe(false);
    expect(cardIssues.has(maybe.id)).toBe(false);
    expect(issues.map((issue) => issue.message)).toContain('2 cartas não são legais no Expanded.');
  });

  it('decides Standard by the regulation mark, even when the API still says legal', () => {
    // The API kept G cards "legal" after they rotated out in April 2026.
    const rotated = basic('Gardevoir ex', 2, { regulationMark: 'G' });
    const current = basic('Ralts', 4, { regulationMark: 'I', legalities: {} });
    const unmarked = trainer('Professor Oak', 1, ['Supporter'], { regulationMark: null });
    const banned = trainer('Forest Seal Stone', 1, ['Pokémon Tool'], {
      legalities: { standard: 'banned' },
    });

    const { cardIssues } = POKEMON_RULES.validate([rotated, current, unmarked, banned], 'standard');

    expect(cardIssues.get(rotated.id)).toBe('Marca G: fora do Standard');
    expect(cardIssues.has(current.id)).toBe(false);
    expect(cardIssues.get(unmarked.id)).toBe('Sem marca de regulação: fora do Standard');
    expect(cardIssues.get(banned.id)).toBe('Banida no Standard');
  });

  it('gives the card dialog the same legality the validation uses', () => {
    const rotated = basic('Gardevoir ex', 1, { regulationMark: 'G' });

    expect(POKEMON_RULES.legality(rotated, 'standard')).toBe('not_legal');
    expect(POKEMON_RULES.legality(rotated, 'expanded')).toBe('legal');
    expect(
      POKEMON_RULES.legality(basicEnergy('Fire Energy', 1, { regulationMark: null }), 'standard'),
    ).toBe('legal');
  });
});

describe('POKEMON_RULES grouping and sorting', () => {
  const ralts = basic('Ralts', 3, { types: ['Psychic'] });
  const kirlia = card({
    name: 'Kirlia',
    quantity: 2,
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    types: ['Psychic'],
    evolvesFrom: 'Ralts',
  });
  const gardevoir = card({
    name: 'Gardevoir ex',
    quantity: 2,
    supertype: 'Pokémon',
    subtypes: ['Stage 2', 'ex'],
    types: ['Psychic'],
    evolvesFrom: 'Kirlia',
  });
  const mew = basic('Mew ex', 1, { subtypes: ['Basic', 'ex'], types: ['Psychic'] });
  const iono = trainer('Iono', 4, ['Supporter']);
  const vessel = trainer('Earthen Vessel', 3);
  const psychic = basicEnergy('Basic Psychic Energy', 8);

  it('groups by category, by stage and kind, or by type', () => {
    const groups = (grouping: 'type' | 'stage' | 'energy') =>
      [gardevoir, iono, psychic].map((card) => POKEMON_RULES.groupOf(card, grouping).label);

    expect(groups('type')).toEqual(['Pokémon', 'Treinadores', 'Energias']);
    expect(groups('stage')).toEqual(['Pokémon Estágio 2', 'Apoiadores', 'Energias Básicas']);
    expect(groups('energy')).toEqual(['Psíquico', 'Treinadores', 'Energias']);
  });

  it('keeps evolution lines together, biggest first, Trainers and Energy by copies', () => {
    const sorted = POKEMON_RULES.sortCards(
      [psychic, vessel, gardevoir, mew, iono, kirlia, ralts],
      'line',
    );

    expect(sorted.map((card) => card.name)).toEqual([
      'Ralts',
      'Kirlia',
      'Gardevoir ex',
      'Mew ex',
      'Iono',
      'Earthen Vessel',
      'Basic Psychic Energy',
    ]);
  });
});
