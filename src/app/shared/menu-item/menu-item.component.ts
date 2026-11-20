import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameIconComponent, GameIconName } from '../ui/game-icon.component';

/** One game in the home menu: a link, or a dimmed non-link with the reason when not playable. */
@Component({
  selector: 'app-menu-item',
  imports: [GameIconComponent, NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (disabledReason(); as reason) {
      <div class="item opacity-60" aria-disabled="true">
        <ng-container [ngTemplateOutlet]="iconBox" />
        <span class="min-w-0">
          <span class="block font-medium">{{ title() }}</span>
          <span class="block text-xs text-ink-muted">{{ reason }}</span>
        </span>
      </div>
    } @else {
      <a class="item hover:bg-accent-soft" [routerLink]="link()">
        <ng-container [ngTemplateOutlet]="iconBox" />
        <span class="min-w-0">
          <span class="block font-medium">{{ title() }}</span>
          @if (inProgress()) {
            <span class="block text-xs font-medium text-accent">{{ inProgressText() }}</span>
          } @else {
            <span class="hidden text-xs text-ink-muted md:block">{{ description() }}</span>
          }
          @if (record()) {
            <span class="block text-xs text-ink-muted tabular-nums">{{ record() }}</span>
          }
        </span>
      </a>
    }
    <ng-template #iconBox>
      <span
        class="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent md:size-9"
      >
        <app-game-icon [name]="icon()" [hard]="hard()" />
      </span>
    </ng-template>
  `,
  styles: `
    .item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 0.5rem;
      padding: 0.375rem;
      font-size: 0.875rem;
    }
    @media (min-width: 48rem) {
      .item {
        gap: 0.75rem;
        padding: 0.375rem 0.5rem;
        font-size: 1rem;
      }
    }
  `,
})
export class MenuItemComponent {
  readonly icon = input.required<GameIconName>();
  readonly hard = input(false);
  readonly title = input.required<string>();
  readonly description = input('');
  readonly link = input.required<string[]>();
  readonly inProgress = input(false);
  readonly inProgressText = input('');
  readonly record = input('');
  /** Why the game cannot be played here; empty when it can. */
  readonly disabledReason = input('');
}
