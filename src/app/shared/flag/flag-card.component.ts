import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ZoomableFlagComponent } from './zoomable-flag.component';

/** The flag to identify, in a floating card of the same style, spot and size as the silhouette's. */
@Component({
  selector: 'app-flag-card',
  imports: [ZoomableFlagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block rounded-2xl bg-panel p-2 shadow-panel backdrop-blur-md',
  },
  template: `
    <app-zoomable-flag
      [src]="src()"
      [alt]="i18n.t('click.flagAlt')"
      imgClass="mx-auto block w-full rounded-sm ring-1 ring-black/15"
    />
    <p class="mt-1 text-center text-xs text-ink-muted">
      <span class="pointer-coarse:hidden">{{ i18n.t('flag.enlargeClick') }}</span>
      <span class="hidden pointer-coarse:inline">{{ i18n.t('flag.enlarge') }}</span>
    </p>
  `,
})
export class FlagCardComponent {
  protected readonly i18n = inject(I18nService);
  readonly src = input.required<string>();
}
