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
