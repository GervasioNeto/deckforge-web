import { TYPE_CODES, typeFromCode } from '../../../../core/games/pokemon/energy';
import {
  PokemonCategory,
  cardCategory,
  cardType,
  isBasicEnergy,
  sortByLine,
} from '../../../../core/games/pokemon/pokemon-cards';
import { Board, DeckCard } from '../../../../core/models/card.model';
import { ImportEntry } from '../../../../core/models/deck.model';
import type { ExportStyle, ParsedDeckList } from './deck-text';

/**
 * Pokémon deck lists as Pokémon TCG Live writes them (and Limitless and most
 * sites copy):
 *
 *   Pokémon: 12
 *   4 Pikachu ex SVI 57
 *
 *   Trainer: 36
 *   4 Iono PAL 185
 *
 *   Energy: 12
 *   12 Basic {L} Energy SVE 4
 *
 *   Total Cards: 60
 *
 * Also the older Pokémon TCG Online lists ("##Pokémon - 12", "* 4 Pikachu SUM 1").
 * Set and number are read but not used yet: the API adds cards by name, newest printing.
 */

// "Pokémon: 12", "##Trainer Cards - 36", "Energy (12)", "Trainers"...
const CATEGORY_HEADER =
  /^(?:##\s*)?(?:pok[eé]mon|trainers?(?: cards)?|energy|energies)\s*(?:[:\-–]\s*\d*|\(\d+\))?\s*:?$/i;

const BOARD_HEADERS: [RegExp, Board][] = [
  [/^(deck|main|mainboard|main ?deck|deck principal|principal)$/i, 'main'],
  [/^(maybeboard|maybe|considering)$/i, 'maybe'],
];

// "Total Cards: 60" and the "****** Pokémon Trading Card Game Deck List ******" banner.
const IGNORED = [/^total cards?\b/i, /^\*{3,}.*\*{3,}$/];

// "4 Name SET 123": quantity, name, then optionally the set code and number.
const ENTRY =
  /^(?:(\d{1,3})\s*[xX]?\s+)?(.+?)(?:\s+([A-Z][A-Za-z0-9-]{1,9})\s+([A-Za-z]{0,6}\d+[a-z]?))?$/;

/** "Basic {R} Energy" → "Basic Fire Energy", the name the API knows. */
export function readCardName(name: string): string {
  return name.replace(/\{([A-Za-z])\}/g, (symbol, code: string) => typeFromCode(code) ?? symbol);
}

export function parsePokemonDeckList(text: string): ParsedDeckList {
  const entries: ImportEntry[] = [];
  const invalidLines: ParsedDeckList['invalidLines'] = [];
  let board: Board = 'main';

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line === '' || IGNORED.some((pattern) => pattern.test(line))) {
      return;
    }

    // Category headers only organize the list; they don't move cards between boards.
    if (CATEGORY_HEADER.test(line)) {
      return;
    }
    const header = BOARD_HEADERS.find(([pattern]) => pattern.test(line.replace(/:$/, '')));
    if (header) {
      board = header[1];
      return;
    }
    // Comments: "# ..." and "// ..." (after the "##Pokémon" headers above).
    if (/^(#|\/\/)/.test(line)) {
      return;
    }

    // Pokémon TCG Online marked each card line with "* ".
    const body = line.replace(/^\*\s+/, '');
    const match = ENTRY.exec(body);
    const name = match?.[2] ? readCardName(match[2].trim()) : '';
    const quantity = match?.[1] ? Number(match[1]) : 1;
    if (!name || quantity < 1 || /^\d+$/.test(name)) {
      invalidLines.push({ line: index + 1, text: line });
      return;
    }
    entries.push({ name, quantity, board });
  });

  return { entries, invalidLines };
}

/** The headers Pokémon TCG Live writes (in English, so other sites read them too). */
const LIVE_HEADERS: Record<PokemonCategory, string> = {
  pokemon: 'Pokémon',
  trainer: 'Trainer',
  energy: 'Energy',
};

const CATEGORIES: PokemonCategory[] = ['pokemon', 'trainer', 'energy'];

/** Pokémon TCG Live writes basic Energy with its symbol: "Basic {R} Energy". */
function liveName(card: DeckCard): string {
  const type = isBasicEnergy(card) ? cardType(card) : null;
  return type ? `Basic {${TYPE_CODES[type]}} Energy` : card.name;
}

function exportLine(card: DeckCard, style: ExportStyle): string {
  if (style === 'live') {
    const printing =
      card.setCode && card.collectorNumber ? ` ${card.setCode} ${card.collectorNumber}` : '';
    return `${card.quantity} ${liveName(card)}${printing}`;
  }
  return `${card.quantity} ${card.name}`;
}

function sections(cards: readonly DeckCard[], style: ExportStyle): string[] {
  return CATEGORIES.map((category) => {
    const inCategory = cards.filter((card) => cardCategory(card) === category);
    if (inCategory.length === 0) return null;
    const count = inCategory.reduce((sum, card) => sum + card.quantity, 0);
    return [
      `${LIVE_HEADERS[category]}: ${count}`,
      ...sortByLine(inCategory).map((card) => exportLine(card, style)),
    ].join('\n');
  }).filter((block) => block !== null);
}

/**
 * The deck as text, by category. `live` adds set and number to each line, as
 * Pokémon TCG Live expects, plus its total, and leaves the maybeboard out (Live
 * has no such zone). `text` is names only, with the maybeboard at the end.
 */
export function serializePokemonDeckList(cards: readonly DeckCard[], style: ExportStyle): string {
  const main = cards.filter((card) => card.board === 'main');
  const blocks = sections(main, style);

  if (style === 'live') {
    const total = main.reduce((sum, card) => sum + card.quantity, 0);
    return blocks.length > 0 ? [...blocks, `Total Cards: ${total}`].join('\n\n') : '';
  }

  const maybe = cards.filter((card) => card.board === 'maybe');
  if (maybe.length > 0) {
    blocks.push(
      ['Maybeboard', ...sortByLine(maybe).map((card) => exportLine(card, style))].join('\n'),
    );
  }
  return blocks.join('\n\n');
}

/** Cards of the deck exported without set and number (older sets, some promos). */
export function cardsWithoutPrinting(cards: readonly DeckCard[]): DeckCard[] {
  return cards.filter((card) => card.board === 'main' && (!card.setCode || !card.collectorNumber));
}
