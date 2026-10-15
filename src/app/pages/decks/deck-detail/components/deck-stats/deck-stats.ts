import { Component, computed, input } from '@angular/core';
import { COLOR_NAMES, parseManaSymbol } from '../../../../../core/games/mtg/mana';
import { GameType } from '../../../../../core/models/deck.model';
import { GAME_ACCENTS } from '../../../../../core/theme/game-accents';
import { ManaPip } from '../../../../../shared/mana-pip/mana-pip';
import { CURVE_MAX, DeckAnalysis } from '../../state/deck-analysis';

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/**
 * Mana curve, colored mana symbols and type breakdown of the main deck.
 * One series per chart, so a single hue (the game's accent) carries the
 * magnitude; in the color breakdown, identity comes from each row's pip.
 */
@Component({
  selector: 'app-deck-stats',
  imports: [ManaPip],
  templateUrl: './deck-stats.html',
})
export class DeckStats {
  readonly analysis = input.required<DeckAnalysis>();
  readonly game = input.required<GameType>();

  protected readonly fill = computed(() => GAME_ACCENTS[this.game()].fill);

  protected readonly curve = computed(() => {
    const curve = this.analysis().curve;
    const max = Math.max(1, ...curve.map((bar) => bar.count));
    const total = curve.reduce((sum, bar) => sum + bar.count, 0);
    return {
      total,
      bars: curve.map((bar) => ({
        ...bar,
        label: bar.cmc === CURVE_MAX ? `${CURVE_MAX}+` : String(bar.cmc),
        height: (bar.count / max) * 100,
        share: total > 0 ? percent.format(bar.count / total) : '0%',
      })),
    };
  });

  protected readonly colors = computed(() =>
    this.analysis().colorSymbols.map((entry) => ({
      ...entry,
      name: COLOR_NAMES[entry.color],
      pip: parseManaSymbol(entry.color),
      shareLabel: percent.format(entry.share),
    })),
  );

  protected readonly typeMax = computed(() =>
    Math.max(1, ...this.analysis().types.map((type) => type.count)),
  );
}
