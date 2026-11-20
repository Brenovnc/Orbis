import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type GameIconName =
  | 'keyboard'
  | 'landmark'
  | 'pointer'
  | 'map-pin'
  | 'flag'
  | 'shapes'
  | 'grid'
  | 'route'
  | 'radar'
  | 'settings'
  | 'info';

/**
 * Icons from Lucide (ISC license, see DATA_SOURCES.md): the SVG shapes copied as they are, without
 * the library. The nine games and the menu's "settings" and "info". `hard` adds the difficulty badge (a flame) in the corner.
 */
@Component({
  selector: 'app-game-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-grid size-5 place-items-center' },
  template: `
    <svg
      viewBox="0 0 24 24"
      class="size-full fill-none stroke-current stroke-2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('keyboard') {
          <path d="M10 8h.01" />
          <path d="M12 12h.01" />
          <path d="M14 8h.01" />
          <path d="M16 12h.01" />
          <path d="M18 8h.01" />
          <path d="M6 8h.01" />
          <path d="M7 16h10" />
          <path d="M8 12h.01" />
          <rect width="20" height="16" x="2" y="4" rx="2" />
        }
        @case ('pointer') {
          <path d="M14 4.1 12 6" />
          <path d="m5.1 8-2.9-.8" />
          <path d="m6 12-1.9 2" />
          <path d="M7.2 2.2 8 5.1" />
          <path
            d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z"
          />
        }
        @case ('landmark') {
          <line x1="3" x2="21" y1="22" y2="22" />
          <line x1="6" x2="6" y1="18" y2="11" />
          <line x1="10" x2="10" y1="18" y2="11" />
          <line x1="14" x2="14" y1="18" y2="11" />
          <line x1="18" x2="18" y1="18" y2="11" />
          <polygon points="12 2 20 7 4 7" />
        }
        @case ('map-pin') {
          <path
            d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
          />
          <circle cx="12" cy="10" r="3" />
        }
        @case ('settings') {
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('info') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        }
        @case ('flag') {
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        }
        @case ('shapes') {
          <path
            d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"
          />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <circle cx="17.5" cy="17.5" r="3.5" />
        }
        @case ('grid') {
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        }
        @case ('route') {
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <circle cx="18" cy="5" r="3" />
        }
        @case ('radar') {
          <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
          <path d="M4 6h.01" />
          <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" />
          <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" />
          <path d="M12 18h.01" />
          <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" />
          <circle cx="12" cy="12" r="2" />
          <path d="m13.41 10.59 5.66-5.66" />
        }
      }
    </svg>
    @if (hard()) {
      <span
        class="absolute -top-1.5 -right-2 grid size-3.5 place-items-center rounded-full bg-white text-missed-edge ring-1 ring-current"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-2.5 fill-current stroke-current stroke-2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          />
        </svg>
      </span>
    }
  `,
})
export class GameIconComponent {
  readonly name = input.required<GameIconName>();
  readonly hard = input(false);
}
