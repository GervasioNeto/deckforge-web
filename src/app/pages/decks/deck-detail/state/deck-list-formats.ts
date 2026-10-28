import { DeckCard } from '../../../../core/models/card.model';
import { GameType } from '../../../../core/models/deck.model';
import { ExportStyle, ParsedDeckList, parseDeckList, serializeDeckList } from './deck-text';
import {
  cardsWithoutPrinting,
  parsePokemonDeckList,
  serializePokemonDeckList,
} from './pokemon-deck-text';

export interface ExportStyleOption {
  id: ExportStyle;
  label: string;
  hint: string;
}

/** How a game's decks are written as text: what import reads and export writes. */
export interface DeckListFormat {
  parse(text: string): ParsedDeckList;
  serialize(cards: readonly DeckCard[], style: ExportStyle): string;
  /** The first one is the default. */
  styles: readonly ExportStyleOption[];
  /** Import dialog: where lists come from, and an example list. */
  importHint: string;
  placeholder: string;
  /** Import dialog, when names weren't found: what to check. */
  notFoundHint: string;
  /** Export dialog: cards a style can't write fully (e.g. Live without a set code). */
  incomplete?(cards: readonly DeckCard[], style: ExportStyle): DeckCard[];
}

export const DECK_LIST_FORMATS: Record<GameType, DeckListFormat> = {
  mtg: {
    parse: parseDeckList,
    serialize: serializeDeckList,
    styles: [
      { id: 'text', label: 'Texto', hint: 'Quantidade e nome; funciona na maioria dos sites.' },
      {
        id: 'arena',
        label: 'MTG Arena',
        hint: 'Com edição e número, pronto para importar no Arena.',
      },
    ],
    importHint: 'Cole a lista de outro site ou do MTG Arena. Uma carta por linha.',
    placeholder: `4 Lightning Bolt
4x Counterspell
2 Fable of the Mirror-Breaker (NEO) 141

Sideboard
2 Negate`,
    notFoundHint: 'Confira a grafia (em inglês) e adicione pela busca.',
  },
  pokemon: {
    parse: parsePokemonDeckList,
    serialize: serializePokemonDeckList,
    styles: [
      {
        id: 'live',
        label: 'Pokémon TCG Live',
        hint: 'Por categoria, com coleção e número, como o TCG Live importa.',
      },
      { id: 'text', label: 'Texto', hint: 'Quantidade e nome, por categoria.' },
    ],
    importHint: 'Cole a lista exportada do Pokémon TCG Live ou de outro site. Uma carta por linha.',
    placeholder: `Pokémon: 4
4 Pikachu ex SSP 57

Trainer: 8
4 Iono PAL 185
4 Ultra Ball SVI 196

Energy: 8
8 Basic {L} Energy SVE 4`,
    notFoundHint:
      'O nome precisa ser exato, em inglês, como na carta (ex.: "Pikachu ex"). Confira e adicione pela busca.',
    incomplete: (cards, style) => (style === 'live' ? cardsWithoutPrinting(cards) : []),
  },
};
