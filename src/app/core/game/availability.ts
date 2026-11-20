import { Layer } from '../data/geo-data.models';
import { NeighborsData } from '../data/proximity';
import { ChallengeId } from '../games';
import { TrailLevel } from '../settings.service';
import { Graph, countPuzzles } from './trail-graph';

/** A game that depends on land borders needs at least this many places or routes to be fun. */
export const MIN_PLAYABLE = 5;

/**
 * The borders a game uses. Neighbors and Proximity follow the territories rule as it is; the
 * Trail on the world map drops borders that exist only through a territory on another continent
 * (with territories on, only the ones excluded by hand), see DATA_SOURCES.md.
 */
export function borderGraph(
  data: NeighborsData,
  layer: Layer,
  territories: boolean,
  id: ChallengeId,
): Graph {
  if (layer === 'brazil') return data.brazil;
  const trail = id === 'trilha';
  if (territories) return trail ? data.world.trailTerritories : data.world.territoriesOn;
  return trail ? data.world.trail : data.world.territoriesOff;
}

/**
 * The level the Trail really runs at: the hard level needs a place that can be forbidden, so
 * where there is none (North America) it falls back to normal.
 */
export function playableTrailLevel(
  level: TrailLevel,
  askableIds: string[],
  graph: Graph,
): TrailLevel {
  return level === 'hard' && !hasEnoughBorders('trilha', askableIds, graph, true)
    ? 'normal'
    : level;
}

/**
 * Whether a game can be played among these places (the chosen continent, or the whole map):
 * Neighbors needs 5 places with a neighbor, the Trail 5 valid origin–destination pairs (on the
 * hard level, pairs with a place that can be forbidden). Games that do not use borders are
 * always available.
 */
export function hasEnoughBorders(
  id: ChallengeId,
  askableIds: string[],
  graph: Graph,
  hardTrail = false,
): boolean {
  switch (id) {
    case 'vizinhos':
      return askableIds.filter((place) => graph[place]?.length).length >= MIN_PLAYABLE;
    case 'trilha':
      return countPuzzles(askableIds, graph, hardTrail, MIN_PLAYABLE) >= MIN_PLAYABLE;
    default:
      return true;
  }
}
