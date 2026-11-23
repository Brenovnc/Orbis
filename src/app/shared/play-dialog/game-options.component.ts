import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Layer } from '../../core/data/geo-data.models';
import { GameOption, durationOf, gameOptions } from '../../core/game/game-options';
import { GameId, isTypingGame } from '../../core/games';
import { I18nService } from '../../core/i18n/i18n.service';
import { StringKey } from '../../core/i18n/strings';
import { SettingsService } from '../../core/settings.service';
import { SegmentedComponent, SegmentedOption } from '../ui/segmented.component';
import { SwitchComponent } from '../ui/switch.component';

/** Text keys of each option: the label, and `<key>.hint`. */
const TEXT = {
  silhouetteMode: 'settings.silhouetteMode',
  trailLevel: 'settings.trailLevel',
  trailForbidden: 'settings.trailForbidden',
  proximityClues: 'settings.proximityClues',
  timerEnabled: 'settings.timer',
  revealAfterErrors: 'settings.reveal',
  typoTolerance: 'settings.typo',
  mapBorders: 'settings.mapBorders',
  showNames: 'settings.names',
  hoverHighlight: 'settings.hover',
  learnMode: 'settings.learn',
  infoBox: 'settings.infoBox',
} as const satisfies Record<Exclude<GameOption, 'durationMinutes'>, StringKey>;

/** Values of the options that are not on/off, with their text keys. */
const CHOICES: Partial<Record<GameOption, { value: string | number; key?: StringKey }[]>> = {
  silhouetteMode: [
    { value: 'choices', key: 'settings.silhouetteMode.choices' },
    { value: 'hints', key: 'settings.silhouetteMode.hints' },
    { value: 'typing', key: 'settings.silhouetteMode.typing' },
  ],
  trailLevel: [
    { value: 'easy', key: 'settings.easy' },
    { value: 'normal', key: 'settings.normal' },
    { value: 'hard', key: 'settings.hard' },
  ],
  trailForbidden: [
    { value: 'none', key: 'settings.trailForbidden.none' },
    { value: 'sometimes', key: 'settings.trailForbidden.sometimes' },
    { value: 'always', key: 'settings.trailForbidden.always' },
  ],
  proximityClues: [
    { value: 'distance-direction', key: 'level.clues.distance-direction' },
    { value: 'distance', key: 'level.clues.distance' },
    { value: 'color', key: 'level.clues.color' },
  ],
  revealAfterErrors: [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 5 }],
  typoTolerance: [
    { value: 0, key: 'settings.typo.0' },
    { value: 1, key: 'settings.typo.1' },
    { value: 2, key: 'settings.typo.2' },
  ],
  mapBorders: [
    { value: 'all', key: 'settings.mapBorders.all' },
    { value: 'coast', key: 'settings.mapBorders.coast' },
  ],
};

/**
 * The options of a custom game: only those the game reads, starting from the current settings.
 * Changes are saved at once, in this browser.
 */
@Component({
  selector: 'app-game-options',
  imports: [SegmentedComponent, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block divide-y divide-line' },
  template: `
    @for (option of options(); track option) {
      @if (option === 'durationMinutes') {
        <label class="block py-2 text-sm font-medium">
          {{ i18n.t('settings.duration') }}
          @if (layer() === 'world') {
            <span class="block text-xs font-normal text-ink-muted">
              {{ i18n.t('settings.durationContinent') }}
            </span>
          }
          <input
            type="number"
            min="1"
            max="60"
            inputmode="numeric"
            class="mt-1.5 block w-24 rounded-lg border border-line bg-white px-2 py-1.5 text-sm font-normal"
            [value]="minutes()"
            (change)="setDuration($any($event.target))"
          />
        </label>
      } @else {
        @if (choices()[option]; as choice) {
          <div class="py-2">
            <span class="block text-sm font-medium">{{ i18n.t(text[option]) }}</span>
            <span class="mb-1.5 block text-xs text-ink-muted">{{ hint(text[option]) }}</span>
            <app-segmented
              [label]="i18n.t(text[option])"
              [options]="choice"
              [value]="$any(s()[option])"
              (changed)="set(option, $event)"
            />
            @if (option === 'trailForbidden' && noForbidden()) {
              <span class="mt-1.5 block text-xs font-medium">ⓘ {{ noForbidden() }}</span>
            }
          </div>
        } @else {
          <!-- No cursor on touch screens, so there is nothing to highlight. -->
          <app-switch
            class="block"
            [class]="option === 'hoverHighlight' ? '[@media(hover:none)]:hidden' : ''"
            [label]="i18n.t(text[option])"
            [hint]="hint(text[option])"
            [checked]="!!s()[option]"
            (changed)="set(option, $event)"
          />
        }
      }
    }
    @if (crossings()) {
      <app-switch
        class="block"
        [label]="i18n.t('settings.trailCrossings')"
        [hint]="i18n.t('settings.trailCrossings.hint')"
        [checked]="s().trailCrossings"
        (changed)="settings.update({ trailCrossings: $event })"
      />
    }
  `,
})
export class GameOptionsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsService);
  protected readonly s = this.settings.value;
  protected readonly text = TEXT;

  readonly game = input.required<GameId>();
  readonly layer = input.required<Layer>();
  /** Shows the Trail's sea crossings. */
  readonly crossings = input(false);
  /** Trail: says that no place can be forbidden here, if so. */
  readonly noForbidden = input('');

  protected readonly options = computed(() => gameOptions(this.game(), this.s()));
  protected readonly minutes = computed(() => durationOf(this.game(), this.layer(), this.s()));
  protected readonly choices = computed(() => {
    const translated: Partial<Record<GameOption, SegmentedOption[]>> = {};
    for (const [option, list] of Object.entries(CHOICES)) {
      translated[option as GameOption] = list.map(({ value, key }) => ({
        value,
        label: key ? this.i18n.t(key) : String(value),
      }));
    }
    return translated;
  });

  protected hint(key: (typeof TEXT)[keyof typeof TEXT]): string {
    return this.i18n.t(`${key}.hint`);
  }

  protected set(option: GameOption, value: string | number | boolean): void {
    this.settings.update({ [option]: value });
  }

  protected setDuration(input: HTMLInputElement): void {
    const minutes = Math.min(60, Math.max(1, Math.round(Number(input.value)) || 1));
    input.value = String(minutes);
    const durations = this.s().durationMinutes;
    const group = isTypingGame(this.game()) ? 'typing' : 'others';
    this.settings.update({
      durationMinutes: { ...durations, [group]: { ...durations[group], [this.layer()]: minutes } },
    });
  }
}
