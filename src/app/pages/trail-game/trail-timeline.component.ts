import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { StringKey } from '../../core/i18n/strings';
import { Target } from '../../core/game/targets';
import { TrailPaint } from '../../shared/map/map-state.service';

/** A place of a trail: its paint, sign and meaning, and how the trail goes on from it. */
export interface TrailStep {
  target: Target;
  paint: TrailPaint;
  sign: string;
  text: StringKey;
  next: 'land' | 'sea' | null;
}

/**
 * A trail as a vertical timeline, from the origin (top) to the destination: one dot per place, in
 * its color and with its sign, joined by a line that is wavy where the trail goes by sea.
 */
@Component({
  selector: 'app-trail-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ol class="flex flex-col text-sm">
      @for (step of steps(); track step.target.id) {
        <li class="relative pb-2 last:pb-0">
          <button
            type="button"
            class="flex min-h-9 w-full items-start gap-2 rounded-md px-1.5 py-2 text-left leading-5 hover:bg-accent-soft"
            (click)="picked.emit(step.target)"
            (pointerenter)="hovered.emit(step.target)"
            (pointerleave)="hovered.emit(null)"
            (focus)="hovered.emit(step.target)"
            (blur)="hovered.emit(null)"
          >
            <span class="grid size-5 shrink-0 place-items-center" aria-hidden="true">
              <span
                class="size-4 rounded-full bg-(--trail) ring-2 ring-(--trail-edge) ring-inset"
                [attr.data-trail]="step.paint"
              ></span>
            </span>
            <span class="min-w-0 flex-1 font-medium wrap-break-word">
              {{ i18n.name(step.target.place.name) }}
              @if (step.sign) {
                <span class="font-bold" aria-hidden="true">{{ step.sign }}</span>
                <span class="sr-only">{{ i18n.t(step.text) }}</span>
              } @else {
                <span class="text-xs font-normal text-ink-muted">({{ i18n.t(step.text) }})</span>
              }
            </span>
          </button>
          @if (step.next === 'sea') {
            <p class="pl-8.5 text-xs text-ink-muted">{{ i18n.t('trail.bySea') }}</p>
            <!-- Stretched from dot to dot, whatever the height of the name beside it. -->
            <svg
              viewBox="0 0 12 40"
              preserveAspectRatio="none"
              class="pointer-events-none absolute top-7 left-2.5 h-[calc(100%-1.25rem)] w-3 fill-none stroke-ink-muted stroke-2"
              aria-hidden="true"
            >
              <path
                d="M6 0q8 5 0 10t0 10 0 10 0 10"
                stroke-linecap="round"
                vector-effect="non-scaling-stroke"
              />
            </svg>
          } @else if (step.next === 'land') {
            <span
              class="pointer-events-none absolute top-7 -bottom-2 left-[0.9375rem] w-0.5 bg-ink-muted"
              aria-hidden="true"
            ></span>
          }
        </li>
      }
    </ol>
  `,
})
export class TrailTimelineComponent {
  protected readonly i18n = inject(I18nService);

  readonly steps = input.required<TrailStep[]>();
  readonly picked = output<Target>();
  /** The place the pointer or the keyboard is on (null when it leaves): the map highlights it. */
  readonly hovered = output<Target | null>();
}
