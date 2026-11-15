import { computed, signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { TypingGameId } from '../games';
import { AnswerMode, TypoTolerance, buildIndex, matchAnswer } from './answers';
import { FinishReason, GameResult, GameStatus, PlayableGame, SavedGame } from './playable-game';
import { Target } from './targets';

export type { FinishReason, GameResult, GameStatus, SavedGame } from './playable-game';

export type SubmitResult =
  { kind: 'ignored' | 'miss' } | { kind: 'hit' | 'duplicate' | 'pending'; targets: Target[] };

export interface TypingGameConfig {
  gameId: TypingGameId;
  /** Defaults to the world map. */
  layer?: Layer;
  mode: AnswerMode;
  targets: Target[];
  tolerance: TypoTolerance;
  territories: boolean;
  /** Time limit; null = no limit (the clock counts up). */
  durationMs: number | null;
  /** Progress to continue from; the game then starts paused. */
  saved?: Pick<SavedGame, 'found' | 'elapsedMs'>;
}

/** Rules of the two typing games: score, progress, clock and states. No UI in here. */
export class TypingGame implements PlayableGame {
  readonly gameId: TypingGameId;
  readonly layer: Layer;
  readonly targets: Target[];
  readonly total: number;
  readonly territories: boolean;
  readonly durationMs: number | null;

  readonly status = signal<GameStatus>('playing');
  readonly found = signal<ReadonlySet<string>>(new Set());
  readonly elapsedMs = signal(0);
  readonly result = signal<GameResult | null>(null);
  /** Typing games never show an answer to the player. */
  readonly revealed: PlayableGame['revealed'] = signal<ReadonlySet<string>>(new Set());

  readonly foundCount = computed(() => this.found().size);
  /** Time left, or null when there is no limit. */
  readonly remainingMs = computed(() =>
    this.durationMs === null ? null : Math.max(0, this.durationMs - this.elapsedMs()),
  );

  private readonly index;
  private readonly tolerance: TypoTolerance;

  constructor(config: TypingGameConfig) {
    this.gameId = config.gameId;
    this.layer = config.layer ?? 'world';
    this.targets = config.targets;
    this.total = config.targets.length;
    this.territories = config.territories;
    this.durationMs = config.durationMs;
    this.tolerance = config.tolerance;
    this.index = buildIndex(config.targets, config.mode);

    if (config.saved) {
      const known = new Set(config.targets.map((target) => target.id));
      this.found.set(new Set(config.saved.found.filter((id) => known.has(id))));
      this.elapsedMs.set(Math.max(0, config.saved.elapsedMs));
      this.status.set('paused');
    }
  }

  /** Checks a typed answer. `fuzzy` (Enter) also forgives typos; typing only accepts exact ones. */
  submit(raw: string, fuzzy: boolean): SubmitResult {
    if (this.status() !== 'playing') return { kind: 'ignored' };
    const match = matchAnswer(raw, this.index, this.found(), { fuzzy, tolerance: this.tolerance });
    if (match.kind === 'hit') {
      this.found.update(
        (found) => new Set([...found, ...match.targets.map((target) => target.id)]),
      );
      if (this.foundCount() === this.total) this.finish('complete');
    }
    return match;
  }

  /** Advances the clock; only counts while playing. */
  tick(deltaMs: number): void {
    if (this.status() !== 'playing') return;
    const limit = this.durationMs ?? Infinity;
    this.elapsedMs.update((elapsed) => Math.min(limit, elapsed + deltaMs));
    if (this.elapsedMs() >= limit) this.finish('timeout');
  }

  pause(): void {
    if (this.status() === 'playing') this.status.set('paused');
  }

  resume(): void {
    if (this.status() === 'paused') this.status.set('playing');
  }

  giveUp(): void {
    if (this.status() !== 'finished') this.finish('gaveup');
  }

  hasProgress(): boolean {
    return this.foundCount() > 0;
  }

  /** Targets not found yet. */
  missed(): Target[] {
    const found = this.found();
    return this.targets.filter((target) => !found.has(target.id));
  }

  snapshot(): SavedGame {
    return {
      v: 1,
      gameId: this.gameId,
      layer: this.layer,
      territories: this.territories,
      found: [...this.found()],
      elapsedMs: this.elapsedMs(),
      durationMs: this.durationMs,
      tolerance: this.tolerance,
    };
  }

  private finish(reason: FinishReason): void {
    this.status.set('finished');
    this.result.set({
      found: this.foundCount(),
      total: this.total,
      elapsedMs: this.elapsedMs(),
      reason,
    });
  }
}
