/**
 * Scryfall's mana notation ("{2}{U}{B}", "{W/U}", "{B/P}") parsed into
 * symbols the UI can draw, since the app doesn't ship the official mana font.
 */

export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G';

/** The color pie order every MTG tool uses. */
export const MANA_COLORS: readonly ManaColor[] = ['W', 'U', 'B', 'R', 'G'];

export const COLOR_NAMES: Record<ManaColor, string> = {
  W: 'Branco',
  U: 'Azul',
  B: 'Preto',
  R: 'Vermelho',
  G: 'Verde',
};

export type ManaSymbolKind =
  | 'color'
  | 'generic'
  | 'variable'
  | 'colorless'
  | 'hybrid'
  | 'phyrexian'
  | 'snow'
  | 'tap'
  | 'untap'
  | 'energy'
  | 'other';

export interface ManaSymbol {
  /** What was inside the braces, uppercased: "U", "2", "W/U", "B/P". */
  code: string;
  kind: ManaSymbolKind;
  /** Colors the symbol carries, in WUBRG order (two for hybrids, none for generic). */
  colors: ManaColor[];
  /** Spoken form for screen readers and tooltips, e.g. "híbrido branco ou azul". */
  label: string;
}

function isManaColor(value: string): value is ManaColor {
  return (MANA_COLORS as readonly string[]).includes(value);
}

const colorWord = (color: ManaColor) => COLOR_NAMES[color].toLowerCase();

const FIXED_SYMBOLS: Record<string, Pick<ManaSymbol, 'kind' | 'label'>> = {
  C: { kind: 'colorless', label: 'incolor' },
  S: { kind: 'snow', label: 'neve' },
  T: { kind: 'tap', label: 'virar' },
  Q: { kind: 'untap', label: 'desvirar' },
  E: { kind: 'energy', label: 'energia' },
  X: { kind: 'variable', label: 'X' },
  Y: { kind: 'variable', label: 'Y' },
  Z: { kind: 'variable', label: 'Z' },
};

export function parseManaSymbol(raw: string): ManaSymbol {
  const code = raw.trim().toUpperCase();

  if (/^\d+$/.test(code)) {
    return { code, kind: 'generic', colors: [], label: `${code} genérico` };
  }
  if (isManaColor(code)) {
    return { code, kind: 'color', colors: [code], label: colorWord(code) };
  }
  const fixed = FIXED_SYMBOLS[code];
  if (fixed) {
    return { code, colors: [], ...fixed };
  }

  if (code.includes('/')) {
    const parts = code.split('/');
    const colors = MANA_COLORS.filter((color) => parts.includes(color));
    const named = colors.map(colorWord);

    if (parts.includes('P')) {
      return { code, kind: 'phyrexian', colors, label: `phyrexiano ${named.join(' ou ')}` };
    }
    // {2/W}: two generic or one white.
    const options = parts.includes('2') ? ['2 genérico', ...named] : named;
    return { code, kind: 'hybrid', colors, label: `híbrido ${options.join(' ou ')}` };
  }

  return { code, kind: 'other', colors: [], label: code };
}

const SYMBOL_PATTERN = /\{([^}]+)\}/g;

/** One symbol list per face; split cards ("{1}{R} // {2}{U}") return two. */
export function parseManaCost(cost: string | null | undefined): ManaSymbol[][] {
  if (!cost) {
    return [];
  }
  return cost
    .split('//')
    .map((face) => [...face.matchAll(SYMBOL_PATTERN)].map((match) => parseManaSymbol(match[1])))
    .filter((symbols) => symbols.length > 0);
}

/** "Custo: 2 genérico, azul, preto", for the whole cost. */
export function manaCostLabel(faces: ManaSymbol[][]): string {
  return faces.map((symbols) => symbols.map((symbol) => symbol.label).join(', ')).join(' // ');
}

export type RulesTextPart = string | ManaSymbol;

/** Rules text with its symbols ("{T}: Add {B}.") split out, so they render as pips. */
export function tokenizeRulesText(text: string): RulesTextPart[] {
  const parts: RulesTextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(SYMBOL_PATTERN)) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(parseManaSymbol(match[1]));
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts;
}

/** Colors in WUBRG order with no repeats. */
export function sortColors(colors: Iterable<string>): ManaColor[] {
  const set = new Set(colors);
  return MANA_COLORS.filter((color) => set.has(color));
}
