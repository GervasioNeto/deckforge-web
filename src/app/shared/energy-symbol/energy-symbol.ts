import { Component, booleanAttribute, computed, input } from '@angular/core';
import {
  LucideDroplet,
  LucideEye,
  LucideFeather,
  LucideFlame,
  LucideHandFist,
  LucideLeaf,
  LucideMoon,
  LucideSparkles,
  LucideStar,
  LucideTriangle,
  LucideZap,
} from '@lucide/angular';
import { TYPE_NAMES, isPokemonType } from '../../core/games/pokemon/energy';
import { PokemonType } from '../../core/models/card.model';

export type EnergySymbolSize = 'sm' | 'md' | 'lg';

/** Same sizes as the mana pips, so both games' rows line up the same way. */
const SIZES: Record<EnergySymbolSize, { box: string; icon: number; text: string }> = {
  sm: { box: 'h-3.5 w-3.5', icon: 9, text: 'text-[9px]' },
  md: { box: 'h-4 w-4', icon: 10, text: 'text-[10px]' },
  lg: { box: 'h-5 w-5', icon: 12, text: 'text-xs' },
};

/**
 * The printed colors, a touch softer so they sit beside the mana pips. Same in
 * both themes, like the pips: they're physical objects, not UI chrome. Kept
 * here rather than in styles.css, so they load with the deck page instead of
 * every page.
 */
const FILLS: Record<PokemonType, string> = {
  Grass: '#8cc66d',
  Fire: '#f08a5d',
  Water: '#6fb3e8',
  Lightning: '#f5d659',
  Psychic: '#b98ad6',
  Fighting: '#d1915c',
  Darkness: '#3d4950',
  Metal: '#b8c0c8',
  Fairy: '#f0a6c8',
  Dragon: '#c9ad4f',
  Colorless: '#e7e3dd',
};

/** Darkness is the only dark fill, so it takes the light glyph. */
const LIGHT_INK = '#f1f5f9';

/**
 * One Pokémon energy symbol, standing in for the printed ones: the type's
 * color with a Lucide glyph close to its emblem (leaf, flame, drop, bolt,
 * eye, fist, moon, triangle, sparkles, star). Unknown types get a neutral
 * circle with their initial.
 */
@Component({
  selector: 'app-energy-symbol',
  imports: [
    LucideLeaf,
    LucideFlame,
    LucideDroplet,
    LucideZap,
    LucideEye,
    LucideHandFist,
    LucideMoon,
    LucideTriangle,
    LucideSparkles,
    LucideFeather,
    LucideStar,
  ],
  template: `
    @let px = sizes().icon;
    @switch (known()) {
      @case ('Grass') {
        <svg lucideLeaf [size]="px" [strokeWidth]="2.75" />
      }
      @case ('Fire') {
        <svg lucideFlame [size]="px" [strokeWidth]="2.75" />
      }
      @case ('Water') {
        <svg lucideDroplet [size]="px" [strokeWidth]="2.75" />
      }
      @case ('Lightning') {
        <svg lucideZap [size]="px" [strokeWidth]="2.75" />
      }
      @case ('Psychic') {
        <svg lucideEye [size]="px" [strokeWidth]="2.75" />
      }
      @case ('Fighting') {
        <svg lucideHandFist [size]="px" [strokeWidth]="2.5" />
      }
      @case ('Darkness') {
        <svg lucideMoon [size]="px" [strokeWidth]="2.75" />
      }
      @case ('Metal') {
        <svg lucideTriangle [size]="px" [strokeWidth]="3" />
      }
      @case ('Fairy') {
        <svg lucideSparkles [size]="px" [strokeWidth]="2.5" />
      }
      @case ('Dragon') {
        <svg lucideFeather [size]="px" [strokeWidth]="2.5" />
      }
      @case ('Colorless') {
        <svg lucideStar [size]="px" [strokeWidth]="2.75" />
      }
      @default {
        <span class="font-bold leading-none" [class]="sizes().text">{{ type().charAt(0) }}</span>
      }
    }
  `,
  host: {
    class:
      'inline-flex shrink-0 select-none items-center justify-center rounded-full shadow-[0_1px_0_rgb(0_0_0/0.4)] ring-1 ring-black/10',
    '[class]': 'sizes().box',
    '[style.background]': 'fill()',
    '[style.color]': 'ink()',
    '[attr.role]': 'decorative() ? null : "img"',
    '[attr.aria-label]': 'decorative() ? null : label()',
    '[attr.aria-hidden]': 'decorative() ? "true" : null',
    '[attr.title]': 'decorative() ? null : label()',
  },
})
export class EnergySymbol {
  /** As the API spells it ("Fire"); attack costs may carry others. */
  readonly type = input.required<string>();
  readonly size = input<EnergySymbolSize>('md');
  /** Inside a labelled group (an attack cost), each symbol stays silent. */
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly sizes = computed(() => SIZES[this.size()]);
  protected readonly known = computed<PokemonType | null>(() => {
    const type = this.type();
    return isPokemonType(type) ? type : null;
  });
  protected readonly label = computed(() => {
    const type = this.known();
    return type ? TYPE_NAMES[type] : this.type();
  });
  protected readonly fill = computed(() => {
    const type = this.known();
    return type ? FILLS[type] : 'var(--color-mana-c)';
  });
  protected readonly ink = computed(() =>
    this.known() === 'Darkness' ? LIGHT_INK : 'var(--color-mana-ink)',
  );
}
