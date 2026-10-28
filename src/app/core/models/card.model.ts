/**
 * Where a card sits inside a deck. `maybe` holds cards under consideration
 * (they don't count toward the deck); `commander` is the Commander zone.
 */
export type Board = 'main' | 'side' | 'maybe' | 'commander';

export type Legality = 'legal' | 'not_legal' | 'banned' | 'restricted';

export type CardRarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';

/** One face of a double-faced, split or adventure card. */
export interface CardFace {
  name: string;
  manaCost: string | null;
  typeLine: string;
  text: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
}

/** The Pokémon TCG API's energy types, as it spells them. */
export type PokemonType =
  | 'Grass'
  | 'Fire'
  | 'Water'
  | 'Lightning'
  | 'Psychic'
  | 'Fighting'
  | 'Darkness'
  | 'Metal'
  | 'Fairy'
  | 'Dragon'
  | 'Colorless';

export type PokemonSupertype = 'Pokémon' | 'Trainer' | 'Energy';

export interface PokemonAttack {
  name: string;
  /** One entry per energy, e.g. `['Fire', 'Colorless']`; empty for free attacks. */
  cost: string[];
  /** As printed: "120", "30+", "20×"; null when the attack deals no damage. */
  damage: string | null;
  text: string | null;
}

export interface PokemonAbility {
  name: string;
  /** "Ability", or older kinds like "Poké-Power" and "Pokémon Power". */
  type: string | null;
  text: string | null;
}

/** A weakness or resistance: the type and the modifier, e.g. `{ type: 'Water', value: '×2' }`. */
export interface PokemonTypeModifier {
  type: string;
  value: string;
}

/** Fields only Magic cards have (Scryfall). */
interface MtgCardFields {
  /** Scryfall notation, e.g. "{2}{U}{B}"; split cards join faces with " // ". Null for lands. */
  manaCost: string | null;
  cmc: number;
  text: string | null;
  colors: string[];
  colorIdentity: string[];
  /** Back face image of transform/modal double-faced cards. */
  backImageUrl: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  faces: CardFace[] | null;
  scryfallUrl: string | null;
}

/** Fields only Pokémon cards have (Pokémon TCG API). */
interface PokemonCardFields {
  supertype: PokemonSupertype | null;
  /** "Basic", "Stage 1", "ex", "Supporter", "ACE SPEC"... */
  subtypes: string[];
  /** Name of the Pokémon this one evolves from; it links evolution lines. */
  evolvesFrom: string | null;
  hp: number | null;
  types: PokemonType[];
  attacks: PokemonAttack[];
  abilities: PokemonAbility[];
  weaknesses: PokemonTypeModifier[];
  resistances: PokemonTypeModifier[];
  /** One entry per energy, e.g. `['Colorless', 'Colorless']`. */
  retreatCost: string[];
  /** The letter that decides Standard legality ("G", "H"...); null on older cards. */
  regulationMark: string | null;
  /** Rule boxes: the Pokémon ex rule, a Trainer's whole text... */
  rules: string[];
}

/**
 * Fields shared by a searched card and a card inside a deck. The API names the
 * fields both games have the same way (name, typeLine, imageUrl...) and adds
 * each game's own; the services fill the other game's with empty values (see
 * `withCardDefaults`), so every card has every field.
 */
export interface CardDetails extends MtgCardFields, PokemonCardFields {
  name: string;
  /** "Creature — Elf Druid"; for Pokémon, supertype and subtypes: "Pokémon — Stage 1". */
  typeLine: string;
  /** Magic uses `CardRarity`; Pokémon prints its own ("Rare Holo", "Double Rare"...). */
  rarity: string | null;
  /** Magic set code ("neo"), or the Pokémon TCG Live one ("SVI"). */
  setCode: string | null;
  setName: string | null;
  collectorNumber: string | null;
  imageUrl: string | null;
  /** Keyed by format, e.g. `{ standard: 'legal', modern: 'banned' }`. */
  legalities: Partial<Record<string, Legality>>;
}

/**
 * Shape returned by GET /api/cards?name= (a single card). `id` is the external
 * id (Scryfall's or the Pokémon TCG API's).
 */
export interface Card extends CardDetails {
  id: string;
}

/**
 * A card as it appears inside a deck (GET /api/decks/:deckId). One entry per
 * card and board: the same card in the main deck and the sideboard is two
 * entries. `id` is the internal DB id used by /decks/:deckId/cards/:cardId.
 */
export interface DeckCard extends CardDetails {
  id: string;
  externalId: string;
  board: Board;
  quantity: number;
}

/** One printing of a card (GET /api/cards/search), to pick the art before adding it. */
export interface CardPrint {
  externalId: string;
  name: string;
  imageUrl: string | null;
  setName: string | null;
  collectorNumber: string | null;
  /** Pokémon only: the printing's regulation mark, which decides Standard; null on Magic. */
  regulationMark: string | null;
}

type GameFields = MtgCardFields & PokemonCardFields & Pick<CardDetails, 'setCode'>;

/** Both games' own fields, empty. */
const EMPTY_GAME_FIELDS: GameFields = {
  manaCost: null,
  cmc: 0,
  text: null,
  colors: [],
  colorIdentity: [],
  backImageUrl: null,
  power: null,
  toughness: null,
  loyalty: null,
  faces: null,
  scryfallUrl: null,
  setCode: null,
  supertype: null,
  subtypes: [],
  evolvesFrom: null,
  hp: null,
  types: [],
  attacks: [],
  abilities: [],
  weaknesses: [],
  resistances: [],
  retreatCost: [],
  regulationMark: null,
  rules: [],
};

/**
 * A card as the API sent it (only its own game's fields), completed with the
 * other game's fields empty, so reading `card.cmc` on a Pokémon card or
 * `card.subtypes` on a Magic one never meets `undefined`.
 */
export function withCardDefaults<T extends object>(card: T): GameFields & T {
  return { ...EMPTY_GAME_FIELDS, ...card };
}
