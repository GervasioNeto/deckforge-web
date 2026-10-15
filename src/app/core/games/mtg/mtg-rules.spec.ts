import { Board, DeckCard } from '../../models/card.model';
import { MTG_RULES, deckColors, mtgCardType } from './mtg-rules';

let nextId = 0;

function card(overrides: Partial<DeckCard> & { name: string }): DeckCard {
  return {
    id: `card-${nextId++}`,
    externalId: 'x',
    board: 'main' as Board,
    quantity: 1,
    manaCost: null,
    cmc: 0,
    typeLine: 'Instant',
    text: null,
    colors: [],
    colorIdentity: [],
    rarity: 'common',
    setCode: null,
    setName: null,
    collectorNumber: null,
    imageUrl: null,
    backImageUrl: null,
    power: null,
    toughness: null,
    loyalty: null,
    faces: null,
    legalities: { standard: 'legal', modern: 'legal', commander: 'legal' },
    scryfallUrl: null,
    ...overrides,
  };
}

const swamps = (quantity: number) =>
  card({ name: 'Swamp', typeLine: 'Basic Land — Swamp', quantity });

describe('mtgCardType', () => {
  it('lists lands as lands even when they have other types', () => {
    expect(mtgCardType('Artifact Land')).toBe('land');
    expect(mtgCardType('Land Creature — Forest Dryad')).toBe('land');
  });

  it('uses the front face of double-faced cards', () => {
    expect(mtgCardType('Creature — Human Wizard // Instant')).toBe('creature');
    expect(mtgCardType('Enchantment — Saga // Enchantment Creature — Goblin')).toBe('enchantment');
  });
});

describe('MTG_RULES.validate', () => {
  it('has nothing to say about a casual deck', () => {
    expect(MTG_RULES.validate([card({ name: 'Bolt', quantity: 9 })], null).issues).toEqual([]);
  });

  it('warns while a constructed deck is under 60 cards', () => {
    const { issues } = MTG_RULES.validate([swamps(58)], 'standard');

    expect(issues).toEqual([
      { severity: 'warning', message: 'O deck tem 58 cartas; o Standard pede no mínimo 60.' },
    ]);
  });

  it('counts copies across main deck and sideboard, but not basic lands', () => {
    const main = card({ name: 'Duress', quantity: 3 });
    const side = card({ name: 'Duress', quantity: 2, board: 'side' });

    const { issues, cardIssues } = MTG_RULES.validate([swamps(55), main, side], 'standard');

    expect(issues.map((issue) => issue.message)).toContain('1 carta passa do limite de cópias.');
    expect(cardIssues.get(main.id)).toBe('5 cópias; o máximo é 4');
    expect(cardIssues.get(side.id)).toBe('5 cópias; o máximo é 4');
  });

  it('flags banned and out-of-format cards, ignoring the maybeboard', () => {
    const banned = card({ name: 'Banned', legalities: { standard: 'banned' } });
    const rotated = card({ name: 'Rotated', legalities: { standard: 'not_legal' } });
    const maybe = card({ name: 'Maybe', board: 'maybe', legalities: { standard: 'banned' } });

    const { cardIssues } = MTG_RULES.validate([swamps(58), banned, rotated, maybe], 'standard');

    expect(cardIssues.get(banned.id)).toBe('Banida no Standard');
    expect(cardIssues.get(rotated.id)).toBe('Não é legal no Standard');
    expect(cardIssues.has(maybe.id)).toBe(false);
  });

  it('checks Commander decks against the commander color identity', () => {
    const commander = card({ name: 'Boss', board: 'commander', colorIdentity: ['U', 'B'] });
    const offColor = card({ name: 'Bolt', colorIdentity: ['R'] });

    const { issues, cardIssues } = MTG_RULES.validate(
      [commander, offColor, swamps(98)],
      'commander',
    );

    expect(issues.some((issue) => issue.severity === 'error')).toBe(true);
    expect(cardIssues.get(offColor.id)).toBe('Fora da identidade de cor do comandante');
  });
});

describe('deckColors', () => {
  it("uses the commander's identity when there is one", () => {
    const cards = [
      card({ name: 'Boss', board: 'commander', colorIdentity: ['B', 'U'] }),
      card({ name: 'Bolt', colorIdentity: ['R'] }),
    ];
    expect(deckColors(cards)).toEqual(['U', 'B']);
  });
});
