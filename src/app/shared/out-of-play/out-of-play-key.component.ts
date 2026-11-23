import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GeoDataService } from '../../core/data/geo-data.service';
import { isOtherContinent } from '../../core/game/targets';
import { I18nService } from '../../core/i18n/i18n.service';
import { MapStateService } from '../map/map-state.service';

/**
 * "Fora do jogo": the key for the sand gray of the areas that are no target, shown at the end of
 * a game next to the list or legend. It only appears when such an area is in view, so it is
 * absent on the Brazil map and when a continent leaves all of them out.
 */
@Component({
  selector: 'app-out-of-play-key',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <p class="flex items-center gap-2 text-xs text-ink-muted">
        <span
          class="size-3.5 shrink-0 rounded-sm bg-out-of-play ring-1 ring-out-of-play-edge"
          aria-hidden="true"
        ></span>
        {{ i18n.t('outOfPlay.legend') }}
      </p>
    }
  `,
})
export class OutOfPlayKeyComponent {
  protected readonly i18n = inject(I18nService);
  private readonly geo = inject(GeoDataService);
  private readonly map = inject(MapStateService);

  protected readonly visible = computed(() => {
    const continent = this.map.continent();
    return [...this.map.outOfPlay().keys()].some(
      (id) => !isOtherContinent(this.geo.place(id), continent),
    );
  });
}
