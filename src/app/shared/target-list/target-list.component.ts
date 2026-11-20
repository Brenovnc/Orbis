import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AnswerMode } from '../../core/game/answers';
import { Layer } from '../../core/data/geo-data.models';
import { GeoDataService } from '../../core/data/geo-data.service';
import { CONTINENT_ORDER, Target } from '../../core/game/targets';
import { I18nService } from '../../core/i18n/i18n.service';

interface Group {
  id: string;
  label: string;
  found: number;
  items: { target: Target; found: boolean; label: string; hint: string }[];
}

/**
 * Everything to find, grouped by continent (or by region on the Brazil map). Found places show their name with a discreet hint
 * (the capital, or the country in the capitals game). Places not found yet are empty slots so
 * the gaps are visible; with `reveal` (end screen) they show their name, marked with a terracotta
 * outline and a cross so they stand out without relying on color.
 */
@Component({
  selector: 'app-target-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (group of groups(); track group.id) {
      <section class="mb-3">
        <h3
          class="mb-1 flex items-baseline justify-between text-xs font-semibold tracking-wide text-ink-muted uppercase"
        >
          {{ group.label }}
          <span
            class="tabular-nums"
            [attr.aria-label]="
              i18n.t('list.countOf', { found: group.found, total: group.items.length })
            "
          >
            {{ group.found }}/{{ group.items.length }}
          </span>
        </h3>
        <ul class="flex flex-wrap gap-1">
          @for (item of group.items; track item.target.id) {
            <li>
              @if (item.found || reveal()) {
                <button
                  type="button"
                  class="flex max-w-full items-baseline gap-1.5 rounded-md border px-2 py-0.5 text-left text-sm hover:bg-accent-soft"
                  [class.border-line]="item.found"
                  [class.bg-white]="item.found"
                  [class.border-missed-edge]="!item.found"
                  [class.bg-missed]="!item.found"
                  (click)="picked.emit(item.target)"
                >
                  <span aria-hidden="true" class="text-xs">{{ item.found ? '✓' : '✗' }}</span>
                  <span class="sr-only">{{
                    i18n.t(item.found ? 'list.found' : 'list.missed')
                  }}</span>
                  <span class="font-medium">{{ item.label }}</span>
                  <span class="truncate text-xs text-ink-muted">{{ item.hint }}</span>
                </button>
              } @else {
                <span
                  class="block h-6 w-9 rounded-md border border-dashed border-line"
                  aria-hidden="true"
                ></span>
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class TargetListComponent {
  protected readonly i18n = inject(I18nService);
  private readonly geo = inject(GeoDataService);

  readonly layer = input<Layer>('world');
  readonly targets = input.required<Target[]>();
  readonly found = input.required<ReadonlySet<string>>();
  readonly mode = input.required<AnswerMode>();
  /** Show names of places not found (end screen). */
  readonly reveal = input(false);
  readonly picked = output<Target>();

  protected readonly groups = computed<Group[]>(() => {
    const found = this.found();
    const mode = this.mode();
    const name = (target: Target) => this.i18n.name(target.place.name);
    const capitals = (target: Target) =>
      target.place.capitals.map((c) => this.i18n.name(c.name)).join(', ');
    const sections =
      this.layer() === 'brazil'
        ? this.geo
            .regions()
            .map((region) => ({ id: region.id, label: this.i18n.name(region.name) }))
        : CONTINENT_ORDER.map((id) => ({ id, label: this.i18n.continent(id) }));
    return sections.flatMap((section) => {
      const items = this.targets()
        .filter((target) => target.group === section.id)
        .map((target) => ({
          target,
          found: found.has(target.id),
          label: mode === 'countries' ? name(target) : capitals(target),
          hint: mode === 'countries' ? capitals(target) : name(target),
        }))
        .sort((a, b) => this.i18n.compare(a.label, b.label));
      if (items.length === 0) return [];
      return [
        {
          id: section.id,
          label: section.label,
          found: items.filter((item) => item.found).length,
          items,
        },
      ];
    });
  });
}
