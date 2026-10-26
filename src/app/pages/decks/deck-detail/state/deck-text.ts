import { Board, DeckCard } from '../../../../core/models/card.model';
import { ImportEntry } from '../../../../core/models/deck.model';

/**
 * Plain-text deck lists, the format every deckbuilder imports and exports:
 *
 *   4 Lightning Bolt
 *   2x Counterspell (MH2) 267
 *
 *   Sideboard
 *   2 Negate
 */

export type ExportStyle = 'text' | 'arena';

const SECTION_HEADERS: [RegExp, Board][] = [
  [/^(commander|comandantes?)$/i, 'commander'],
  [/^(deck|main|mainboard|main ?deck|deck principal|principal)$/i, 'main'],
  [/^(sideboard|side|sb)$/i, 'side'],
  [/^(maybeboard|maybe|considering)$/i, 'maybe'],
];

// "4 Name", "4x Name", "Name"; optionally "(SET) 123" and a foil mark after it.
const ENTRY =
  /^(?:(\d{1,3})\s*[xX]?\s+)?(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\)(?:\s+[\w-]+)?)?(?:\s+\*[A-Z]+\*)?$/;

export interface ParsedDeckList {
  entries: ImportEntry[];
  /** Lines that look like neither a card nor a section header. */
  invalidLines: { line: number; text: string }[];
}

export function parseDeckList(text: string): ParsedDeckList {
  const entries: ImportEntry[] = [];
  const invalidLines: ParsedDeckList['invalidLines'] = [];

  let board: Board = 'main';
  let sawHeader = false;
  let blankAfterCards = false;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (line === '') {
      blankAfterCards = entries.length > 0;
      return;
    }
    // Comments: "# ..." and "// ...".
    if (/^(#|\/\/)/.test(line)) {
      return;
    }

    const header = SECTION_HEADERS.find(([pattern]) => pattern.test(line.replace(/:$/, '')));
    if (header) {
      board = header[1];
      sawHeader = true;
      blankAfterCards = false;
      return;
    }

    // Lists without headers (MTGO, many sites) separate the sideboard with a blank line.
    if (blankAfterCards && !sawHeader && board === 'main') {
      board = 'side';
    }
    blankAfterCards = false;

    let entryBoard = board;
    let body = line;
    const sideboardPrefix = /^SB:\s*/i.exec(body);
    if (sideboardPrefix) {
      entryBoard = 'side';
      body = body.slice(sideboardPrefix[0].length);
    }

    const match = ENTRY.exec(body);
    const name = match?.[2]?.trim();
    const quantity = match?.[1] ? Number(match[1]) : 1;
    if (!name || quantity < 1 || /^\d+$/.test(name)) {
      invalidLines.push({ line: index + 1, text: line });
      return;
    }
    entries.push({ name, quantity, board: entryBoard });
  });

  return { entries, invalidLines };
}

const EXPORT_SECTIONS: { board: Board; header: string; arenaHeader: string }[] = [
  { board: 'commander', header: 'Commander', arenaHeader: 'Commander' },
  { board: 'main', header: 'Deck', arenaHeader: 'Deck' },
  { board: 'side', header: 'Sideboard', arenaHeader: 'Sideboard' },
  { board: 'maybe', header: 'Maybeboard', arenaHeader: '' },
];

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

function exportLine(card: DeckCard, style: ExportStyle): string {
  if (style === 'arena' && card.setCode && card.collectorNumber) {
    return `${card.quantity} ${card.name} (${card.setCode.toUpperCase()}) ${card.collectorNumber}`;
  }
  return `${card.quantity} ${card.name}`;
}

/**
 * The deck as text. `arena` adds set and number to each line, as MTG Arena
 * expects, and leaves the maybeboard out (Arena has no such zone).
 */
export function serializeDeckList(cards: readonly DeckCard[], style: ExportStyle): string {
  return EXPORT_SECTIONS.map(({ board, header, arenaHeader }) => {
    const title = style === 'arena' ? arenaHeader : header;
    const inBoard = cards
      .filter((card) => card.board === board)
      .sort((a, b) => collator.compare(a.name, b.name));
    if (!title || inBoard.length === 0) {
      return null;
    }
    return [title, ...inBoard.map((card) => exportLine(card, style))].join('\n');
  })
    .filter((block) => block !== null)
    .join('\n\n');
}
