import { DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmOptions, ConfirmService, LeaveGuarded } from '../core/confirm/confirm.service';
import { Continent, Layer, WorldUnitProperties } from '../core/data/geo-data.models';
import { GeoDataService } from '../core/data/geo-data.service';
import {
  Explanation,
  NonTargetIndex,
  buildNonTargetIndex,
  explainNonTarget,
  suggestedCountryId,
} from '../core/game/non-targets';
import { PlayableGame, SavedGame } from '../core/game/playable-game';
import { RecordOutcome, RecordsService, recordKey } from '../core/game/records.service';
import { SavedGameStore } from '../core/game/saved-game.store';
import {
  Target,
  buildBrazilTargets,
  buildWorldTargets,
  continentMinutes,
  inContinent,
  withCapitals,
} from '../core/game/targets';
import { GameId, usesCapitals } from '../core/games';
import { formatClock } from '../core/labels';
import { I18nService } from '../core/i18n/i18n.service';
import { SettingsService } from '../core/settings.service';
import { SoundService } from '../core/sound.service';
import { MapLabel, MapMarker, MapStateService } from '../shared/map/map-state.service';
import { SettingsPanelService } from '../shared/settings-panel/settings-panel.component';

export interface Feedback {
  kind: 'hit' | 'duplicate' | 'miss' | 'info';
  text: string;
}

export const FEEDBACK_ICON: Record<Feedback['kind'], string> = {
  hit: '✓',
  duplicate: '↺',
  miss: '✗',
  info: 'ℹ',
};

const TICK_MS = 250;
const SAVE_EVERY_MS = 2000;
/** A place at least this big is named at zoom 1; smaller ones need more zoom (see `minZoom`). */
const LABEL_AREA_KM2: Record<Layer, number> = { world: 1_500_000, brazil: 150_000 };

export interface NewGameOptions {
  saved: SavedGame | null;
  targets: Target[];
  /** Every target of the map, before the continent filter (answers may lie outside it). */
  pool: Target[];
  territories: boolean;
  durationMs: number | null;
}

/**
 * Everything the game pages share: loading the data, the clock, saving, the map, confirmations,
 * the end of the game and the info card. A game page adds its own question and its own input.
 */
export abstract class GamePage<G extends PlayableGame> implements LeaveGuarded {
  protected readonly geo = inject(GeoDataService);
  protected readonly settings = inject(SettingsService);
  protected readonly i18n = inject(I18nService);
  protected readonly sound = inject(SoundService);
  protected readonly mapState = inject(MapStateService);
  protected readonly saved = inject(SavedGameStore);
  private readonly router = inject(Router);
  private readonly records = inject(RecordsService);
  private readonly confirm = inject(ConfirmService);
  private readonly settingsPanel = inject(SettingsPanelService);

  private readonly route = inject(ActivatedRoute).snapshot.data;
  protected readonly gameId = this.route['game'] as GameId;
  protected readonly layer = (this.route['layer'] ?? 'world') as Layer;
  /** Continent chosen in the menu, fixed for this game (Brazil has no filter). */
  protected readonly continent: Continent | null =
    this.layer === 'world' ? this.mapState.continent() : null;

  protected readonly game = signal<G | null>(null);
  protected readonly record = signal<RecordOutcome | null>(null);
  protected readonly feedback = signal<Feedback | null>(null);
  protected readonly shaking = signal(false);
  protected readonly infoTarget = signal<Target | null>(null);
  protected readonly infoPlace = computed(() => this.infoTarget()?.place);

  protected readonly clock = computed(() => {
    const game = this.game();
    if (!game) return undefined;
    const remaining = game.remainingMs();
    return remaining === null
      ? formatClock(game.elapsedMs(), 'up')
      : formatClock(remaining, 'down');
  });

  /** Which target each map shape belongs to (a territory belongs to its country when off). */
  protected readonly targetByUnit = computed(() => {
    const map = new Map<string, Target>();
    for (const target of this.game()?.targets ?? []) {
      for (const unitId of target.unitIds) map.set(unitId, target);
    }
    return map;
  });

  private finalized = false;
  private lastTick = Date.now();
  private sinceSave = 0;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** Real places that are not answers (Greenland, England...), to explain them to the player. */
  protected nonTargets: NonTargetIndex | null = null;

  protected abstract createGame(options: NewGameOptions): G;

  /** False for games that end some other way (the Trail game has a limit of guesses). */
  protected usesTimer(): boolean {
    return true;
  }

  /** The targets a game may ask about; the rest of the map stays valid as typed answers. */
  protected askable(targets: Target[]): Target[] {
    return targets;
  }

  /** Data a game needs besides the map's; loaded before the game starts. */
  protected loadExtra(): Promise<void> {
    return Promise.resolve();
  }

  /** Markers a game adds to those of found and missed places. */
  protected extraMarkers(): MapMarker[] {
    return [];
  }

  /** Names a game adds to those of found places (shown under the same setting). */
  protected extraLabels(): MapLabel[] {
    return [];
  }

  /** A name on the map over a place; small places need more zoom to show it. */
  protected mapLabel(target: Target, text: string): MapLabel {
    return {
      id: target.id,
      point: target.place.labelPoint,
      text,
      minZoom: Math.max(1, Math.sqrt(LABEL_AREA_KM2[this.layer] / target.place.areaKm2)),
    };
  }

  /** Click games give tiny places a bigger invisible click area. */
  protected enlargesTinyPlaces(): boolean {
    return false;
  }

  /** What is written on the map over a found place (the country, or the capital). */
  protected labelFor(target: Target): string {
    return this.i18n.name(target.place.name);
  }

  constructor() {
    const ticker = setInterval(() => this.onTick(), TICK_MS);
    // A hidden tab must not keep the clock running: pause and save right away.
    const onVisibility = () => {
      if (document.hidden && this.game()?.status() === 'playing') this.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(ticker);
      document.removeEventListener('visibilitychange', onVisibility);
      this.timers.forEach(clearTimeout);
      this.save();
      this.mapState.reset();
    });

    this.mapState.setLayer(this.layer);
    const loaded = this.layer === 'brazil' ? this.geo.loadBrazil() : this.geo.loadWorld();
    void Promise.all([loaded, this.loadExtra()]).then(() =>
      this.start(this.saved.get(this.gameId, this.layer, this.continent)),
    );

    // The map mirrors the game: found places lit, shown or missed ones hatched.
    effect(() => {
      const game = this.game();
      if (!game) return;
      const found = game.found();
      const revealed = game.revealed();
      const finished = game.status() === 'finished';
      const foundUnits = new Set<string>();
      const missedUnits = new Set<string>();
      const markers: MapMarker[] = [];
      const hitAreas: MapMarker[] = [];
      for (const target of game.targets) {
        const isFound = found.has(target.id);
        const isMissed = !isFound && (finished || revealed.has(target.id));
        const point = target.place.labelPoint;
        if (!isFound && !isMissed) {
          if (target.tiny && this.enlargesTinyPlaces()) {
            hitAreas.push({ id: target.id, point, kind: 'missed' });
          }
          continue;
        }
        for (const unitId of target.unitIds) (isFound ? foundUnits : missedUnits).add(unitId);
        if (target.tiny) markers.push({ id: target.id, point, kind: isFound ? 'found' : 'missed' });
      }
      this.mapState.found.set(foundUnits);
      this.mapState.missed.set(missedUnits);
      this.mapState.markers.set([...markers, ...this.extraMarkers()]);
      this.mapState.hitAreas.set(hitAreas);
    });

    // Names of found places on the map (setting). Small places need more zoom to show.
    effect(() => {
      const game = this.game();
      if (!game) return;
      if (!this.settings.value().showNames) {
        this.mapState.labels.set([]);
        return;
      }
      const found = game.found();
      this.mapState.labels.set([
        ...game.targets
          .filter((target) => found.has(target.id))
          .map((target) => this.mapLabel(target, this.labelFor(target))),
        ...this.extraLabels(),
      ]);
    });

    // Resting the mouse on a place already found reopens its info card (touch uses tapping).
    effect((onCleanup) => {
      const id = this.mapState.hoveredId();
      const game = this.game();
      if (!id || !game || !this.settings.value().infoBox) return;
      const target = untracked(() => this.targetByUnit().get(id));
      const known =
        target && (untracked(game.found).has(target.id) || game.status() === 'finished');
      if (!target || !known) return;
      const timer = setTimeout(() => {
        if (this.infoTarget()?.id !== target.id) this.infoTarget.set(target);
      }, 350);
      onCleanup(() => clearTimeout(timer));
    });
  }

  private start(saved: SavedGame | null): void {
    const settings = this.settings.value();
    // Territories only exist on the world map.
    const territories =
      this.layer === 'world' && (saved?.territories ?? settings.includeTerritories);
    let all: Target[];
    if (this.layer === 'brazil') {
      all = buildBrazilTargets(this.geo.states());
    } else {
      const world = this.geo.world();
      if (!world) return;
      const units = world.objects.units.geometries.map((g) => g.properties as WorldUnitProperties);
      all = buildWorldTargets(this.geo.countries(), this.geo.territories(), units, territories);
    }
    // Capital games can only ask about places that have a capital.
    if (usesCapitals(this.gameId)) all = withCapitals(all);
    const targets = this.askable(inContinent(all, this.continent));
    // On a continent the time limit shrinks in proportion to its share of the world's targets.
    const settingsDurationMs =
      !settings.timerEnabled || !this.usesTimer()
        ? null
        : (this.continent
            ? continentMinutes(
                settings.durationMinutes.world,
                targets.length,
                this.askable(all).length,
              )
            : settings.durationMinutes[this.layer]) * 60_000;
    const durationMs = saved ? saved.durationMs : settingsDurationMs;

    this.finalized = false;
    this.record.set(null);
    this.feedback.set(null);
    this.infoTarget.set(null);
    this.mapState.select(null);
    this.mapState.selectable.set(true);
    this.lastTick = Date.now();
    this.game.set(this.createGame({ saved, targets, pool: all, territories, durationMs }));
    if (saved && this.rulesChanged(saved, settingsDurationMs)) {
      this.say('info', this.i18n.t('game.rulesKept'), 8000);
    }
  }

  /** True when a resumed game keeps rules that differ from the current settings. */
  private rulesChanged(saved: SavedGame, settingsDuration: number | null): boolean {
    const settings = this.settings.value();
    // Older saves lack some rules: those cannot be compared.
    const differs = <T>(savedValue: T | undefined, current: T) =>
      savedValue !== undefined && savedValue !== current;
    return (
      saved.durationMs !== settingsDuration ||
      (this.layer === 'world' && saved.territories !== settings.includeTerritories) ||
      differs(saved.tolerance, settings.typoTolerance) ||
      differs(saved.revealAfterErrors, settings.revealAfterErrors) ||
      differs(saved.learnMode, settings.learnMode)
    );
  }

  // --- feedback helpers ---

  /** The index of non-answers for these targets; only the world map has any. */
  protected buildNonTargets(targets: Target[]): NonTargetIndex | null {
    const data = this.geo.nonTargets();
    if (this.layer !== 'world' || !data) return null;
    return buildNonTargetIndex(
      this.geo.territories(),
      data,
      new Set(targets.map((target) => target.id)),
    );
  }

  /** Says why a place is not an answer. It never counts as a hit or an error. */
  protected explain(why: Explanation, suggest?: Target): void {
    const name = this.i18n.name(why.name);
    const text =
      why.kind === 'unlisted'
        ? this.i18n.t('typing.explain.unlisted', { name })
        : this.i18n.t(`typing.explain.${why.kind}`, {
            name,
            country: this.i18n.name(why.country),
          });
    const hint = suggest
      ? ` ${this.i18n.t('typing.explain.try', { name: this.i18n.name(suggest.place.name) })}`
      : '';
    this.say('info', text + hint, 6000);
  }

  /**
   * For games that let any place of the map be typed: when `raw` names a real place that is not
   * an answer, explains it (and suggests its country if that is one of `pool`). Free: it counts
   * as neither a guess nor an error. Returns whether it explained.
   */
  protected explainTyped(raw: string, pool: Target[], suggestCountry: boolean): boolean {
    const why = this.nonTargets && explainNonTarget(raw, this.nonTargets);
    if (!why) return false;
    const id = suggestCountry
      ? suggestedCountryId(why, new Set(pool.map((target) => target.id)))
      : null;
    this.explain(
      why,
      pool.find((target) => target.id === id),
    );
    return true;
  }

  protected say(kind: Feedback['kind'], text: string, ms = 3500): void {
    this.feedback.set({ kind, text });
    this.later(() => this.feedback.set(null), ms);
  }

  protected pulseUnits(targets: Target[]): void {
    this.mapState.pulse.set(targets.flatMap((t) => t.unitIds));
    this.later(() => this.mapState.pulse.set([]), 1000);
  }

  protected flashWrong(target: Target): void {
    this.mapState.wrong.set(target.unitIds);
    this.later(() => this.mapState.wrong.set([]), 900);
  }

  protected later(fn: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }

  // --- clock and saving ---

  private onTick(): void {
    const now = Date.now();
    const delta = now - this.lastTick;
    this.lastTick = now;
    const game = this.game();
    if (!game || game.status() !== 'playing') return;
    game.tick(delta);
    this.sinceSave += delta;
    if (this.sinceSave >= SAVE_EVERY_MS) this.save();
    this.afterChange(game);
  }

  /** Saves the game in progress. A game with nothing done has nothing worth resuming. */
  protected save(): void {
    this.sinceSave = 0;
    const game = this.game();
    if (game && game.status() !== 'finished' && game.hasProgress()) {
      this.saved.save(game.snapshot(), this.continent);
    }
  }

  /** Runs once when a game ends: drops the saved game and updates the record. */
  protected afterChange(game: G): void {
    const result = game.result();
    if (game.status() !== 'finished' || !result || this.finalized) return;
    this.finalized = true;
    this.saved.clear(this.gameId, this.layer, this.continent);
    const key = recordKey({
      gameId: this.gameId,
      layer: this.layer,
      territories: game.territories,
      durationMs: game.durationMs,
      continent: this.continent,
    });
    this.record.set(
      this.records.submit(key, {
        found: result.found,
        total: result.total,
        elapsedMs: result.elapsedMs,
        errors: result.errors,
        guesses: result.guesses,
        date: new Date().toISOString().slice(0, 10),
      }),
    );
    this.infoTarget.set(null);
    this.sound.play(result.reason === 'complete' ? 'win' : 'end');
  }

  // --- actions shared by every game ---

  protected togglePause(): void {
    if (this.game()?.status() === 'paused') this.resume();
    else this.pause();
  }

  protected pause(): void {
    this.game()?.pause();
    this.save();
  }

  protected resume(): void {
    this.lastTick = Date.now();
    this.game()?.resume();
  }

  /** The gear in the top bar: pauses the game and opens the settings over it. */
  protected openSettings(): void {
    this.pause();
    this.settingsPanel.show(true);
  }

  /** Pauses while a confirmation is open, and picks the game up again if the player backs out. */
  private async confirmRisky(options: ConfirmOptions): Promise<boolean> {
    const game = this.game();
    const wasPlaying = game?.status() === 'playing';
    game?.pause();
    const ok = await this.confirm.ask(options);
    if (!ok && wasPlaying) this.resume();
    return ok;
  }

  protected async restart(): Promise<void> {
    const game = this.game();
    if (!game) return;
    if (game.status() !== 'finished' && game.hasProgress()) {
      const ok = await this.confirmRisky({
        title: this.i18n.t('confirm.restart.title'),
        message: this.i18n.t('confirm.restart.message'),
        confirmLabel: this.i18n.t('confirm.restart.ok'),
        cancelLabel: this.i18n.t('confirm.keepPlaying'),
      });
      if (!ok) return;
    }
    this.replay();
  }

  protected replay(): void {
    this.saved.clear(this.gameId, this.layer, this.continent);
    this.start(null);
  }

  protected async giveUp(): Promise<void> {
    const game = this.game();
    if (!game) return;
    const ok = await this.confirmRisky({
      title: this.i18n.t('confirm.giveUp.title'),
      message: this.i18n.t('confirm.giveUp.message'),
      confirmLabel: this.i18n.t('confirm.giveUp.ok'),
      cancelLabel: this.i18n.t('confirm.keepPlaying'),
    });
    if (!ok) return;
    game.giveUp();
    this.afterChange(game);
  }

  protected goToMenu(): void {
    void this.router.navigate(['/']);
  }

  /** Asked by the route guard before leaving the page. Leaving is free: progress is saved. */
  confirmLeave(): boolean {
    const game = this.game();
    if (game && game.status() !== 'finished' && !game.hasProgress()) {
      this.saved.clear(this.gameId, this.layer, this.continent);
    }
    return true;
  }

  protected showInfo(target: Target): void {
    this.infoTarget.set(target);
    // Lights the place up so it is easy to see where it is.
    this.pulseUnits([target]);
  }

  protected closeInfo(): void {
    this.infoTarget.set(null);
    this.mapState.select(null);
  }

  protected onEscape(): void {
    if (this.infoTarget()) this.closeInfo();
    else if (this.game()?.status() === 'playing') this.pause();
  }
}
