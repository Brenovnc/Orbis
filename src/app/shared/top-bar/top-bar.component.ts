import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * Semi-transparent bar with the question in large serif type. The question is projected as
 * content, so each game decides what it shows (a name, a capital, a flag, an input). Elements
 * marked with the `actions` attribute go in a second row of buttons (pause, give up...), and an
 * answer too wide for the middle column (choices) goes between the two, marked with `answers`.
 *
 * Three columns with sides of the same width keep the question centered on the whole screen,
 * and every size is fixed, so nothing moves when the game is paused or the clock changes.
 */
@Component({
  selector: 'app-top-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      data-map-cover-top
      class="fixed inset-x-0 top-0 z-20 border-b border-line bg-white/65 pt-[env(safe-area-inset-top)] backdrop-blur-md"
    >
      <div
        class="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-x-2 px-3 pt-1.5 md:grid-cols-[minmax(9.5rem,1fr)_minmax(0,44rem)_minmax(9.5rem,1fr)] md:gap-x-4 md:px-5 md:pt-3"
      >
        <div class="flex justify-self-start">
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full text-ink hover:bg-black/5"
            [attr.aria-label]="i18n.t('bar.back')"
            [title]="i18n.t('bar.back')"
            (click)="menu.emit()"
          >
            <svg
              viewBox="0 0 20 20"
              class="size-5 fill-none stroke-current stroke-2"
              aria-hidden="true"
            >
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          @if (hasSettings()) {
            <button
              type="button"
              class="grid size-10 place-items-center rounded-full text-ink hover:bg-black/5"
              [attr.aria-label]="i18n.t('bar.settings')"
              [title]="i18n.t('bar.settings')"
              (click)="settings.emit()"
            >
              <!-- "settings" icon from Lucide (ISC), see DATA_SOURCES.md -->
              <svg
                viewBox="0 0 24 24"
                class="size-5 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path
                  d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          }
        </div>

        <div
          class="flex min-h-[4.5rem] min-w-0 flex-col justify-center text-center font-serif text-xl leading-tight text-ink md:min-h-[4.75rem] md:text-4xl"
          aria-live="polite"
        >
          <ng-content />
        </div>

        <dl
          class="grid grid-cols-[auto_auto] items-center justify-self-end gap-x-1.5 text-xs text-ink-muted tabular-nums md:text-sm"
        >
          @if (time()) {
            <dt class="flex items-center gap-1" [title]="i18n.t('bar.time')">
              <svg
                viewBox="0 0 20 20"
                class="size-3.5 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <circle cx="10" cy="11" r="6.5" />
                <path d="M10 7.5V11l2.5 1.5M8 2.5h4" stroke-linecap="round" />
              </svg>
              <span class="sr-only md:not-sr-only">{{ i18n.t('bar.time') }}</span>
            </dt>
            <dd class="min-w-[4.5ch] text-right font-medium text-ink" [title]="i18n.t('bar.time')">
              {{ time() }}
            </dd>
          }
          @if (progress()) {
            <dt class="flex items-center gap-1 text-found-edge" [title]="label()">
              <svg
                viewBox="0 0 20 20"
                class="size-3.5 fill-none stroke-current stroke-[2.5]"
                aria-hidden="true"
              >
                <path d="m4 10.5 4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span class="sr-only md:not-sr-only">{{ label() }}</span>
            </dt>
            <dd class="min-w-[4.5ch] text-right font-medium text-ink" [title]="label()">
              {{ progress() }}
            </dd>
          }
          @if (errors() !== undefined) {
            <dt class="flex items-center gap-1 text-missed-edge" [title]="i18n.t('bar.errors')">
              <svg
                viewBox="0 0 20 20"
                class="size-3.5 fill-none stroke-current stroke-[2.5]"
                aria-hidden="true"
              >
                <path d="m5 5 10 10M15 5 5 15" stroke-linecap="round" />
              </svg>
              <span class="sr-only md:not-sr-only">{{ i18n.t('bar.errors') }}</span>
            </dt>
            <dd
              class="min-w-[4.5ch] text-right font-medium text-ink"
              [title]="i18n.t('bar.errors')"
            >
              {{ errors() }}
            </dd>
          }
        </dl>
      </div>

      <ng-content select="[answers]" />

      <!-- Fixed height even when empty (end of game), so the bar never changes size. -->
      <div class="flex min-h-10 items-center justify-center gap-1 px-3 pb-1 md:pb-1.5">
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
})
export class TopBarComponent {
  protected readonly i18n = inject(I18nService);
  readonly time = input<string>();
  readonly progress = input<string>();
  /** What the progress counts, as a word ("Acertos" by default). */
  readonly progressLabel = input<string>();
  /** Wrong clicks so far; leave undefined in games without errors. */
  readonly errors = input<number>();
  protected readonly label = computed(() => this.progressLabel() ?? this.i18n.t('bar.hits'));
  /** Shows the settings gear (games only). */
  readonly hasSettings = input(false);
  readonly menu = output<void>();
  readonly settings = output<void>();
}
