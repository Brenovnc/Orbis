import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Place } from '../../core/data/geo-data.models';
import { GeoDataService, isState, isTerritory } from '../../core/data/geo-data.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ZoomableFlagComponent } from '../flag/zoomable-flag.component';

/**
 * Facts about a place, in a fixed spot that never covers the middle of the map
 * (bottom-left card on desktop, bottom strip on phones). Hides itself after a few seconds;
 * hovering or focusing it pauses the countdown.
 */
@Component({
  selector: 'app-info-box',
  imports: [ZoomableFlagComponent],
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
    @let p = place();
    <section
      class="relative overflow-hidden rounded-t-2xl border-t border-line bg-panel-solid px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-panel md:rounded-xl md:border md:p-4"
      aria-live="polite"
      [attr.aria-label]="i18n.t('info.about', { name: name() })"
    >
      <div class="flex items-start gap-3">
        <app-zoomable-flag
          class="shrink-0"
          [src]="'data/' + p.flag"
          [alt]="i18n.t('info.flag', { name: name() })"
          imgClass="h-9 w-auto rounded-sm ring-1 ring-black/15 md:h-11"
        />
        <div class="min-w-0 flex-1">
          <h2 class="font-serif text-xl leading-tight font-semibold md:text-2xl">
            {{ name() }}
          </h2>
        </div>
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

      <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        @if (p.capitals.length) {
          <dt class="text-ink-muted">
            {{ i18n.t(p.capitals.length > 1 ? 'info.capitals' : 'info.capital') }}
          </dt>
          <dd class="font-medium">{{ capitals() }}</dd>
        }
        @if (abbreviation(); as abbreviation) {
          <dt class="text-ink-muted">{{ i18n.t('info.abbr') }}</dt>
          <dd class="font-medium">{{ abbreviation }}</dd>
        }
        <dt class="text-ink-muted">
          {{ i18n.t(abbreviation() ? 'info.region' : 'info.continent') }}
        </dt>
        <dd class="font-medium">{{ group() }}</dd>
        <dt class="text-ink-muted">{{ i18n.t('info.area') }}</dt>
        <dd class="font-medium tabular-nums">{{ i18n.area(p.areaKm2) }}</dd>
        @if (adminName(); as admin) {
          <dt class="text-ink-muted">{{ i18n.t('info.administeredBy') }}</dt>
          <dd class="font-medium">{{ admin }}</dd>
        }
        @if (claimants(); as claimants) {
          <dt class="text-ink-muted">{{ i18n.t('info.claimedBy') }}</dt>
          <dd class="font-medium">{{ claimants }}</dd>
        }
      </dl>

      @if (statusNote(); as note) {
        <p class="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm text-ink">{{ note }}</p>
      }

      <!-- Countdown that also closes the box when it ends, so pausing it pauses both.
           Keyed by place so it restarts when another place is shown. -->
      @for (key of [p.id]; track key) {
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
export class InfoBoxComponent {
  private readonly geo = inject(GeoDataService);
  protected readonly i18n = inject(I18nService);

  readonly place = input.required<Place>();
  readonly autoHideMs = input(8000);
  readonly closed = output<void>();

  protected readonly paused = signal(false);

  protected readonly name = computed(() => this.i18n.name(this.place().name));
  protected readonly capitals = computed(() =>
    this.place()
      .capitals.map((c) => this.i18n.name(c.name))
      .join(', '),
  );
  protected readonly claimants = computed(() => {
    const place = this.place();
    return 'claimedBy' in place
      ? place.claimedBy.map((c) => this.i18n.name(c.name)).join(', ')
      : '';
  });
  /** State abbreviation (SP, RJ...); null for countries and territories. */
  protected readonly abbreviation = computed(() => {
    const place = this.place();
    return isState(place) ? place.id : null;
  });
  /** The continent, or the region of Brazil. */
  protected readonly group = computed(() => {
    const place = this.place();
    if (!isState(place)) return this.i18n.continent(place.continent);
    const region = this.geo.region(place.region);
    return region ? this.i18n.name(region.name) : place.region;
  });

  private readonly territory = computed(() => {
    const place = this.place();
    return isTerritory(place) ? place : null;
  });
  protected readonly adminName = computed(() => {
    const admin = this.territory()?.administeredBy;
    const place = admin ? this.geo.place(admin) : undefined;
    return place ? this.i18n.name(place.name) : undefined;
  });
  protected readonly statusNote = computed(() => {
    const place = this.place();
    const note = 'statusNote' in place ? place.statusNote : null;
    return note ? this.i18n.name(note) : undefined;
  });
}
