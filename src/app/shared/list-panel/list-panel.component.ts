import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * The panel a game opens and closes with the list button of the bar (places to find, guesses): on
 * the right on large screens, a sheet at the bottom on phones. A help popover may go in the `help`
 * slot, next to the X.
 */
@Component({
  selector: 'app-list-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      data-map-cover
      class="fixed inset-x-0 bottom-0 z-10 flex h-[46dvh] animate-panel-in flex-col rounded-t-2xl bg-panel p-3 shadow-panel backdrop-blur-md md:inset-x-auto md:right-3 md:bottom-36 md:h-auto md:w-80 md:rounded-2xl"
      [class]="lower() ? 'md:top-44' : 'md:top-36'"
      [attr.aria-label]="heading()"
    >
      <div class="mb-2 flex items-center gap-1">
        <h2 class="min-w-0 flex-1 font-serif text-lg font-semibold">{{ heading() }}</h2>
        <ng-content select="[help]" />
        <button
          type="button"
          class="grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-black/5"
          [attr.aria-label]="i18n.t('list.close')"
          [title]="i18n.t('list.close')"
          (click)="closed.emit()"
        >
          <svg
            viewBox="0 0 20 20"
            class="size-4 fill-none stroke-current stroke-2"
            aria-hidden="true"
          >
            <path d="m5 5 10 10M15 5 5 15" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto"><ng-content /></div>
    </aside>
  `,
})
export class ListPanelComponent {
  protected readonly i18n = inject(I18nService);
  readonly heading = input.required<string>();
  /** The bar of the game is taller (it has a line above the answer field). */
  readonly lower = input(false);
  readonly closed = output<void>();
}
