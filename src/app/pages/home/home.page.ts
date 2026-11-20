import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CONTINENT_CHOICES,
  PlayableContinent,
  isPlayableContinent,
} from '../../core/data/continent-frames';
import { GeoDataService } from '../../core/data/geo-data.service';
import { WorldUnitProperties } from '../../core/data/geo-data.models';
import {
  Target,
  buildBrazilTargets,
  buildWorldTargets,
  continentMinutes,
  inContinent,
  withCapitals,
} from '../../core/game/targets';
import { borderGraph, hasEnoughBorders } from '../../core/game/availability';
import { RecordsService, recordKey } from '../../core/game/records.service';
import { SavedGameStore } from '../../core/game/saved-game.store';
import { CHALLENGES, ChallengeId, GAMES, GameId, usesCapitals } from '../../core/games';
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

      @if (layer() === 'world') {
        <select
          class="mt-1.5 w-full rounded-lg bg-black/5 px-2 py-1.5 text-sm"
          [attr.aria-label]="i18n.t('home.continent')"
          (change)="chooseContinent($event)"
        >
          <option value="" [selected]="!continent()">{{ i18n.t('home.continentAll') }}</option>
          @for (id of continents; track id) {
            <option [value]="id" [selected]="continent() === id">{{ i18n.continent(id) }}</option>
          }
        </select>
      }

      <h2 class="mt-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
        {{ i18n.t('home.group.map') }}
      </h2>
      <!-- Two columns on phones so the panel covers as little of the map as possible. -->
      <ul class="mt-0.5 grid grid-cols-2 gap-0.5 md:grid-cols-1">
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

      <h2 class="mt-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
        {{ i18n.t('home.group.challenges') }}
      </h2>
      <ul class="mt-0.5 grid grid-cols-2 gap-0.5 md:grid-cols-1">
        @for (challenge of challenges; track challenge.id) {
          <li>
            @if (challenge.ready && !blockedReason(challenge.id)) {
              <a
                class="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm hover:bg-accent-soft md:gap-3 md:px-2 md:text-base"
                [routerLink]="link(challenge.id)"
              >
                <span
                  class="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent md:size-9"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="size-5 fill-none stroke-current stroke-[1.6]"
                    aria-hidden="true"
                  >
                    <path
                      [attr.d]="challenge.icon"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <span class="min-w-0">
                  <span class="block font-medium">{{ title(challenge.id) }}</span>
                  @if (inProgress(challenge.id)) {
                    <span class="block text-xs font-medium text-accent">{{
                      i18n.t('home.inProgress')
                    }}</span>
                  } @else {
                    <span class="hidden text-xs text-ink-muted md:block">{{
                      description(challenge.id)
                    }}</span>
                  }
                  @if (record(challenge.id); as text) {
                    <span class="block text-xs text-ink-muted tabular-nums">{{ text }}</span>
                  }
                </span>
              </a>
            } @else {
              <!-- Not playable (yet, or here): a plain element, not a link, marked as disabled. -->
              <div
                class="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm opacity-60 md:gap-3 md:px-2 md:text-base"
                aria-disabled="true"
              >
                <span
                  class="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent md:size-9"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="size-5 fill-none stroke-current stroke-[1.6]"
                    aria-hidden="true"
                  >
                    <path
                      [attr.d]="challenge.icon"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                <span class="min-w-0">
                  <span class="block font-medium">{{ challengeTitle(challenge.id) }}</span>
                  <span class="block text-xs text-ink-muted">{{
                    blockedReason(challenge.id) || i18n.t('home.soon')
                  }}</span>
                </span>
              </div>
            }
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
  private readonly geo = inject(GeoDataService);
  private readonly records = inject(RecordsService);
  private readonly rules = inject(SettingsService).value;
  protected readonly mapState = inject(MapStateService);
  protected readonly games = GAMES;
  protected readonly challenges = CHALLENGES;
  protected readonly continents = CONTINENT_CHOICES;
  protected readonly layers = [
    { id: 'world', label: 'home.world' },
    { id: 'brazil', label: 'home.brazil' },
  ] as const;
  protected readonly layer = this.mapState.layer;
  protected readonly continent = this.mapState.continent;

  constructor() {
    void this.geo.loadWorld();
    void this.geo.loadNeighbors();
  }

  /** Games that need land borders are off where there are too few (Oceania, for instance). */
  private readonly blocked = computed(() => {
    const data = this.geo.neighbors();
    const layer = this.layer();
    const territories = layer === 'world' && this.rules().includeTerritories;
    const world = this.geo.world();
    let targets: Target[] = [];
    if (layer === 'brazil') {
      targets = buildBrazilTargets(this.geo.states());
    } else if (world) {
      const units = world.objects.units.geometries.map((g) => g.properties as WorldUnitProperties);
      const all = buildWorldTargets(
        this.geo.countries(),
        this.geo.territories(),
        units,
        territories,
      );
      targets = inContinent(all, this.activeContinent());
    }
    const blocked = new Set<ChallengeId>();
    // Nothing is blocked until the data is there.
    if (!data || targets.length === 0) return blocked;
    const ids = targets.map((target) => target.id);
    for (const { id, ready } of CHALLENGES) {
      if (ready && !hasEnoughBorders(id, ids, borderGraph(data, layer, territories, id)))
        blocked.add(id);
    }
    return blocked;
  });

  protected blockedReason(id: ChallengeId): string {
    const continent = this.activeContinent();
    if (!this.blocked().has(id) || !continent) return '';
    return this.i18n.t('home.fewBorders', { continent: this.i18n.continent(continent) });
  }

  protected chooseContinent(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.mapState.setContinent(isPlayableContinent(value) ? value : null);
  }

  /** Text keys of the Brazil version of a game start with "game.br.". */
  private key(id: GameId, part: 'title' | 'desc') {
    return `game.${this.layer() === 'brazil' ? 'br.' : ''}${id}.${part}` as const;
  }

  protected challengeTitle(id: ChallengeId): string {
    return this.i18n.t(`game.${id}.title`);
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
    const territories = layer === 'world' && rules.includeTerritories;
    const best = this.records.get(
      recordKey({
        gameId: id,
        layer,
        territories,
        durationMs: this.durationMs(id, territories),
        continent: this.activeContinent(),
      }),
    );
    if (!best) return '';
    const parts = [`${best.found}/${best.total}`];
    if (best.guesses !== undefined) {
      parts.length = 0;
      parts.push(
        best.guesses === 1
          ? this.i18n.t('frame.guess1')
          : this.i18n.t('frame.guessesN', { n: best.guesses }),
      );
    } else if (best.errors !== undefined) {
      parts.push(
        best.errors === 1
          ? this.i18n.t('frame.error1')
          : this.i18n.t('frame.errorsN', { n: best.errors }),
      );
    }
    parts.push(formatClock(best.elapsedMs, 'up'));
    return this.i18n.t('home.record', { record: parts.join(' · ') });
  }

  /** The continent filter only exists on the world map. */
  private activeContinent(): PlayableContinent | null {
    return this.layer() === 'world' ? this.continent() : null;
  }

  /** The time limit a new game would have (a continent gets a share of the world's). */
  private durationMs(id: GameId, territories: boolean): number | null {
    const rules = this.rules();
    const layer = this.layer();
    if (!rules.timerEnabled) return null;
    const world = this.geo.world();
    const continent = this.activeContinent();
    if (!continent || !world) return rules.durationMinutes[layer] * 60_000;
    const units = world.objects.units.geometries.map((g) => g.properties as WorldUnitProperties);
    let all = buildWorldTargets(this.geo.countries(), this.geo.territories(), units, territories);
    if (usesCapitals(id)) all = withCapitals(all);
    const part = inContinent(all, continent).length;
    return continentMinutes(rules.durationMinutes.world, part, all.length) * 60_000;
  }

  protected inProgress(id: GameId): boolean {
    return this.saved.has(id, this.layer(), this.activeContinent());
  }
}
