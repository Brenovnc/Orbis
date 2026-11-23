import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmService } from '../../core/confirm/confirm.service';
import { durationOf, matchingPreset } from '../../core/game/game-options';
import { levelNotes } from '../../core/game/level-notes';
import { CONTINENT_CHOICES, isPlayableContinent } from '../../core/data/continent-frames';
import { GeoDataService } from '../../core/data/geo-data.service';
import { WorldUnitProperties } from '../../core/data/geo-data.models';
import {
  buildBrazilTargets,
  buildWorldTargets,
  continentMinutes,
  inContinent,
  withCapitals,
} from '../../core/game/targets';
import {
  borderGraph,
  canForbid,
  hasEnoughBorders,
  withCrossings,
} from '../../core/game/availability';
import { RecordsService, recordKey, recordLevel } from '../../core/game/records.service';
import { SavedGameStore } from '../../core/game/saved-game.store';
import {
  CHALLENGES,
  ChallengeId,
  GAMES,
  GameId,
  hasTimeLimit,
  usesCapitals,
} from '../../core/games';
import { I18nService } from '../../core/i18n/i18n.service';
import { StringKey } from '../../core/i18n/strings';
import { formatClock } from '../../core/labels';
import { PRESETS, Preset, PresetValues, SettingsService } from '../../core/settings.service';
import { MapStateService } from '../../shared/map/map-state.service';
import { MenuItemComponent } from '../../shared/menu-item/menu-item.component';
import { PlayDialogComponent, PlayRequest } from '../../shared/play-dialog/play-dialog.component';
import { GameIconComponent, GameIconName } from '../../shared/ui/game-icon.component';
import { SettingsPanelService } from '../../shared/settings-panel/settings-panel.component';

/** Home: the map stays full screen and the menu is a small panel floating over it. */
@Component({
  selector: 'app-home-page',
  imports: [GameIconComponent, MenuItemComponent, PlayDialogComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 animate-panel-in rounded-2xl bg-panel p-3 shadow-panel backdrop-blur-md md:inset-x-auto md:top-4 md:bottom-auto md:left-4 md:w-[22rem] md:p-4"
      [attr.aria-label]="i18n.t('home.menu')"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-baseline gap-2 md:block">
          <h1 class="font-serif text-2xl leading-none font-semibold tracking-tight md:text-3xl">
            Orbis
          </h1>
          <p class="hidden text-xs text-ink-muted min-[480px]:block md:mt-1 md:text-sm">
            {{ i18n.t('home.tagline') }}
          </p>
        </div>
        <!-- Negative margins keep the 40px touch targets from making the header taller. -->
        <div class="-my-2 -mr-1.5 flex shrink-0 text-ink-muted">
          <button
            type="button"
            class="grid size-10 place-items-center rounded-full hover:bg-accent-soft"
            [attr.aria-label]="i18n.t('home.settings')"
            [title]="i18n.t('home.settings')"
            (click)="settings.show(false)"
          >
            <app-game-icon name="settings" />
          </button>
          <a
            routerLink="/sobre"
            class="grid size-10 place-items-center rounded-full hover:bg-accent-soft"
            [attr.aria-label]="i18n.t('home.about')"
            [title]="i18n.t('home.about')"
          >
            <app-game-icon name="info" />
          </a>
        </div>
      </div>

      <!-- Map and continent side by side on phones, to save height. -->
      <div class="mt-2 flex gap-1.5 md:mt-3 md:block">
        <div
          class="grid min-w-0 flex-1 grid-cols-2 gap-1 rounded-lg bg-black/5 p-1 text-sm"
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
            class="min-w-0 flex-1 rounded-lg bg-black/5 px-2 py-1.5 text-sm md:mt-1.5 md:w-full"
            [attr.aria-label]="i18n.t('home.continent')"
            (change)="chooseContinent($event)"
          >
            <option value="" [selected]="!continent()">{{ i18n.t('home.continentAll') }}</option>
            @for (id of continents; track id) {
              <option [value]="id" [selected]="continent() === id">{{ i18n.continent(id) }}</option>
            }
          </select>
        }
      </div>

      <!-- On phones one group at a time, so the panel leaves most of the map visible. -->
      <div
        class="mt-1.5 grid grid-cols-2 gap-1 border-b border-line md:hidden"
        role="tablist"
        [attr.aria-label]="i18n.t('home.groups')"
      >
        @for (option of groups; track option.id) {
          <button
            type="button"
            role="tab"
            class="-mb-px border-b-2 py-1.5 text-sm"
            [class.border-accent]="group() === option.id"
            [class.font-semibold]="group() === option.id"
            [class.text-accent]="group() === option.id"
            [class.border-transparent]="group() !== option.id"
            [class.text-ink-muted]="group() !== option.id"
            [attr.aria-selected]="group() === option.id"
            [attr.aria-controls]="'menu-' + option.id"
            (click)="group.set(option.id)"
          >
            {{ i18n.t(option.label) }}
          </button>
        }
      </div>

      <h2 class="mt-2 hidden text-xs font-medium tracking-wide text-ink-muted uppercase md:block">
        {{ i18n.t('home.group.map') }}
      </h2>
      <!-- Two columns on phones so the panel covers as little of the map as possible. -->
      <ul
        id="menu-map"
        class="mt-0.5 grid-cols-2 gap-0.5 md:grid md:grid-cols-1"
        [class.hidden]="group() !== 'map'"
        [class.grid]="group() === 'map'"
      >
        @for (item of items().games; track item.id) {
          <li>
            <app-menu-item
              [icon]="item.icon"
              [hard]="item.hard"
              [title]="item.title"
              [description]="item.description"
              [inProgress]="item.inProgress"
              [inProgressText]="i18n.t('home.inProgress')"
              [record]="item.record"
              (chosen)="playing.set(item.id)"
            />
          </li>
        }
      </ul>

      <h2 class="mt-2 hidden text-xs font-medium tracking-wide text-ink-muted uppercase md:block">
        {{ i18n.t('home.group.challenges') }}
      </h2>
      <ul
        id="menu-challenges"
        class="mt-0.5 grid-cols-2 gap-0.5 md:grid md:grid-cols-1"
        [class.hidden]="group() !== 'challenges'"
        [class.grid]="group() === 'challenges'"
      >
        @for (item of items().challenges; track item.id) {
          <li>
            <app-menu-item
              [icon]="item.icon"
              [hard]="item.hard"
              [title]="item.title"
              [description]="item.description"
              [inProgress]="item.inProgress"
              [inProgressText]="i18n.t('home.inProgress')"
              [record]="item.record"
              [disabledReason]="item.disabledReason"
              (chosen)="playing.set(item.id)"
            />
          </li>
        }
      </ul>
    </nav>

    <app-play-dialog
      [request]="request()"
      (started)="start($event)"
      (resumed)="resume()"
      (closed)="playing.set(null)"
    />
  `,
})
export class HomePage {
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsPanelService);
  private readonly saved = inject(SavedGameStore);
  private readonly geo = inject(GeoDataService);
  private readonly records = inject(RecordsService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly settingsService = inject(SettingsService);
  private readonly rules = this.settingsService.value;
  protected readonly mapState = inject(MapStateService);
  protected readonly continents = CONTINENT_CHOICES;
  protected readonly layers = [
    { id: 'world', label: 'home.world' },
    { id: 'brazil', label: 'home.brazil' },
  ] as const;
  /** Group shown on phones; on larger screens both are always listed. */
  protected readonly group = signal<'map' | 'challenges'>('map');
  protected readonly groups = [
    { id: 'map', label: 'home.group.map' },
    { id: 'challenges', label: 'home.group.challenges' },
  ] as const;
  /** The game whose start dialog is open. */
  protected readonly playing = signal<GameId | null>(null);
  protected readonly layer = this.mapState.layer;
  protected readonly continent = this.mapState.continent;

  /** The continent filter only exists on the world map. */
  private readonly activeContinent = computed(() =>
    this.layer() === 'world' ? this.continent() : null,
  );

  /** The territories rule only exists on the world map. */
  private readonly territories = computed(
    () => this.layer() === 'world' && this.rules().includeTerritories,
  );

  /**
   * The places of the current map, worked out once per change of map, continent or rules (not on
   * every screen update): the whole map and the chosen region, with and without capitals.
   */
  private readonly places = computed(() => {
    if (this.layer() === 'brazil') {
      const all = buildBrazilTargets(this.geo.states());
      return { all, region: all, allCapitals: all.length, regionCapitals: all.length };
    }
    const world = this.geo.world();
    if (!world) return { all: [], region: [], allCapitals: 0, regionCapitals: 0 };
    const units = world.objects.units.geometries.map((g) => g.properties as WorldUnitProperties);
    const all = buildWorldTargets(
      this.geo.countries(),
      this.geo.territories(),
      units,
      this.territories(),
    );
    const continent = this.activeContinent();
    const withCapital = withCapitals(all);
    return {
      all,
      region: inContinent(all, continent),
      allCapitals: withCapital.length,
      regionCapitals: inContinent(withCapital, continent).length,
    };
  });

  /**
   * Why each challenge that needs land borders is off here (Oceania, for instance). The Trail is
   * only off when not even the sea crossings help: they are turned on in its start dialog.
   */
  private readonly blocked = computed(() => {
    const data = this.geo.neighbors();
    const { region } = this.places();
    const blocked = new Map<ChallengeId, StringKey>();
    // Nothing is blocked until the data is there.
    if (!data || region.length === 0) return blocked;
    const ids = region.map((target) => target.id);
    for (const { id } of CHALLENGES) {
      const graph =
        id === 'trilha'
          ? this.trailGraph().withSea
          : borderGraph(data, this.layer(), this.territories(), id);
      if (!hasEnoughBorders(id, ids, graph)) blocked.set(id, 'home.fewBorders');
    }
    return blocked;
  });

  /** The Trail's sea crossings only exist on the world map. */
  private readonly crossings = computed(
    () => this.layer() === 'world' && this.rules().trailCrossings,
  );

  /** The Trail's graph: the one a game would use now, and the one with every sea crossing. */
  private readonly trailGraph = computed(() => {
    const data = this.geo.neighbors();
    const crossings = this.geo.crossings();
    if (!data || !crossings) return { current: {}, withSea: {} };
    const land = borderGraph(data, this.layer(), this.territories(), 'trilha');
    if (this.layer() === 'brazil') return { current: land, withSea: land };
    const region = this.activeContinent() && this.places().region.map((target) => target.id);
    const withSea = withCrossings(land, crossings, this.territories(), region);
    return { current: this.crossings() ? withSea : land, withSea };
  });

  /** The Trail can only be played here with the sea crossings, and they are off. */
  private readonly needsCrossings = computed(() => {
    const ids = this.places().region.map((target) => target.id);
    return (
      !!this.geo.neighbors() &&
      ids.length > 0 &&
      !hasEnoughBorders('trilha', ids, this.trailGraph().current)
    );
  });

  /** Where no place can be forbidden, Trail games run without any. */
  private readonly canForbid = computed(
    () =>
      !this.geo.neighbors() ||
      canForbid(
        this.places().region.map((target) => target.id),
        this.trailGraph().current,
      ),
  );

  protected readonly items = computed(() => {
    const layer = this.layer();
    const continent = this.activeContinent();
    const build = ({ id, icon, hard }: { id: GameId; icon: GameIconName; hard?: boolean }) => {
      const why = this.blocked().get(id as ChallengeId);
      const reason =
        continent && why ? this.i18n.t(why, { continent: this.i18n.continent(continent) }) : '';
      // Text keys of the Brazil version of a game start with "game.br.".
      const key = `game.${layer === 'brazil' ? 'br.' : ''}${id}` as const;
      return {
        id,
        icon,
        hard: !!hard,
        title: this.i18n.t(`${key}.title`),
        description: this.i18n.t(`${key}.desc`),
        inProgress: this.saved.has(id, layer, continent),
        record: this.record(id, this.rules()),
        disabledReason: reason,
      };
    };
    return { games: GAMES.map(build), challenges: CHALLENGES.map(build) };
  });

  constructor() {
    void this.geo.loadWorld();
    void this.geo.loadNeighbors();
  }

  protected chooseContinent(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.mapState.setContinent(isPlayableContinent(value) ? value : null);
  }

  /** The dialog of the game picked in the menu. */
  protected readonly request = computed<PlayRequest | null>(() => {
    const id = this.playing();
    const game = [...GAMES, ...CHALLENGES].find((item) => item.id === id);
    if (!id || !game) return null;
    const layer = this.layer();
    const continent = this.activeContinent();
    const place = { continent: continent ? this.i18n.continent(continent) : '' };
    const noForbidden =
      id === 'trilha' && continent && !this.canForbid() && !this.needsCrossings()
        ? this.i18n.t('play.trailFallback', place)
        : '';
    const levels = (['easy', 'normal', 'hard'] as const).map((level) => {
      const values = PRESETS[level];
      const notes = levelNotes(id, values, {
        layer,
        minutes: this.minutes(id, values),
        canForbid: this.canForbid(),
      }).map(({ icon, key, params }) => ({ icon, text: this.i18n.t(key, params) }));
      return {
        level,
        notes,
        record: this.record(id, values),
        warning: values.trailForbidden !== 'none' ? noForbidden : '',
      };
    });
    return {
      id,
      layer,
      icon: game.icon,
      title: this.i18n.t(`game.${layer === 'brazil' ? 'br.' : ''}${id}.title`),
      levels,
      selected: matchingPreset(id, layer, this.rules()) ?? 'custom',
      hasSaved: this.saved.has(id, layer, continent),
      crossings: id === 'trilha' && layer === 'world',
      blocked:
        id === 'trilha' && this.needsCrossings() ? this.i18n.t('play.needsCrossings', place) : '',
      noForbidden,
    };
  });

  /** "Start": a level sets its options first; "custom" plays with the current ones. */
  protected async start(choice: Preset | 'custom'): Promise<void> {
    const id = this.playing();
    if (!id) return;
    if (this.saved.has(id, this.layer(), this.activeContinent())) {
      const discard = await this.confirm.ask({
        title: this.i18n.t('play.discard.title'),
        message: this.i18n.t('play.discard.message'),
        confirmLabel: this.i18n.t('play.discard.ok'),
        cancelLabel: this.i18n.t('confirm.keepPlaying'),
      });
      if (!discard) return;
    }
    this.playing.set(null);
    if (choice !== 'custom') this.settingsService.applyPreset(choice);
    this.saved.clear(id, this.layer(), this.activeContinent());
    this.open(id);
  }

  protected resume(): void {
    const id = this.playing();
    this.playing.set(null);
    if (id) this.open(id);
  }

  private open(id: GameId): void {
    void this.router.navigate(this.layer() === 'brazil' ? ['/jogo', 'brasil', id] : ['/jogo', id]);
  }

  /** The record with these options, in the short form the menu shows; empty when there is none. */
  private record(id: GameId, values: PresetValues): string {
    const trail =
      id === 'trilha' ? { canForbid: this.canForbid(), crossings: this.crossings() } : undefined;
    const minutes = this.minutes(id, values);
    const best = this.records.get(
      recordKey({
        gameId: id,
        layer: this.layer(),
        territories: this.territories(),
        durationMs: minutes === null ? null : minutes * 60_000,
        continent: this.activeContinent(),
        ...recordLevel(id, this.layer(), values, trail),
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
    if (best.hinted) parts.push(this.i18n.t('frame.hinted'));
    return this.i18n.t('home.record', { record: parts.join(' · ') });
  }

  /**
   * The time limit, in minutes, a new game would have (a continent gets a share of the world's);
   * null without one.
   */
  private minutes(id: GameId, values: PresetValues): number | null {
    if (!values.timerEnabled || !hasTimeLimit(id)) return null;
    const minutes = durationOf(id, this.layer(), values);
    if (!this.activeContinent() || !this.geo.world()) return minutes;
    const { all, region, allCapitals, regionCapitals } = this.places();
    const capitals = usesCapitals(id);
    return continentMinutes(
      minutes,
      capitals ? regionCapitals : region.length,
      capitals ? allCapitals : all.length,
    );
  }
}
