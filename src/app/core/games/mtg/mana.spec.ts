import { manaCostLabel, parseManaCost, parseManaSymbol, tokenizeRulesText } from './mana';

describe('mana', () => {
  it('parses a cost into symbols with their colors', () => {
    const [face] = parseManaCost('{2}{U}{B}');

    expect(face.map((symbol) => symbol.kind)).toEqual(['generic', 'color', 'color']);
    expect(face[1].colors).toEqual(['U']);
  });

  it('keeps each half of a split card apart', () => {
    const faces = parseManaCost('{1}{R} // {2}{U}');

    expect(faces).toHaveLength(2);
    expect(manaCostLabel(faces)).toBe('1 genérico, vermelho // 2 genérico, azul');
  });

  it('returns nothing for lands, which have no cost', () => {
    expect(parseManaCost(null)).toEqual([]);
    expect(parseManaCost('')).toEqual([]);
  });

  it('reads hybrid, two-brid and Phyrexian symbols', () => {
    expect(parseManaSymbol('W/U')).toMatchObject({ kind: 'hybrid', colors: ['W', 'U'] });
    expect(parseManaSymbol('2/W').label).toBe('híbrido 2 genérico ou branco');
    expect(parseManaSymbol('B/P')).toMatchObject({ kind: 'phyrexian', colors: ['B'] });
  });

  it('splits the symbols out of rules text', () => {
    const parts = tokenizeRulesText('{T}: Add {B}.');

    expect(parts).toHaveLength(4);
    expect(parts[0]).toMatchObject({ kind: 'tap' });
    expect(parts[1]).toBe(': Add ');
    expect(parts[3]).toBe('.');
  });
});
