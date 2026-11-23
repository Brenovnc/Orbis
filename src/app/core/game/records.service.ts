import { Injectable } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import type { GameId } from '../games';
import type { Preset, PresetValues } from '../settings.service';
import { readStore, writeStore } from '../storage';
import { gameOptions, matchingPreset } from './game-options';

export interface RecordEntry {
  found: number;
  total: number;
  elapsedMs: number;
  /** Wrong clicks; only click games have it (records from before it existed do not). */
  errors?: number;
  /** Guesses spent; only the Trail and Proximity games have it, and there fewer is better. */
  guesses?: number;
  /** A hint was used (Trail only). */
  hinted?: boolean;
  /** Questions in which a hint was used (Silhouettes with hints only). */
  hintedQuestions?: number;
  date: string;
}

export interface RecordOutcome {
  /** True when this game set a new best. */
  isNew: boolean;
  best: RecordEntry | null;
  /** The difficulty this record belongs to. */
  level: RecordLevel;
}

/**
 * More found wins. Then, in the Trail, a game without hints beats one with hints, and in the
 * Silhouettes fewer questions with a hint win. Then fewer guesses (Trail, Proximity), or in click
 * games fewer errors (an old record without the count loses to any new one). Then the faster
 * time. Typing games have no errors and skip that step.
 */
export function isBetter(candidate: RecordEntry, best: RecordEntry | null): boolean {
  if (!best) return candidate.found > 0;
  // Games with a different number of questions each time (Neighbors) compare the share right.
  if (candidate.total !== best.total) {
    return candidate.found * best.total > best.found * candidate.total;
  }
  if (candidate.found !== best.found) return candidate.found > best.found;
  if (!!candidate.hinted !== !!best.hinted) return !candidate.hinted;
  const hints = candidate.hintedQuestions ?? 0;
  const bestHints = best.hintedQuestions ?? 0;
  if (hints !== bestHints) return hints < bestHints;
  if (candidate.guesses !== undefined && candidate.guesses !== best.guesses) {
    return candidate.guesses < (best.guesses ?? Infinity);
  }
  if (candidate.errors !== undefined) {
    const bestErrors = best.errors ?? Infinity;
    if (candidate.errors !== bestErrors) return candidate.errors < bestErrors;
  }
  return candidate.elapsedMs < best.elapsedMs;
}

/** The difficulty a record belongs to: a level, or "custom" when the options match no level. */
export type RecordLevel = Preset | 'custom';

/**
 * Where the record of a game goes. Worked out once, when the game starts, and saved with it, so
 * settings changed later (even in a resumed game) never move the record to another level.
 */
export interface PlayedLevel {
  level: RecordLevel;
  /** Custom games only: every option the game reads, as played (the time limit goes apart). */
  variant?: string;
  /** Trail with sea crossings: never compared with one without, at any level. */
  crossings?: boolean;
}

/**
 * One record per game, map, territories rule, continent, level and (Trail) sea crossings. Custom
 * games also key on the time limit and on every other option the game reads.
 */
export function recordKey(options: {
  gameId: string;
  layer: string;
  territories: boolean;
  level: RecordLevel;
  /** Used only when the level is custom. */
  durationMs: number | null;
  /** Continent chosen on the world map; null (or none) = the whole map. */
  continent?: string | null;
  /** See PlayedLevel; used only when the level is custom. */
  variant?: string;
  crossings?: boolean;
}): string {
  const parts = [
    'record',
    options.gameId,
    options.layer,
    options.territories ? 'terr' : 'core',
    options.continent ?? 'all',
    options.level,
  ];
  if (options.crossings) parts.push('sea');
  if (options.level === 'custom') {
    if (options.variant) parts.push(options.variant);
    parts.push(options.durationMs === null ? 'free' : `${Math.round(options.durationMs / 1000)}s`);
  }
  return parts.join(':');
}

/**
 * Where the record of a game with these options goes. In the Trail, `canForbid` is false where no
 * place can be forbidden: a custom game there is played without any, and its key says so.
 */
export function recordLevel(
  id: GameId,
  layer: Layer,
  values: PresetValues,
  trail?: { canForbid: boolean; crossings: boolean },
): PlayedLevel {
  const preset = matchingPreset(id, layer, values);
  const crossings = trail && { crossings: trail.crossings };
  if (preset) return { level: preset, ...crossings };
  const played: PresetValues =
    trail && !trail.canForbid ? { ...values, trailForbidden: 'none' } : values;
  const variant = gameOptions(id, played)
    // The time limit has its own place in the key.
    .filter((option) => option !== 'timerEnabled' && option !== 'durationMinutes')
    .map((option) => `${option}=${played[option]}`)
    .join(',');
  return { level: 'custom', variant, ...crossings };
}

/** Best result per mode, kept only in this browser. */
@Injectable({ providedIn: 'root' })
export class RecordsService {
  get(key: string): RecordEntry | null {
    return readStore<RecordEntry>(key);
  }

  /** Saves the result if it beats the stored record. */
  submit(key: string, entry: RecordEntry, level: RecordLevel): RecordOutcome {
    const best = this.get(key);
    if (isBetter(entry, best)) {
      writeStore(key, entry);
      return { isNew: true, best: entry, level };
    }
    return { isNew: false, best, level };
  }
}
