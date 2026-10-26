import { Component, computed, input } from '@angular/core';
import { LucideChevronDown, LucideCircleAlert, LucideTriangleAlert } from '@lucide/angular';
import { DeckIssue } from '../../../../../core/games/game-rules';

/**
 * What keeps the deck from being legal in its format, collapsible. Errors
 * (broken rules) use the app's error color; warnings (an unfinished deck)
 * the warning one, each with its own icon so color isn't the only cue.
 */
@Component({
  selector: 'app-deck-issues',
  imports: [LucideChevronDown, LucideCircleAlert, LucideTriangleAlert],
  template: `
    <details
      id="deck-issues"
      open
      class="group rounded-lg border scroll-mt-24"
      [class]="hasErrors() ? 'border-purple/30 bg-purple/5' : 'border-warning/30 bg-warning/5'"
    >
      <summary
        class="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-text [&::-webkit-details-marker]:hidden"
      >
        <svg
          lucideTriangleAlert
          [size]="16"
          [class]="hasErrors() ? 'text-purple' : 'text-warning'"
        />
        {{ title() }}
        <svg
          lucideChevronDown
          [size]="16"
          class="ml-auto text-text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <ul class="space-y-1.5 px-4 pb-3 pl-10 text-sm">
        @for (issue of issues(); track issue.message) {
          <li class="flex items-start gap-2 text-text-muted">
            @if (issue.severity === 'error') {
              <svg lucideCircleAlert [size]="14" class="mt-0.5 shrink-0 text-purple" />
              <span class="sr-only">Erro:</span>
            } @else {
              <svg lucideTriangleAlert [size]="14" class="mt-0.5 shrink-0 text-warning" />
              <span class="sr-only">Aviso:</span>
            }
            <span>{{ issue.message }}</span>
          </li>
        }
      </ul>
    </details>
  `,
})
export class DeckIssues {
  readonly issues = input.required<DeckIssue[]>();
  readonly formatName = input.required<string>();

  protected readonly hasErrors = computed(() =>
    this.issues().some((issue) => issue.severity === 'error'),
  );

  protected readonly title = computed(() => {
    const count = this.issues().length;
    const noun = count === 1 ? 'pendência' : 'pendências';
    return `${count} ${noun} para o ${this.formatName()}`;
  });
}
