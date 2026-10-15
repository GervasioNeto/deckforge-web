import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RulesTextPart, tokenizeRulesText } from '../../core/games/mtg/mana';
import { ManaPip } from '../mana-pip/mana-pip';

interface Segment {
  /** Reminder text, "(...)", is set in italics like on the printed card. */
  reminder: boolean;
  parts: RulesTextPart[];
}

/** Oracle text with its symbols drawn as pips, one paragraph per line. */
@Component({
  selector: 'app-rules-text',
  imports: [NgTemplateOutlet, ManaPip],
  template: `
    @for (paragraph of paragraphs(); track $index) {
      <p>
        @for (segment of paragraph; track $index) {
          @if (segment.reminder) {
            <em class="text-text-muted">
              <ng-container *ngTemplateOutlet="parts; context: { $implicit: segment.parts }" />
            </em>
          } @else {
            <ng-container *ngTemplateOutlet="parts; context: { $implicit: segment.parts }" />
          }
        }
      </p>
    }

    <!-- Text parts sit tight inside <ng-container>, so no stray space lands before "," after a symbol. -->
    <ng-template #parts let-parts>
      @for (part of parts; track $index) {
        @if (isText(part)) {
          <ng-container>{{ part }}</ng-container>
        } @else {
          <app-mana-pip [symbol]="part" size="sm" class="mx-px align-[-2px]" />
        }
      }
    </ng-template>
  `,
  host: { class: 'block space-y-2 text-sm leading-relaxed text-text' },
})
export class RulesText {
  readonly text = input.required<string>();

  protected readonly paragraphs = computed<Segment[][]>(() =>
    this.text()
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) =>
        line
          .split(/(\([^()]*\))/)
          .filter(Boolean)
          .map((chunk) => ({ reminder: chunk.startsWith('('), parts: tokenizeRulesText(chunk) })),
      ),
  );

  protected isText(part: RulesTextPart): part is string {
    return typeof part === 'string';
  }
}
