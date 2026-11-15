import type { Signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { GameId } from '../games';
import { TypoTolerance } from './answers';
import { Target } from './targets';

export type GameStatus = 'playing' | 'paused' | 'finished';
export type FinishReason = 'complete' | 'timeout' | 'gaveup';

export interface GameResult {
  found: number;
  total: number;
  elapsedMs: number;
  reason: FinishReason;
  /** Wrong clicks (click games only). */
  errors?: number;
}

/** What is saved in the browser so a reload continues where the player stopped. */
export interface SavedGame {
  v: 1;
  gameId: GameId;
  layer: Layer;
  territories: boolean;
  /** Ids answered correctly. */
  found: string[];
  elapsedMs: number;
  durationMs: number | null;
  // Rules chosen when the game started; settings changed later wait for the next game.
  // Optional because older saves do not have them (the current settings are used then).
  /** Typing games only. */
  tolerance?: TypoTolerance;
  /** Click games only. */
  revealAfterErrors?: number;
  /** Click games only. */
  learnMode?: boolean;
  // Click games only:
  /** Ids whose answer was shown after too many errors. */
  revealed?: string[];
  /** Questions still to ask, in order. */
  queue?: string[];
  errors?: number;
  /** Errors on the question being asked now. */
  currentErrors?: number;
}

/** What every game offers to the shared game page: clock, score, states and saving. */
export interface PlayableGame {
  readonly gameId: GameId;
  readonly layer: Layer;
  readonly targets: Target[];
  readonly total: number;
  readonly territories: boolean;
  /** Time limit; null = no limit (the clock counts up). */
  readonly durationMs: number | null;

  readonly status: Signal<GameStatus>;
  /** Ids answered correctly. */
  readonly found: Signal<ReadonlySet<string>>;
  /** Ids whose answer was shown to the player (counted as missed). */
  readonly revealed: Signal<ReadonlySet<string>>;
  readonly foundCount: Signal<number>;
  readonly elapsedMs: Signal<number>;
  /** Time left, or null when there is no limit. */
  readonly remainingMs: Signal<number | null>;
  readonly result: Signal<GameResult | null>;

  tick(deltaMs: number): void;
  pause(): void;
  resume(): void;
  giveUp(): void;
  snapshot(): SavedGame;
  /** True when there is something worth saving or warning about. */
  hasProgress(): boolean;
}
