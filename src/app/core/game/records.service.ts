import { Injectable } from '@angular/core';
import { readStore, writeStore } from '../storage';

export interface RecordEntry {
  found: number;
  total: number;
  elapsedMs: number;
  date: string;
}

export interface RecordOutcome {
  /** True when this game set a new best. */
  isNew: boolean;
  best: RecordEntry | null;
}

/** More found wins; with the same number, the faster one. */
export function isBetter(candidate: RecordEntry, best: RecordEntry | null): boolean {
  if (!best) return candidate.found > 0;
  return (
    candidate.found > best.found ||
    (candidate.found === best.found && candidate.elapsedMs < best.elapsedMs)
  );
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
}): string {
  const limit = options.durationMs === null ? 'free' : `${Math.round(options.durationMs / 1000)}s`;
  return `record:${options.gameId}:${options.layer}:${options.territories ? 'terr' : 'core'}:${limit}`;
}

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
