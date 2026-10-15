import { Component, booleanAttribute, computed, input } from '@angular/core';
import {
  LucideDiamond,
  LucideDroplet,
  LucideFlame,
  LucideRotateCcw,
  LucideRotateCw,
  LucideSkull,
  LucideSnowflake,
  LucideSun,
  LucideTreePine,
  LucideZap,
} from '@lucide/angular';
import { ManaColor, ManaSymbol } from '../../core/games/mtg/mana';

export type ManaPipSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ManaPipSize, { box: string; icon: number; text: string }> = {
  sm: { box: 'h-3.5 w-3.5', icon: 9, text: 'text-[9px]' },
  md: { box: 'h-4 w-4', icon: 10, text: 'text-[10px]' },
  lg: { box: 'h-5 w-5', icon: 13, text: 'text-xs' },
};

/** Pip fills from the official palette, as CSS variables (see styles.css). */
const COLOR_FILL: Record<ManaColor, string> = {
  W: 'var(--color-mana-w)',
  U: 'var(--color-mana-u)',
  B: 'var(--color-mana-b)',
  R: 'var(--color-mana-r)',
  G: 'var(--color-mana-g)',
};
const NEUTRAL_FILL = 'var(--color-mana-c)';

/** What goes inside the circle. */
type Glyph = ManaColor | 'C' | 'S' | 'T' | 'Q' | 'E' | 'phyrexian' | 'text' | 'none';

/**
 * One mana symbol drawn as a colored pip, standing in for the official mana
 * font: a Lucide glyph close to each color's emblem (sun, drop, skull, flame,
 * tree), numbers for generic mana, and split fills for hybrids.
 */
@Component({
  selector: 'app-mana-pip',
  imports: [
    LucideSun,
    LucideDroplet,
    LucideSkull,
    LucideFlame,
    LucideTreePine,
    LucideDiamond,
    LucideSnowflake,
    LucideRotateCw,
    LucideRotateCcw,
    LucideZap,
  ],
  templateUrl: './mana-pip.html',
  host: {
    class:
      'inline-flex shrink-0 select-none items-center justify-center rounded-full text-mana-ink shadow-[0_1px_0_rgb(0_0_0/0.4)] ring-1 ring-black/10',
    '[class]': 'sizes().box',
    '[style.background]': 'background()',
    '[attr.role]': 'decorative() ? null : "img"',
    '[attr.aria-label]': 'decorative() ? null : symbol().label',
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
    '[attr.title]': 'decorative() ? null : symbol().label',
  },
})
export class ManaPip {
  readonly symbol = input.required<ManaSymbol>();
  readonly size = input<ManaPipSize>('md');
  /** Inside a labelled group (a whole mana cost), each pip stays silent. */
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly sizes = computed(() => SIZES[this.size()]);

  protected readonly glyph = computed<Glyph>(() => {
    const { kind, code, colors } = this.symbol();
    switch (kind) {
      case 'color':
        return colors[0];
      case 'colorless':
        return 'C';
      case 'snow':
        return 'S';
      case 'tap':
        return 'T';
      case 'untap':
        return 'Q';
      case 'energy':
        return 'E';
      case 'phyrexian':
        return 'phyrexian';
      case 'hybrid':
        // {2/W} shows its "2"; two-color hybrids read from the split fill alone.
        return code.startsWith('2/') ? 'text' : 'none';
      default:
        return 'text';
    }
  });

  protected readonly text = computed(() => {
    const { code } = this.symbol();
    return code.startsWith('2/') ? '2' : code;
  });

  protected readonly background = computed(() => {
    const { kind, colors, code } = this.symbol();
    if (kind === 'hybrid' || (kind === 'phyrexian' && colors.length > 1)) {
      const first = code.startsWith('2/') ? NEUTRAL_FILL : COLOR_FILL[colors[0]];
      const second = COLOR_FILL[colors[colors.length - 1]] ?? NEUTRAL_FILL;
      return `linear-gradient(135deg, ${first} 50%, ${second} 50%)`;
    }
    return colors.length > 0 ? COLOR_FILL[colors[0]] : NEUTRAL_FILL;
  });
}
