// Paths over the land borders, for the Trail game and for deciding where it can be played.

export type Graph = Record<string, string[]>;

/** A Trail puzzle only asks for routes of this many steps (borders crossed). */
export const MIN_STEPS = 3;
export const MAX_STEPS = 8;

export interface TrailPuzzle {
  origin: string;
  destination: string;
  /** Hard level: the place the trail may not go through. */
  forbidden: string | null;
  /** Steps of the shortest trail (avoiding `forbidden`, if there is one). */
  steps: number;
  /** One of the shortest trails, origin to destination, to show at the end. */
  path: string[];
  /** Guesses the player has: normal = steps + 4, hard = steps + 2. */
  guesses: number;
}

/** Steps from `from` to every place it can reach, never entering `banned`. */
export function distances(graph: Graph, from: string, banned?: string): Map<string, number> {
  const result = new Map([[from, 0]]);
  const queue = [from];
  // The queue grows while it is walked: for-of keeps going until it is empty.
  for (const place of queue) {
    for (const next of graph[place] ?? []) {
      if (next === banned || result.has(next)) continue;
      result.set(next, (result.get(place) ?? 0) + 1);
      queue.push(next);
    }
  }
  return result;
}

/** One shortest path, or null when the two places are not connected by land. */
export function shortestPath(
  graph: Graph,
  from: string,
  to: string,
  banned?: string,
): string[] | null {
  const before = new Map<string, string>();
  const seen = new Set([from]);
  const queue = [from];
  // The queue grows while it is walked: for-of keeps going until it is empty.
  for (const place of queue) {
    if (place === to) break;
    for (const next of graph[place] ?? []) {
      if (next === banned || seen.has(next)) continue;
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

/** Every pair of places (each pair once) joined by a shortest path of 3 to 8 steps. */
function* pairs(ids: string[], graph: Graph): Generator<[string, string, number]> {
  const known = new Set(ids);
  for (const origin of ids) {
    if (!graph[origin]?.length) continue;
    for (const [other, steps] of distances(graph, origin)) {
      if (origin < other && known.has(other) && steps >= MIN_STEPS && steps <= MAX_STEPS) {
        yield [origin, other, steps];
      }
    }
  }
}

/**
 * Builds the puzzle for a pair. The hard level also needs a forbidden place: one that lies on
 * some shortest trail but can be avoided (another trail exists without it).
 */
function puzzleFor(
  graph: Graph,
  origin: string,
  destination: string,
  steps: number,
  hard: boolean,
  random: () => number,
): TrailPuzzle | null {
  if (!hard) {
    const path = shortestPath(graph, origin, destination) as string[];
    return { origin, destination, forbidden: null, steps, path, guesses: steps + 4 };
  }
  const fromOrigin = distances(graph, origin);
  const fromDestination = distances(graph, destination);
  const onShortest = [...fromOrigin.keys()].filter(
    (id) =>
      id !== origin &&
      id !== destination &&
      fromOrigin.get(id)! + (fromDestination.get(id) ?? Infinity) === steps,
  );
  for (const forbidden of shuffled(onShortest, random)) {
    // No cap on the way around: a long detour (even past MAX_STEPS) is intended.
    const path = shortestPath(graph, origin, destination, forbidden);
    if (path) {
      const around = path.length - 1;
      return { origin, destination, forbidden, steps: around, path, guesses: around + 2 };
    }
  }
  return null;
}

/** How many valid pairs there are among `ids`, counting only up to `atLeast`. */
export function countPuzzles(ids: string[], graph: Graph, hard: boolean, atLeast: number): number {
  let count = 0;
  for (const [origin, destination, steps] of pairs(ids, graph)) {
    if (puzzleFor(graph, origin, destination, steps, hard, () => 0.5)) count++;
    if (count >= atLeast) break;
  }
  return count;
}

/** A random puzzle between two of the `ids`, or null when there is none. */
export function findPuzzle(
  ids: string[],
  graph: Graph,
  hard: boolean,
  random: () => number = Math.random,
): TrailPuzzle | null {
  for (const [a, b, steps] of shuffled([...pairs(ids, graph)], random)) {
    const [origin, destination] = random() < 0.5 ? [a, b] : [b, a];
    const puzzle = puzzleFor(graph, origin, destination, steps, hard, random);
    if (puzzle) return puzzle;
  }
  return null;
}

// --- Playing a puzzle ---

/**
 * How good a guess is, worked out from the guesses of the whole game (never from those left, so
 * it never changes while playing): on a shortest path, on a trail that still fits the guesses
 * (a detour), or of no use (too far, an island, the forbidden place).
 */
export type TrailColor = 'near' | 'detour' | 'far';

/** Steps from the origin and from the destination, never through the forbidden place. */
export interface TrailDistances {
  fromOrigin: Map<string, number>;
  fromDestination: Map<string, number>;
}

export function trailDistances(graph: Graph, puzzle: TrailPuzzle): TrailDistances {
  const banned = puzzle.forbidden ?? undefined;
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
  if (id === puzzle.forbidden || a === undefined || b === undefined) return 'far';
  if (a + b === puzzle.steps) return 'near';
  // No trail through it can be shorter than a + b borders (a + b - 1 places between the ends).
  if (a + b - 1 > puzzle.guesses) return 'far';
  // The two halves may share places (a dead end like Andorra): a trail never repeats one.
  const { origin, destination, forbidden } = puzzle;
  const length = shortestTrailThrough(graph, origin, destination, id, forbidden ?? undefined);
  return length !== null && length - 1 <= puzzle.guesses ? 'detour' : 'far';
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
  banned?: string,
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
    if (id === banned || id === via) continue;
    link(placeIn(id), placeOut(id), 0);
    // A route ends at the origin or at the destination: it never goes on from there.
    if (id === origin || id === destination) {
      link(placeOut(id), sink, 0);
      continue;
    }
    for (const next of graph[id] ?? []) if (next !== banned) link(placeOut(id), placeIn(next), 1);
  }
  for (const next of graph[via] ?? []) if (next !== banned) link(placeOut(via), placeIn(next), 1);

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
  if (puzzle.forbidden) allowed.delete(puzzle.forbidden);
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
