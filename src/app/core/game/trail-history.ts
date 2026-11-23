import { Layer } from '../data/geo-data.models';
import { readStore, writeStore } from '../storage';
import { NO_HISTORY, TrailHistory } from './trail-graph';

const keyOf = (layer: Layer) => `trail-history:${layer}`;

/** The last Trail games of a map, kept only in this browser. */
export function readTrailHistory(layer: Layer): TrailHistory {
  const stored = readStore<TrailHistory>(keyOf(layer));
  const valid = Array.isArray(stored?.pairs) && Array.isArray(stored?.centrals);
  return valid ? (stored as TrailHistory) : NO_HISTORY;
}

export function saveTrailHistory(layer: Layer, history: TrailHistory): void {
  writeStore(keyOf(layer), history);
}
