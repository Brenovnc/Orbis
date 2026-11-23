import { ProximityData, nearestIds } from '../data/proximity';
import { Graph } from './trail-graph';

/** The hints of a Silhouettes question, in the order they are given. */
export const SILHOUETTE_HINTS = ['surroundings', 'neighbors', 'letters'] as const;
export type SilhouetteHint = (typeof SILHOUETTE_HINTS)[number];

const NEAREST = 2;

/** The land borders of a place, or, for a place with none, the places nearest to it. */
export function neighborsHint(
  id: string,
  graph: Graph,
  distances: ProximityData | undefined,
): { kind: 'borders' | 'nearest'; ids: string[] } {
  const borders = graph[id] ?? [];
  if (borders.length > 0) return { kind: 'borders', ids: [...borders] };
  return { kind: 'nearest', ids: distances ? nearestIds(distances, id).slice(0, NEAREST) : [] };
}

/** First letter and number of letters of a name; spaces, hyphens and parentheses do not count. */
export function lettersHint(name: string): { letter: string; n: number } {
  const letters = name.normalize('NFC').match(/\p{L}/gu) ?? [];
  return { letter: (letters[0] ?? '').toUpperCase(), n: letters.length };
}
