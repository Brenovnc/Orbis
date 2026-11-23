import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LocalizedText } from '../../core/data/geo-data.models';
import { OutOfPlayKind } from '../../core/game/targets';
import { I18nService } from '../../core/i18n/i18n.service';

/**
 * The card for a click on land of no country (Antarctica, Kosovo, Bir Tawil...): a generic
 * sentence with its name, no claim about who it belongs to. It sits where the info card sits and
 * hides itself like it, unless the pointer or focus rests on it.
 */
@Component({
  selector: 'app-out-of-play-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'fixed inset-x-0 bottom-0 z-30 block md:inset-x-auto md:bottom-4 md:left-4 md:w-96 animate-panel-in',
    'data-map-cover': '',
    '(mouseenter)': 'paused.set(true)',
    '(mouseleave)': 'paused.set(false)',
    '(focusin)': 'paused.set(true)',
    '(focusout)': 'paused.set(false)',
  },
  template: `
    <section
      class="relative overflow-hidden rounded-t-2xl border-t border-line bg-panel-solid px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-panel md:rounded-xl md:border md:p-4"
      aria-live="polite"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-0.5 size-4 shrink-0 rounded-sm bg-out-of-play ring-2 ring-out-of-play-edge"
          aria-hidden="true"
        ></span>
        <p class="min-w-0 flex-1 text-sm leading-snug font-medium md:text-base">{{ text() }}</p>
        <button
          type="button"
          class="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-black/5"
          [attr.aria-label]="i18n.t('info.close')"
          [title]="i18n.t('info.close')"
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

      <!-- Keyed by name so the countdown restarts when another area is clicked. -->
      @for (key of [name().en]; track key) {
        <div
          class="countdown absolute inset-x-0 bottom-0 h-1 origin-left bg-accent/40"
          [style.animation-duration.ms]="autoHideMs()"
          [style.animation-play-state]="paused() ? 'paused' : 'running'"
          (animationend)="closed.emit()"
          aria-hidden="true"
        ></div>
      }
    </section>
  `,
  styles: `
    .countdown {
      animation-name: countdown;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }
    @keyframes countdown {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }
  `,
})
export class OutOfPlayCardComponent {
  protected readonly i18n = inject(I18nService);

  readonly name = input.required<LocalizedText>();
  /** A place of the game has the normal info card instead (see the game page). */
  readonly kind = input.required<Exclude<OutOfPlayKind, 'game'>>();
  readonly autoHideMs = input(8000);
  readonly closed = output<void>();

  protected readonly paused = signal(false);
  protected readonly text = computed(() =>
    this.i18n.t(`outOfPlay.${this.kind()}`, { name: this.i18n.name(this.name()) }),
  );
}
