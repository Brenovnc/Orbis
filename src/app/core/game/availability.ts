import { Layer } from '../data/geo-data.models';
import { CrossingsData, NeighborsData } from '../data/proximity';
import { ChallengeId } from '../games';
import { crossingsIn } from './trail-crossings';
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
 * The Trail's graph with the sea crossings (world map only), as edges like any other. With
 * `region` (the ids of a continent), only those with both ends in it.
 */
export function withCrossings(
  graph: Graph,
  crossings: CrossingsData,
  territories: boolean,
  region: readonly string[] | null,
): Graph {
  const result: Graph = Object.fromEntries(
    Object.entries(graph).map(([id, list]) => [id, [...list]]),
  );
  for (const { a, b } of crossingsIn(crossings, territories, region)) {
    (result[a] ??= []).push(b);
    (result[b] ??= []).push(a);
  }
  return result;
}

/** Whether Trail games here can forbid places; where they cannot, they run without any. */
export const canForbid = (askableIds: string[], graph: Graph): boolean =>
  hasEnoughBorders('trilha', askableIds, graph, true);

/**
 * Whether a game can be played among these places (the chosen continent, or the whole map):
 * Neighbors needs 5 places with a neighbor, the Trail 5 valid origin–destination pairs (with
 * `forbidding`, pairs with a place that can be forbidden). Games that do not use borders are
 * always available.
 */
export function hasEnoughBorders(
  id: ChallengeId,
  askableIds: string[],
  graph: Graph,
  forbidding = false,
): boolean {
  switch (id) {
    case 'vizinhos':
      return askableIds.filter((place) => graph[place]?.length).length >= MIN_PLAYABLE;
    case 'trilha':
      return countPuzzles(askableIds, graph, forbidding, MIN_PLAYABLE) >= MIN_PLAYABLE;
    default:
      return true;
  }
}
