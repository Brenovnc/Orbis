import type { Signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { GameId } from '../games';
import type { TrailLevel } from '../settings.service';
import { TypoTolerance } from './answers';
import { Target } from './targets';
import type { TrailPuzzle } from './trail-graph';

export type GameStatus = 'playing' | 'paused' | 'finished';
/** `guesses`: the Trail game ran out of guesses. */
export type FinishReason = 'complete' | 'timeout' | 'gaveup' | 'guesses';

export interface GameResult {
  found: number;
  total: number;
  elapsedMs: number;
  reason: FinishReason;
  /** Wrong clicks (click games only). */
  errors?: number;
  /** Guesses spent (Trail and Proximity games only; it is the score there). */
  guesses?: number;
  /** A hint was used (Trail only). */
  hinted?: boolean;
}

/** What is saved in the browser so a reload continues where the player stopped. */
export interface SavedGame {
  v: 1;
  gameId: GameId;
  layer: Layer;
  territories: boolean;
  /** Ids answered correctly (in the Neighbors game: in the round being played). */
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
  // Neighbors game only:
  /** The places asked, one per round. */
  subjects?: string[];
  /** Round being played (0-based). */
  round?: number;
  /** Rounds already played. */
  results?: { id: string; found: number; total: number }[];
  // Trail game only:
  /** Level the game was started with; saves from before the levels have none (= normal). */
  trailLevel?: TrailLevel;
  puzzle?: TrailPuzzle;
  /** Places guessed, in the order typed. */
  chosen?: string[];
  /** Places whose outline the "next outline" hint showed. */
  outlines?: string[];
  /** The "reveal map" hint was used. */
  mapShown?: boolean;
  /** Older saves only: the trail typed in order, origin first. */
  trail?: string[];
  // Proximity game only:
  secret?: string;
  /** Ids guessed, in order. */
  guessed?: string[];
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
