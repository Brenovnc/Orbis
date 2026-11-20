import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { feature } from 'topojson-client';
import { Layer } from '../../core/data/geo-data.models';
import { GeoDataService } from '../../core/data/geo-data.service';
import { ownShape, silhouettePath } from '../../core/data/silhouette';
import { I18nService } from '../../core/i18n/i18n.service';
import { Target } from '../../core/game/targets';

const SIZE = 200;

/**
 * Only the outline of a place, alone, centred and big, in a projection centred on it. It is not
 * drawn at the map's scale, and says so. It never carries the name (the alt text would give it away).
 */
@Component({
  selector: 'app-silhouette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block rounded-2xl bg-panel p-2 shadow-panel backdrop-blur-md',
  },
  template: `
    <svg
      viewBox="0 0 ${SIZE} ${SIZE}"
      class="mx-auto block aspect-square w-full"
      role="img"
      [attr.aria-label]="i18n.t('silhouette.aria')"
    >
      <path class="silhouette-shape" [attr.d]="path()" />
    </svg>
    <p class="mt-1 text-center text-xs text-ink-muted">{{ i18n.t('silhouette.scale') }}</p>
  `,
  styles: `
    /* Not "outline": that is also a Tailwind utility, which draws a box around the path. */
    .silhouette-shape {
      fill: var(--color-land);
      stroke: var(--color-border);
      stroke-width: 1.5px;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
  `,
})
export class SilhouetteComponent {
  protected readonly i18n = inject(I18nService);
  private readonly geo = inject(GeoDataService);

  readonly target = input.required<Target>();
  readonly layer = input<Layer>('world');

  protected readonly path = computed(() => {
    const target = this.target();
    const world = this.geo.world();
    const brazil = this.geo.brazil();
    const features =
      this.layer() === 'brazil'
        ? brazil && feature(brazil, brazil.objects.states).features
        : world && feature(world, world.objects.units).features;
    const shape = features && ownShape(features, target.id);
    return shape ? silhouettePath(shape, SIZE) : '';
  });
}
