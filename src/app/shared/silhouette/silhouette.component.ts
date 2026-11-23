import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import type { Feature } from 'geojson';
import { feature } from 'topojson-client';
import { Layer, WorldUnitProperties } from '../../core/data/geo-data.models';
import { GeoDataService } from '../../core/data/geo-data.service';
import { ownShape, silhouettePath } from '../../core/data/silhouette';
import { I18nService } from '../../core/i18n/i18n.service';
import { Target } from '../../core/game/targets';
import { SettingsService } from '../../core/settings.service';
import { makeBrazilView, makeWorldView } from '../map/map-view';
import { measureShapes, surroundingsOf } from './surroundings';

const SIZE = 200;

/**
 * Only the outline of a place, alone, centred and big, in a projection centred on it. It is not
 * drawn at the map's scale, and says so. It never carries the name (the alt text would give it away).
 * With `surroundings`, a cut of the map instead: the place filled and, around it, only the outlines
 * of what else is there. The main map does not change.
 */
@Component({
  selector: 'app-silhouette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block rounded-2xl bg-panel p-2 shadow-panel backdrop-blur-md',
  },
  template: `
    @if (cut(); as c) {
      <svg
        [attr.viewBox]="c.viewBox"
        class="mx-auto block aspect-square w-full rounded-lg"
        role="img"
        [attr.aria-label]="i18n.t('silhouette.surroundings.aria')"
      >
        @for (offset of c.offsets; track offset) {
          <g [attr.transform]="'translate(' + offset + ' 0)'">
            <path class="surroundings" [attr.d]="c.others" />
            <path class="silhouette-fill" [attr.d]="c.place" />
            <path class="silhouette-edge" [attr.d]="c.placeOutline" />
          </g>
        }
        @if (c.ring; as ring) {
          <circle class="ring-halo" [attr.cx]="ring.x" [attr.cy]="ring.y" [attr.r]="ring.r" />
          <circle class="ring-line" [attr.cx]="ring.x" [attr.cy]="ring.y" [attr.r]="ring.r" />
        }
      </svg>
    } @else {
      <svg
        viewBox="0 0 ${SIZE} ${SIZE}"
        class="mx-auto block aspect-square w-full"
        role="img"
        [attr.aria-label]="i18n.t('silhouette.aria')"
      >
        <path class="silhouette-fill silhouette-edge" [attr.d]="path()" />
      </svg>
    }
    <p class="mt-1 text-center text-xs text-ink-muted">
      {{ i18n.t(cut() ? 'silhouette.surroundings' : 'silhouette.scale') }}
    </p>
  `,
  styles: `
    /* Not "outline": that is also a Tailwind utility, which draws a box around the path. */
    path,
    circle {
      fill: none;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .silhouette-fill {
      fill: var(--color-land);
    }
    .silhouette-edge {
      stroke: var(--color-border);
      stroke-width: 1.5px;
    }
    .surroundings {
      stroke: var(--color-surroundings);
      stroke-width: 1px;
      stroke-linecap: round;
    }
    /* Around a place too small to see in its surroundings. */
    .ring-halo {
      stroke: rgb(255 255 255 / 0.9);
      stroke-width: 4px;
    }
    .ring-line {
      stroke: var(--color-selected-edge);
      stroke-width: 2px;
    }
  `,
})
export class SilhouetteComponent {
  protected readonly i18n = inject(I18nService);
  private readonly geo = inject(GeoDataService);

  readonly target = input.required<Target>();
  readonly layer = input<Layer>('world');
  /** Shows what is around the place, instead of the outline alone. */
  readonly surroundings = input(false);
  /** Shapes of the places nearest to it, which the surroundings must reach. */
  readonly near = input<readonly string[]>([]);

  private readonly settings = inject(SettingsService);

  /** The shapes of the map: units of the world, or states with the countries around Brazil. */
  private readonly units = computed(() => {
    const world = this.geo.world();
    return world ? feature(world, world.objects.units).features : [];
  });
  private readonly features = computed<Feature[]>(() => {
    if (this.layer() === 'world') return this.units();
    const brazil = this.geo.brazil();
    return brazil ? feature(brazil, brazil.objects.states).features : [];
  });

  protected readonly path = computed(() => {
    const shape = ownShape(this.features(), this.target().id);
    return shape ? silhouettePath(shape, SIZE) : '';
  });

  private readonly projection = computed(() => this.settings.value().mapProjection);
  /** The same view as the map's; measured once, not at every question. */
  private readonly map = computed(() => {
    const brazil = this.geo.brazil();
    if (this.layer() === 'world') {
      const view = makeWorldView(this.projection());
      return { view, shapes: measureShapes(view, this.features()) };
    }
    if (!brazil) return null;
    const view = makeBrazilView(brazil);
    const countries = this.units().filter(
      (f) => (f.properties as WorldUnitProperties).country !== 'BRA',
    );
    return { view, shapes: measureShapes(view, [...this.features(), ...countries]) };
  });

  protected readonly cut = computed(() => {
    const map = this.surroundings() ? this.map() : null;
    if (!map) return null;
    return surroundingsOf(map.view, map.shapes, this.target().id, this.layer(), this.near());
  });
}
