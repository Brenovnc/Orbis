import { Layer } from '../data/geo-data.models';
import { NeighborsData } from '../data/proximity';
import { ChallengeId } from '../games';
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
  const trail = id === 'trilha' || id === 'trilha-dificil';
  if (territories) return trail ? data.world.trailTerritories : data.world.territoriesOn;
  return trail ? data.world.trail : data.world.territoriesOff;
}

/**
 * Whether a game can be played among these places (the chosen continent, or the whole map):
 * Neighbors needs 5 places with a neighbor, the Trail 5 valid origin–destination pairs.
 * Games that do not use borders are always available.
 */
export function hasEnoughBorders(id: ChallengeId, askableIds: string[], graph: Graph): boolean {
  switch (id) {
    case 'vizinhos':
      return askableIds.filter((place) => graph[place]?.length).length >= MIN_PLAYABLE;
    case 'trilha':
    case 'trilha-dificil':
      return countPuzzles(askableIds, graph, id === 'trilha-dificil', MIN_PLAYABLE) >= MIN_PLAYABLE;
    default:
      return true;
  }
}
