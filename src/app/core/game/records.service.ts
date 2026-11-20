import { Injectable } from '@angular/core';
import type { TrailLevel } from '../settings.service';
import { readStore, writeStore } from '../storage';

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
  date: string;
}

export interface RecordOutcome {
  /** True when this game set a new best. */
  isNew: boolean;
  best: RecordEntry | null;
}

/**
 * More found wins. Then, in the Trail, a game without hints beats one with hints. Then fewer
 * guesses (Trail, Proximity), or in click games fewer errors (an old record without the count
 * loses to any new one). Then the faster time. Typing games have no errors and skip that step.
 */
export function isBetter(candidate: RecordEntry, best: RecordEntry | null): boolean {
  if (!best) return candidate.found > 0;
  // Games with a different number of questions each time (Neighbors) compare the share right.
  if (candidate.total !== best.total) {
    return candidate.found * best.total > best.found * candidate.total;
  }
  if (candidate.found !== best.found) return candidate.found > best.found;
  if (!!candidate.hinted !== !!best.hinted) return !candidate.hinted;
  if (candidate.guesses !== undefined && candidate.guesses !== best.guesses) {
    return candidate.guesses < (best.guesses ?? Infinity);
  }
  if (candidate.errors !== undefined) {
    const bestErrors = best.errors ?? Infinity;
    if (candidate.errors !== bestErrors) return candidate.errors < bestErrors;
  }
  return candidate.elapsedMs < best.elapsedMs;
}

/**
 * One record per mode. The key includes the territories rule and the time limit, because
 * results are only comparable under the same rules.
 */
export function recordKey(options: {
  gameId: string;
  layer: string;
  territories: boolean;
  durationMs: number | null;
  /** Continent chosen on the world map; null (or none) = the whole map. */
  continent?: string | null;
}): string {
  const limit = options.durationMs === null ? 'free' : `${Math.round(options.durationMs / 1000)}s`;
  const base = `record:${options.gameId}:${options.layer}:${options.territories ? 'terr' : 'core'}:${limit}`;
  // The whole map keeps the original key, so records from before the continents still count.
  return options.continent ? `${base}:${options.continent}` : base;
}

/**
 * The Trail keeps one record per level. Normal and hard keep the keys of the old "Trail" and
 * "Hard trail" menu entries, so records from before the levels still count.
 */
export const trailRecordId = (level: TrailLevel): string =>
  level === 'normal' ? 'trilha' : level === 'hard' ? 'trilha-dificil' : 'trilha-facil';

/** Best result per mode, kept only in this browser. */
@Injectable({ providedIn: 'root' })
export class RecordsService {
  get(key: string): RecordEntry | null {
    return readStore<RecordEntry>(key);
  }

  /** Saves the result if it beats the stored record. */
  submit(key: string, entry: RecordEntry): RecordOutcome {
    const best = this.get(key);
    if (isBetter(entry, best)) {
      writeStore(key, entry);
      return { isNew: true, best: entry };
    }
    return { isNew: false, best };
  }
}
