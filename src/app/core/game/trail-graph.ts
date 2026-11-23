// Paths over the land borders, for the Trail game and for deciding where it can be played.
import { pairKey } from '../data/proximity';
import type { TrailForbidden, TrailLevel } from '../settings.service';

export type Graph = Record<string, string[]>;

/** A Trail puzzle only asks for routes of this many steps (borders crossed). */
export const MIN_STEPS = 3;
export const MAX_STEPS = 8;

export interface TrailPuzzle {
  origin: string;
  destination: string;
  /** Places the trail may not go through (0 to 3). */
  forbidden: string[];
  /** Steps of the shortest trail (avoiding every forbidden place). */
  steps: number;
  /** One of the shortest trails, origin to destination, to show at the end. */
  path: string[];
  /** Guesses the player has: steps + 2 on the hard level, steps + 4 on the others. */
  guesses: number;
}

export const trailGuesses = (steps: number, level: TrailLevel): number =>
  steps + (level === 'hard' ? 2 : 4);

const NONE: ReadonlySet<string> = new Set();

/** Steps from `from` to every place it can reach, never entering `banned`. */
export function distances(
  graph: Graph,
  from: string,
  banned: ReadonlySet<string> = NONE,
): Map<string, number> {
  const result = new Map([[from, 0]]);
  const queue = [from];
  // The queue grows while it is walked: for-of keeps going until it is empty.
  for (const place of queue) {
    for (const next of graph[place] ?? []) {
      if (banned.has(next) || result.has(next)) continue;
      result.set(next, (result.get(place) ?? 0) + 1);
      queue.push(next);
    }
  }
  return result;
}

/** One shortest path, or null when the two places are not connected. */
export function shortestPath(
  graph: Graph,
  from: string,
  to: string,
  banned: ReadonlySet<string> = NONE,
): string[] | null {
  const before = new Map<string, string>();
  const seen = new Set([from]);
  const queue = [from];
  // The queue grows while it is walked: for-of keeps going until it is empty.
  for (const place of queue) {
    if (place === to) break;
    for (const next of graph[place] ?? []) {
      if (banned.has(next) || seen.has(next)) continue;
      seen.add(next);
      before.set(next, place);
      queue.push(next);
    }
  }
  if (!seen.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(before.get(path[0]) as string);
  return path;
}

const shuffled = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** The places 3 to 8 steps from `origin` (by the shortest path) among the chosen ones. */
function destinationsOf(origin: string, known: ReadonlySet<string>, graph: Graph): string[] {
  if (!graph[origin]?.length) return [];
  return [...distances(graph, origin)]
    .filter(([id, steps]) => known.has(id) && steps >= MIN_STEPS && steps <= MAX_STEPS)
    .map(([id]) => id);
}

/** The places of each step of the shortest paths between two places, ends included. */
function shortestLayers(
  graph: Graph,
  origin: string,
  destination: string,
  banned: ReadonlySet<string>,
): string[][] {
  const fromOrigin = distances(graph, origin, banned);
  const fromDestination = distances(graph, destination, banned);
  const steps = fromOrigin.get(destination) ?? -1;
  const layers: string[][] = Array.from({ length: steps + 1 }, () => []);
  for (const [id, step] of fromOrigin) {
    if (step + (fromDestination.get(id) ?? Infinity) === steps) layers[step].push(id);
  }
  return layers;
}

/**
 * Builds the puzzle for a pair with up to `wanted` forbidden places, picked one by one: each lies
 * on some shortest trail left by the ones before it, and a trail around all of them remains. Null
 * when forbidden places are wanted and none is possible.
 */
function puzzleFor(
  graph: Graph,
  origin: string,
  destination: string,
  level: TrailLevel,
  wanted: number,
  random: () => number,
): TrailPuzzle | null {
  const forbidden = new Set<string>();
  while (forbidden.size < wanted) {
    const between = shortestLayers(graph, origin, destination, forbidden).slice(1, -1).flat();
    const next = shuffled(between, random).find((id) =>
      shortestPath(graph, origin, destination, new Set([...forbidden, id])),
    );
    if (!next) break;
    forbidden.add(next);
  }
  if (wanted > 0 && forbidden.size === 0) return null;
  // No cap on the way around: a long detour (even past MAX_STEPS) is intended.
  const path = shortestPath(graph, origin, destination, forbidden) as string[];
  const steps = path.length - 1;
  const guesses = trailGuesses(steps, level);
  return { origin, destination, forbidden: [...forbidden], steps, path, guesses };
}

/**
 * How many valid pairs there are among `ids`, counting only up to `atLeast`; with `forbidding`,
 * only those where some place can be forbidden.
 */
export function countPuzzles(
  ids: string[],
  graph: Graph,
  forbidding: boolean,
  atLeast: number,
): number {
  const known = new Set(ids);
  let count = 0;
  for (const origin of ids) {
    for (const destination of destinationsOf(origin, known, graph)) {
      if (origin > destination) continue; // each pair once
      const wanted = forbidding ? 1 : 0;
      if (puzzleFor(graph, origin, destination, 'normal', wanted, () => 0.5)) count++;
      if (count >= atLeast) return count;
    }
  }
  return count;
}

/** What the last games of a map were, so the next one is different. */
export interface TrailHistory {
  /** Last pairs played, newest first (see `pairKey`). */
  pairs: string[];
  /** Central places the last game could not avoid. */
  centrals: string[];
}

export const NO_HISTORY: TrailHistory = { pairs: [], centrals: [] };
const HISTORY_PAIRS = 15;
/** Share of the places, those with most borders, that count as central. */
const CENTRAL_SHARE = 0.1;
/** Draws before accepting a pair through the same central place as the last game. */
const CENTRAL_TRIES = 20;

/** The central places that lie on every shortest path of a puzzle. */
export function unavoidableCentrals(graph: Graph, puzzle: TrailPuzzle): string[] {
  const places = Object.keys(graph)
    .filter((id) => graph[id].length > 0)
    .sort((a, b) => graph[b].length - graph[a].length);
  const central = new Set(places.slice(0, Math.ceil(places.length * CENTRAL_SHARE)));
  const { origin, destination, forbidden } = puzzle;
  // Alone in its layer = on every shortest path.
  return shortestLayers(graph, origin, destination, new Set(forbidden))
    .filter((layer) => layer.length === 1 && central.has(layer[0]))
    .flat();
}

/** The history after a new game. */
export function nextHistory(
  history: TrailHistory,
  graph: Graph,
  puzzle: TrailPuzzle,
): TrailHistory {
  const key = pairKey(puzzle.origin, puzzle.destination);
  return {
    pairs: [key, ...history.pairs.filter((pair) => pair !== key)].slice(0, HISTORY_PAIRS),
    centrals: unavoidableCentrals(graph, puzzle),
  };
}

/** How many places a game forbids: 1 in about one game in three, or 1 to 3 (3 is the rarest). */
export function drawForbiddenCount(mode: TrailForbidden, random: () => number): number {
  if (mode === 'none') return 0;
  const draw = random();
  if (mode === 'sometimes') return draw < 1 / 3 ? 1 : 0;
  return draw < 0.4 ? 1 : draw < 0.8 ? 2 : 3;
}

export interface PuzzleOptions {
  level: TrailLevel;
  forbidden: TrailForbidden;
  history?: TrailHistory;
  random?: () => number;
}

/**
 * A random puzzle between two of the `ids`, or null when there is none. Every origin with a valid
 * pair is as likely, then every destination of it, so a big land mass is not favored. Pairs played
 * lately are avoided while there is another, and so is a pair that cannot avoid the same central
 * place as the last game.
 */
export function findPuzzle(
  ids: string[],
  graph: Graph,
  { level, forbidden, history = NO_HISTORY, random = Math.random }: PuzzleOptions,
): TrailPuzzle | null {
  const known = new Set(ids);
  const wanted = drawForbiddenCount(forbidden, random);

  const draw = (avoid: ReadonlySet<string>): TrailPuzzle | null => {
    for (const origin of shuffled(ids, random)) {
      for (const destination of shuffled(destinationsOf(origin, known, graph), random)) {
        if (avoid.has(pairKey(origin, destination))) continue;
        const puzzle = puzzleFor(graph, origin, destination, level, wanted, random);
        if (puzzle) return puzzle;
      }
    }
    return null;
  };

  for (const avoid of [new Set(history.pairs), NONE]) {
    const first = draw(avoid);
    let puzzle = first;
    for (let tries = 0; puzzle && tries < CENTRAL_TRIES; tries++) {
      const centrals = unavoidableCentrals(graph, puzzle);
      if (!centrals.some((id) => history.centrals.includes(id))) return puzzle;
      puzzle = draw(avoid);
    }
    if (first) return first;
  }
  return null;
}

// --- Playing a puzzle ---

/**
 * How good a guess is, worked out from the guesses of the whole game (never from those left, so
 * it never changes while playing): on a shortest path, on a trail that still fits the guesses
 * (a detour), or of no use (too far, an island, a forbidden place).
 */
export type TrailColor = 'near' | 'detour' | 'far';

/** Steps from the origin and from the destination, never through a forbidden place. */
export interface TrailDistances {
  fromOrigin: Map<string, number>;
  fromDestination: Map<string, number>;
}

export function trailDistances(graph: Graph, puzzle: TrailPuzzle): TrailDistances {
  const banned = new Set(puzzle.forbidden);
  return {
    fromOrigin: distances(graph, puzzle.origin, banned),
    fromDestination: distances(graph, puzzle.destination, banned),
  };
}

export function trailColor(
  graph: Graph,
  puzzle: TrailPuzzle,
  d: TrailDistances,
  id: string,
): TrailColor {
  const a = d.fromOrigin.get(id);
  const b = d.fromDestination.get(id);
  if (puzzle.forbidden.includes(id) || a === undefined || b === undefined) return 'far';
  if (a + b === puzzle.steps) return 'near';
  // No trail through it can be shorter than a + b borders (a + b - 1 places between the ends).
  if (a + b - 1 > puzzle.guesses) return 'far';
  // The two halves may share places (a dead end like Andorra): a trail never repeats one.
  const { origin, destination, forbidden } = puzzle;
  const length = shortestTrailThrough(graph, origin, destination, id, new Set(forbidden));
  return length !== null && length - 1 <= puzzle.guesses ? 'detour' : 'far';
}

/**
 * The color of a link between two places (a sea crossing), by the same rule as a place's: as if
 * there were a place halfway.
 */
export function linkColor(graph: Graph, puzzle: TrailPuzzle, a: string, b: string): TrailColor {
  const { origin, destination, forbidden } = puzzle;
  const half = pairKey(a, b);
  const length = shortestTrailThrough(
    { ...graph, [half]: [a, b] },
    origin,
    destination,
    half,
    new Set(forbidden),
  );
  if (length === null) return 'far';
  // The halfway place made the trail one step longer.
  const steps = length - 1;
  if (steps === puzzle.steps) return 'near';
  return steps - 1 <= puzzle.guesses ? 'detour' : 'far';
}

/**
 * Borders crossed by the shortest trail from `origin` to `destination` that goes through `via`
 * without repeating a place (never entering `banned`), or null when there is none. It is two
 * routes from `via`, one to each end, sharing no place: a minimum-cost flow of 2 units where each
 * place is split in two (in → out, room for 1) so that only one route can use it.
 */
export function shortestTrailThrough(
  graph: Graph,
  origin: string,
  destination: string,
  via: string,
  banned: ReadonlySet<string> = NONE,
): number | null {
  const ids = [...new Set([...Object.keys(graph), origin, destination, via])];
  const index = new Map(ids.map((id, i) => [id, i]));
  const placeIn = (id: string) => 2 * (index.get(id) as number);
  const placeOut = (id: string) => placeIn(id) + 1;
  const sink = 2 * ids.length;
  // Edges in pairs (forward, then its reverse at index ^ 1).
  const to: number[] = [];
  const room: number[] = [];
  const cost: number[] = [];
  const edges: number[][] = Array.from({ length: sink + 1 }, () => []);
  const link = (from: number, target: number, price: number) => {
    for (const [a, b, r, c] of [
      [from, target, 1, price],
      [target, from, 0, -price],
    ]) {
      edges[a].push(to.length);
      to.push(b);
      room.push(r);
      cost.push(c);
    }
  };
  for (const id of ids) {
    if (banned.has(id) || id === via) continue;
    link(placeIn(id), placeOut(id), 0);
    // A route ends at the origin or at the destination: it never goes on from there.
    if (id === origin || id === destination) {
      link(placeOut(id), sink, 0);
      continue;
    }
    for (const next of graph[id] ?? []) if (!banned.has(next)) link(placeOut(id), placeIn(next), 1);
  }
  for (const next of graph[via] ?? []) if (!banned.has(next)) link(placeOut(via), placeIn(next), 1);

  // Two cheapest augmenting paths (Bellman-Ford with a queue: the reverse edges cost less than 0).
  let total = 0;
  for (let unit = 0; unit < 2; unit++) {
    const dist = new Array<number>(sink + 1).fill(Infinity);
    const through = new Array<number>(sink + 1).fill(-1);
    const queued = new Array<boolean>(sink + 1).fill(false);
    dist[placeOut(via)] = 0;
    const queue = [placeOut(via)];
    // The queue grows while it is walked: for-of keeps going until it is empty.
    for (const node of queue) {
      queued[node] = false;
      for (const edge of edges[node]) {
        const next = to[edge];
        if (room[edge] > 0 && dist[node] + cost[edge] < dist[next]) {
          dist[next] = dist[node] + cost[edge];
          through[next] = edge;
          if (!queued[next]) {
            queued[next] = true;
            queue.push(next);
          }
        }
      }
    }
    if (dist[sink] === Infinity) return null;
    total += dist[sink];
    for (let node = sink; node !== placeOut(via); node = to[through[node] ^ 1]) {
      room[through[node]]--;
      room[through[node] ^ 1]++;
    }
  }
  return total;
}

/** The borders among some places only (the guesses plus the origin and the destination). */
function within(graph: Graph, puzzle: TrailPuzzle, chosen: readonly string[]): Graph {
  const allowed = new Set([puzzle.origin, puzzle.destination, ...chosen]);
  for (const id of puzzle.forbidden) allowed.delete(id);
  return Object.fromEntries(
    [...allowed].map((id) => [id, (graph[id] ?? []).filter((next) => allowed.has(next))]),
  );
}

/**
 * The trail the guesses make: the shortest route from the origin to the destination that goes
 * only through guessed places, in any order. Null while they do not connect yet.
 */
export function trailLink(
  graph: Graph,
  puzzle: TrailPuzzle,
  chosen: readonly string[],
): string[] | null {
  return shortestPath(within(graph, puzzle, chosen), puzzle.origin, puzzle.destination);
}

/** The guesses already joined (through other guesses) to the origin or to the destination. */
export function trailPieces(
  graph: Graph,
  puzzle: TrailPuzzle,
  chosen: readonly string[],
): string[] {
  const sub = within(graph, puzzle, chosen);
  const joined = new Set([
    ...distances(sub, puzzle.origin).keys(),
    ...distances(sub, puzzle.destination).keys(),
  ]);
  return chosen.filter((id) => joined.has(id));
}

/**
 * The "next outline" hint. Among the shortest paths, the one with the most places already known
 * (green guesses and outlines shown before); on it, the first missing place after the part joined
 * to the origin, or, when nothing is joined to the origin yet but something is joined to the
 * destination, the one before that part. Null when that path has nothing left to show.
 */
export function nextOutline(
  graph: Graph,
  puzzle: TrailPuzzle,
  d: TrailDistances,
  known: ReadonlySet<string>,
): string | null {
  const { origin, destination, steps } = puzzle;
  const layers: string[][] = Array.from({ length: steps + 1 }, () => []);
  for (const [id, a] of d.fromOrigin) {
    if (a <= steps && a + (d.fromDestination.get(id) ?? Infinity) === steps) layers[a].push(id);
  }
  // Layer by layer, the most known places on a shortest path from the origin to each place.
  const score = new Map([[origin, 0]]);
  const before = new Map<string, string>();
  for (let step = 1; step <= steps; step++) {
    for (const id of layers[step]) {
      let best = -1;
      for (const previous of graph[id] ?? []) {
        const value = score.get(previous);
        if (value !== undefined && d.fromOrigin.get(previous) === step - 1 && value > best) {
          best = value;
          before.set(id, previous);
        }
      }
      score.set(id, best + (known.has(id) ? 1 : 0));
    }
  }
  const path = [destination];
  while (path[0] !== origin) path.unshift(before.get(path[0]) as string);

  const between = path.slice(1, -1);
  const first = between.findIndex((id) => !known.has(id));
  if (first === -1) return null;
  const joinedToDestination = known.has(between[between.length - 1]);
  if (first > 0 || !joinedToDestination) return between[first];
  let last = between.length - 1;
  while (known.has(between[last])) last--;
  return between[last];
}
