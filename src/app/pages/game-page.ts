import { DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmOptions, ConfirmService, LeaveGuarded } from '../core/confirm/confirm.service';
import { Layer, WorldUnitProperties } from '../core/data/geo-data.models';
import { GeoDataService } from '../core/data/geo-data.service';
import { PlayableGame, SavedGame } from '../core/game/playable-game';
import { RecordOutcome, RecordsService, recordKey } from '../core/game/records.service';
import { SavedGameStore } from '../core/game/saved-game.store';
import { Target, buildBrazilTargets, buildWorldTargets, withCapitals } from '../core/game/targets';
import { GameId } from '../core/games';
import { formatClock } from '../core/labels';
import { I18nService } from '../core/i18n/i18n.service';
import { SettingsService } from '../core/settings.service';
import { SoundService } from '../core/sound.service';
import { MapLabel, MapMarker, MapStateService } from '../shared/map/map-state.service';

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
const CAPITAL_GAMES: GameId[] = ['digitar-capitais', 'clicar-capital'];
/** A place at least this big is named at zoom 1; smaller ones need more zoom (see `minZoom`). */
const LABEL_AREA_KM2: Record<Layer, number> = { world: 1_500_000, brazil: 150_000 };

export interface NewGameOptions {
  saved: SavedGame | null;
  targets: Target[];
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

  private readonly route = inject(ActivatedRoute).snapshot.data;
  protected readonly gameId = this.route['game'] as GameId;
  protected readonly layer = (this.route['layer'] ?? 'world') as Layer;

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

  protected abstract createGame(options: NewGameOptions): G;

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
    inject(DestroyRef).onDestroy(() => {
      clearInterval(ticker);
      this.timers.forEach(clearTimeout);
      this.save();
      this.mapState.reset();
    });

    this.mapState.setLayer(this.layer);
    const loaded = this.layer === 'brazil' ? this.geo.loadBrazil() : this.geo.loadWorld();
    void loaded.then(() => this.start(this.saved.get(this.gameId, this.layer)));

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
      this.mapState.markers.set(markers);
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
      this.mapState.labels.set(
        game.targets
          .filter((target) => found.has(target.id))
          .map((target): MapLabel => ({
            id: target.id,
            point: target.place.labelPoint,
            text: this.labelFor(target),
            minZoom: Math.max(1, Math.sqrt(LABEL_AREA_KM2[this.layer] / target.place.areaKm2)),
          })),
      );
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
    let targets: Target[];
    if (this.layer === 'brazil') {
      targets = buildBrazilTargets(this.geo.states());
    } else {
      const world = this.geo.world();
      if (!world) return;
      const units = world.objects.units.geometries.map((g) => g.properties as WorldUnitProperties);
      targets = buildWorldTargets(this.geo.countries(), this.geo.territories(), units, territories);
    }
    // Capital games can only ask about places that have a capital.
    if (CAPITAL_GAMES.includes(this.gameId)) targets = withCapitals(targets);
    const durationMs = saved
      ? saved.durationMs
      : settings.timerEnabled
        ? settings.durationMinutes[this.layer] * 60_000
        : null;

    this.finalized = false;
    this.record.set(null);
    this.feedback.set(null);
    this.infoTarget.set(null);
    this.mapState.select(null);
    this.mapState.selectable.set(true);
    this.lastTick = Date.now();
    this.game.set(this.createGame({ saved, targets, territories, durationMs }));
  }

  // --- feedback helpers ---

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
      this.saved.save(game.snapshot());
    }
  }

  /** Runs once when a game ends: drops the saved game and updates the record. */
  protected afterChange(game: G): void {
    const result = game.result();
    if (game.status() !== 'finished' || !result || this.finalized) return;
    this.finalized = true;
    this.saved.clear(this.gameId, this.layer);
    const key = recordKey({
      gameId: this.gameId,
      layer: this.layer,
      territories: game.territories,
      durationMs: game.durationMs,
    });
    this.record.set(
      this.records.submit(key, {
        found: result.found,
        total: result.total,
        elapsedMs: result.elapsedMs,
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
    this.saved.clear(this.gameId, this.layer);
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

  /** Asked by the route guard before leaving the page. */
  async confirmLeave(): Promise<boolean> {
    const game = this.game();
    if (!game || game.status() === 'finished') return true;
    if (!game.hasProgress()) {
      this.saved.clear(this.gameId, this.layer);
      return true;
    }
    this.save();
    return this.confirmRisky({
      title: this.i18n.t('confirm.leave.title'),
      message: this.i18n.t('confirm.leave.message'),
      confirmLabel: this.i18n.t('confirm.leave.ok'),
      cancelLabel: this.i18n.t('confirm.leave.cancel'),
    });
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
