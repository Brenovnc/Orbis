import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
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
 * Everything to find, grouped by continent (or by region on the Brazil map); each group folds
 * away from its title, or all of them at once. Found places show their name with a discreet hint
 * (the capital, or the country in the capitals game). Places not found yet are empty slots so
 * the gaps are visible; with `reveal` (end screen) they show their name, marked with a terracotta
 * outline and a cross so they stand out without relying on color.
 */
@Component({
  selector: 'app-target-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (groups().length > 1) {
      <div class="mb-1 flex justify-end">
        <button
          type="button"
          class="min-h-9 rounded-md px-2 text-xs font-medium text-ink-muted hover:bg-accent-soft"
          [attr.aria-expanded]="allOpen()"
          (click)="toggleAll()"
        >
          {{ i18n.t(allOpen() ? 'list.foldAll' : 'list.unfoldAll') }}
        </button>
      </div>
    }
    @for (group of groups(); track group.id) {
      <section class="mb-3">
        <h3 class="mb-1">
          <button
            type="button"
            class="flex w-full items-center gap-1.5 rounded-md py-0.5 text-left text-sm font-semibold hover:bg-accent-soft"
            [attr.aria-expanded]="!isFolded(group.id)"
            (click)="toggle(group.id)"
          >
            <svg
              viewBox="0 0 20 20"
              class="size-4 shrink-0 fill-none stroke-current stroke-2 text-ink-muted transition-transform"
              [class.-rotate-90]="isFolded(group.id)"
              aria-hidden="true"
            >
              <path d="m5 8 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="min-w-0 flex-1">{{ group.label }}</span>
            <span
              class="rounded-full bg-black/5 px-2 py-0.5 text-xs font-normal tabular-nums"
              [attr.aria-label]="
                i18n.t('list.countOf', { found: group.found, total: group.items.length })
              "
            >
              {{ group.found }}/{{ group.items.length }}
            </span>
          </button>
        </h3>
        @if (!isFolded(group.id)) {
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
                    class="block h-6 w-9 rounded-md border border-dashed border-ink/30 bg-black/4"
                    aria-hidden="true"
                  ></span>
                }
              </li>
            }
          </ul>
        }
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

  /** Groups folded by the player; all start open. */
  private readonly folded = signal<ReadonlySet<string>>(new Set());

  protected isFolded(id: string): boolean {
    return this.folded().has(id);
  }

  protected toggle(id: string): void {
    this.folded.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected readonly allOpen = computed(() => this.groups().every((g) => !this.isFolded(g.id)));

  protected toggleAll(): void {
    this.folded.set(new Set(this.allOpen() ? this.groups().map((g) => g.id) : []));
  }

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
