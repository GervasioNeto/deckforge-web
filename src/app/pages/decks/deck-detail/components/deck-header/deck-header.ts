import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCircleCheck,
  LucideCopy,
  LucideDownload,
  LucideEllipsis,
  LucideFileUp,
  LucideGlobe,
  LucideHand,
  LucideLink,
  LucideLock,
  LucidePencil,
  LucideTrash,
  LucideTriangleAlert,
} from '@lucide/angular';
import { DeckValidation } from '../../../../../core/games/game-rules';
import { formatLabel } from '../../../../../core/games/games';
import { ManaColor, parseManaSymbol } from '../../../../../core/games/mtg/mana';
import { TYPE_NAMES } from '../../../../../core/games/pokemon/energy';
import { Auth } from '../../../../../core/auth/auth';
import { PokemonType } from '../../../../../core/models/card.model';
import {
  DeckWithCards,
  GAME_LABELS,
  VISIBILITY_LABELS,
} from '../../../../../core/models/deck.model';
import { GAME_ACCENTS } from '../../../../../core/theme/game-accents';
import { formatFullDate, formatRelative } from '../../../../../core/utils/date-format';
import { artCropFallback, toArtCrop } from '../../../../../core/utils/scryfall-image';
import { EnergySymbol } from '../../../../../shared/energy-symbol/energy-symbol';
import { ManaPip } from '../../../../../shared/mana-pip/mana-pip';
import { HeaderStat } from '../../state/header-stats';

export type DeckAction = 'edit' | 'import' | 'export' | 'hand' | 'duplicate' | 'delete' | 'share';

@Component({
  selector: 'app-deck-header',
  imports: [
    RouterLink,
    ManaPip,
    EnergySymbol,
    LucideArrowLeft,
    LucideCircleCheck,
    LucideCopy,
    LucideDownload,
    LucideEllipsis,
    LucideFileUp,
    LucideGlobe,
    LucideHand,
    LucideLink,
    LucideLock,
    LucidePencil,
    LucideTrash,
    LucideTriangleAlert,
  ],
  templateUrl: './deck-header.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu(true)',
  },
})
export class DeckHeader {
  protected readonly auth = inject(Auth);

  readonly deck = input.required<DeckWithCards>();
  readonly validation = input.required<DeckValidation>();
  /** The numbers row; the format status always closes it. */
  readonly stats = input.required<HeaderStat[]>();
  /** Magic: the deck's colors. */
  readonly colors = input<ManaColor[]>([]);
  /** Pokémon: the deck's types, most played first. */
  readonly energyTypes = input<PokemonType[]>([]);
  readonly action = output<DeckAction>();

  protected readonly accent = computed(() => GAME_ACCENTS[this.deck().game]);
  protected readonly gameLabel = computed(() => GAME_LABELS[this.deck().game]);
  protected readonly formatName = computed(() => formatLabel(this.deck().game, this.deck().format));
  protected readonly visibilityLabel = computed(() => VISIBILITY_LABELS[this.deck().visibility]);
  protected readonly colorPips = computed(() =>
    this.colors().map((color) => parseManaSymbol(color)),
  );
  protected readonly energyLabel = computed(
    () =>
      `Tipos: ${this.energyTypes()
        .map((type) => TYPE_NAMES[type])
        .join(', ')}`,
  );

  /** Magic: the art crop, falling back to the full card if it fails. Pokémon: the full card. */
  protected readonly coverArt = linkedSignal(() => {
    const url = this.deck().coverImageUrl;
    return url ? toArtCrop(url) : null;
  });

  protected readonly activity = computed(() => {
    const { updatedAt, createdAt } = this.deck();
    const timestamp = updatedAt ?? createdAt;
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const edited = !!updatedAt && updatedAt !== createdAt;
    return {
      iso: timestamp,
      label: `${edited ? 'Editado' : 'Criado'} ${formatRelative(date)}`,
      title: formatFullDate(date),
    };
  });

  /** The format cell: casual (no rules), valid, or how many issues and how bad. */
  protected readonly status = computed(() => {
    const { issues } = this.validation();
    const count = issues.length;
    if (!this.deck().format) return { kind: 'casual', count };
    if (count === 0) return { kind: 'valid', count };
    return {
      kind: issues.some((issue) => issue.severity === 'error') ? 'error' : 'warning',
      count,
    };
  });

  protected readonly menuOpen = signal(false);
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  protected onCoverError(): void {
    this.coverArt.set(artCropFallback(this.coverArt()));
  }

  protected run(action: DeckAction): void {
    this.menuOpen.set(false);
    this.action.emit(action);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.menu()?.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.menuButton()?.nativeElement.focus();
  }

  protected onMenuFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.menu()?.nativeElement.contains(next)) {
      this.menuOpen.set(false);
    }
  }
}
