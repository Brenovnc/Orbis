import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecordsService, recordKey } from '../../core/game/records.service';
import { SavedGameStore } from '../../core/game/saved-game.store';
import { GAMES, GameId } from '../../core/games';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatClock } from '../../core/labels';
import { SettingsService } from '../../core/settings.service';
import { MapStateService } from '../../shared/map/map-state.service';
import { SettingsPanelService } from '../../shared/settings-panel/settings-panel.component';

/** Home: the map stays full screen and the menu is a small panel floating over it. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 animate-panel-in rounded-2xl bg-panel p-3 shadow-panel backdrop-blur-md md:inset-x-auto md:top-4 md:bottom-auto md:left-4 md:w-[22rem] md:p-4"
      [attr.aria-label]="i18n.t('home.menu')"
    >
      <div class="flex items-baseline gap-2 md:block">
        <h1 class="font-serif text-2xl leading-none font-semibold tracking-tight md:text-3xl">
          Orbis
        </h1>
        <p class="text-xs text-ink-muted md:mt-1 md:text-sm">{{ i18n.t('home.tagline') }}</p>
      </div>

      <div
        class="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1 text-sm md:mt-3"
        role="group"
        [attr.aria-label]="i18n.t('home.map')"
      >
        @for (option of layers; track option.id) {
          <button
            type="button"
            class="rounded-md py-1.5"
            [class.bg-white]="layer() === option.id"
            [class.font-medium]="layer() === option.id"
            [class.shadow-sm]="layer() === option.id"
            [class.text-ink-muted]="layer() !== option.id"
            [attr.aria-pressed]="layer() === option.id"
            (click)="mapState.setLayer(option.id)"
          >
            {{ i18n.t(option.label) }}
          </button>
        }
      </div>

      <!-- Two columns on phones so the panel covers as little of the map as possible. -->
      <ul class="mt-2 grid grid-cols-2 gap-0.5 md:grid-cols-1">
        @for (game of games; track game.id) {
          <li>
            <a
              class="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm hover:bg-accent-soft md:gap-3 md:px-2 md:text-base"
              [routerLink]="link(game.id)"
            >
              <span
                class="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent md:size-9"
              >
                <svg
                  viewBox="0 0 20 20"
                  class="size-5 fill-none stroke-current stroke-[1.6]"
                  aria-hidden="true"
                >
                  <path [attr.d]="game.icon" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <span class="min-w-0">
                <span class="block font-medium">{{ title(game.id) }}</span>
                @if (inProgress(game.id)) {
                  <span class="block text-xs font-medium text-accent">{{
                    i18n.t('home.inProgress')
                  }}</span>
                } @else {
                  <span class="hidden text-xs text-ink-muted md:block">{{
                    description(game.id)
                  }}</span>
                }
                @if (record(game.id); as text) {
                  <span class="block text-xs text-ink-muted tabular-nums">{{ text }}</span>
                }
              </span>
            </a>
          </li>
        }
      </ul>

      <div class="mt-2 flex gap-1 border-t border-line pt-2 text-sm text-ink-muted">
        <button
          type="button"
          class="rounded-md px-2.5 py-2 hover:bg-accent-soft"
          (click)="settings.show(false)"
        >
          {{ i18n.t('home.settings') }}
        </button>
        <a routerLink="/sobre" class="rounded-md px-2.5 py-2 hover:bg-accent-soft">
          {{ i18n.t('home.about') }}
        </a>
      </div>
    </nav>
  `,
})
export class HomePage {
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsPanelService);
  private readonly saved = inject(SavedGameStore);
  private readonly records = inject(RecordsService);
  private readonly rules = inject(SettingsService).value;
  protected readonly mapState = inject(MapStateService);
  protected readonly games = GAMES;
  protected readonly layers = [
    { id: 'world', label: 'home.world' },
    { id: 'brazil', label: 'home.brazil' },
  ] as const;
  protected readonly layer = this.mapState.layer;

  /** Text keys of the Brazil version of a game start with "game.br.". */
  private key(id: GameId, part: 'title' | 'desc') {
    return `game.${this.layer() === 'brazil' ? 'br.' : ''}${id}.${part}` as const;
  }

  protected title(id: GameId): string {
    return this.i18n.t(this.key(id, 'title'));
  }

  protected description(id: GameId): string {
    return this.i18n.t(this.key(id, 'desc'));
  }

  protected link(id: GameId): string[] {
    return this.layer() === 'brazil' ? ['/jogo', 'brasil', id] : ['/jogo', id];
  }

  /** The record of the mode the current settings would start (same rules as a new game). */
  protected record(id: GameId): string {
    const rules = this.rules();
    const layer = this.layer();
    const best = this.records.get(
      recordKey({
        gameId: id,
        layer,
        territories: layer === 'world' && rules.includeTerritories,
        durationMs: rules.timerEnabled ? rules.durationMinutes[layer] * 60_000 : null,
      }),
    );
    if (!best) return '';
    const parts = [`${best.found}/${best.total}`];
    if (best.errors !== undefined) {
      parts.push(
        best.errors === 1
          ? this.i18n.t('frame.error1')
          : this.i18n.t('frame.errorsN', { n: best.errors }),
      );
    }
    parts.push(formatClock(best.elapsedMs, 'up'));
    return this.i18n.t('home.record', { record: parts.join(' · ') });
  }

  protected inProgress(id: GameId): boolean {
    return this.saved.has(id, this.layer());
  }
}
