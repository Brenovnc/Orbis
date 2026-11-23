import neighborsJson from '../../../../public/data/neighbors.json';
import statesJson from '../../../../public/data/states.json';
import crossingsJson from '../../../../public/data/trail-crossings.json';
import { BrazilState } from '../data/geo-data.models';
import { CrossingsData, NeighborsData, pairKey } from '../data/proximity';
import {
  PRESETS,
  type PresetValues,
  type TrailForbidden,
  type TrailLevel,
} from '../settings.service';
import { borderGraph, canForbid, hasEnoughBorders, withCrossings } from './availability';
import { SavedGame } from './playable-game';
import { RecordEntry, isBetter, recordKey, recordLevel } from './records.service';
import { buildBrazilTargets, inContinent } from './targets';
import { seededRandom, worldTargets } from './test-targets';
import { crossingsAlong, crossingsAmong } from './trail-crossings';
import { TrailGame, TrailGameConfig } from './trail-game';
import {
  Graph,
  NO_HISTORY,
  PuzzleOptions,
  TrailPuzzle,
  countPuzzles,
  distances,
  drawForbiddenCount,
  findPuzzle,
  linkColor,
  nextHistory,
  nextOutline,
  shortestPath,
  shortestTrailThrough,
  trailColor,
  trailDistances,
  trailLink,
  unavoidableCentrals,
} from './trail-graph';

const data = neighborsJson as NeighborsData;
const pool = worldTargets(false);
const europe = inContinent(pool, 'europe');
const trailGraph = data.world.trail;
const crossings = crossingsJson as unknown as CrossingsData;
const seaGraph = withCrossings(trailGraph, crossings, false, null);
const ids = (targets: { id: string }[]) => targets.map((t) => t.id);
const nameOf = (id: string) => pool.find((t) => t.id === id)?.place.name.pt as string;
/** Countries with no land border at all (island countries), to spend guesses on. */
const islands = ids(pool).filter((id) => !trailGraph[id]?.length);

function game(level: TrailLevel, extra: Partial<TrailGameConfig> = {}) {
  return new TrailGame({
    level,
    forbidden: level === 'hard' ? 'always' : 'none',
    canForbid: true,
    crossings: false,
    pool,
    askable: europe,
    graph: trailGraph,
    via: data.world.via,
    tolerance: 1,
    random: seededRandom(),
    territories: false,
    ...extra,
  });
}

/** A puzzle written by hand on the real borders (spare guesses as in the game). */
function puzzle(origin: string, destination: string, ...forbidden: string[]): TrailPuzzle {
  const path = shortestPath(trailGraph, origin, destination, new Set(forbidden)) as string[];
  const steps = path.length - 1;
  const guesses = steps + (forbidden.length ? 2 : 4);
  return { origin, destination, forbidden, steps, path, guesses };
}

const find = (places: string[], graph: Graph, extra: Partial<PuzzleOptions> = {}) =>
  findPuzzle(places, graph, {
    level: 'normal',
    forbidden: 'none',
    random: seededRandom(),
    ...extra,
  });

const save = (p: TrailPuzzle, level: TrailLevel, extra: Partial<SavedGame> = {}): SavedGame => ({
  v: 1,
  gameId: 'trilha',
  layer: 'world',
  territories: false,
  found: [],
  elapsedMs: 0,
  durationMs: null,
  trailLevel: level,
  puzzle: p,
  chosen: [],
  ...extra,
});

/** A game on a hand-made puzzle, ready to play. */
function gameOn(
  p: TrailPuzzle,
  level: TrailLevel = p.forbidden.length ? 'hard' : 'normal',
): TrailGame {
  const g = game(level, { saved: save(p, level) });
  g.resume();
  return g;
}

describe('trail graph', () => {
  it('distances and shortest paths follow the borders', () => {
    expect(distances(trailGraph, 'PRT').get('ESP')).toBe(1);
    expect(shortestPath(trailGraph, 'PRT', 'FRA')).toEqual(['PRT', 'ESP', 'FRA']);
    // Around a place: Portugal reaches France only through Spain.
    expect(shortestPath(trailGraph, 'PRT', 'FRA', new Set(['ESP']))).toBeNull();
    expect(shortestPath(trailGraph, 'PRT', 'JPN')).toBeNull();
  });

  it('a normal puzzle is 3 to 8 steps, with 4 spare guesses', () => {
    const random = seededRandom();
    for (let i = 0; i < 20; i++) {
      const p = find(ids(europe), trailGraph, { random }) as TrailPuzzle;
      expect(p.steps).toBeGreaterThanOrEqual(3);
      expect(p.steps).toBeLessThanOrEqual(8);
      expect(p.path.length).toBe(p.steps + 1);
      expect(p.guesses).toBe(p.steps + 4);
      expect(p.forbidden).toEqual([]);
      p.path.slice(1).forEach((id, n) => expect(trailGraph[p.path[n]]).toContain(id));
    }
  });

  it('forbids 1 to 3 places, each on a shortest trail left by the ones before it', () => {
    const random = seededRandom();
    const counts = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const p = find(ids(europe), trailGraph, {
        level: 'hard',
        forbidden: 'always',
        random,
      }) as TrailPuzzle;
      counts.add(p.forbidden.length);
      const direct = distances(trailGraph, p.origin).get(p.destination) as number;
      expect(direct).toBeGreaterThanOrEqual(3);
      expect(direct).toBeLessThanOrEqual(8);
      p.forbidden.forEach((id, n) => {
        const before = new Set(p.forbidden.slice(0, n));
        const total = distances(trailGraph, p.origin, before).get(p.destination) as number;
        const there = distances(trailGraph, p.origin, before).get(id) as number;
        const back = distances(trailGraph, p.destination, before).get(id) as number;
        expect(there + back).toBe(total);
        expect([p.origin, p.destination, ...before]).not.toContain(id);
      });
      // The trail shown avoids them all, and the guesses count its length.
      const around = distances(trailGraph, p.origin, new Set(p.forbidden)).get(p.destination);
      expect(p.path.some((id) => p.forbidden.includes(id))).toBe(false);
      expect(p.steps).toBe(around);
      expect(p.path.length).toBe(p.steps + 1);
      expect(p.guesses).toBe(p.steps + 2);
    }
    expect(counts).toEqual(new Set([1, 2, 3]));
  });

  it('with forbidden places, levels other than hard still get 4 spare guesses', () => {
    const p = find(ids(europe), trailGraph, { forbidden: 'always' }) as TrailPuzzle;
    expect(p.forbidden.length).toBeGreaterThan(0);
    expect(p.guesses).toBe(p.steps + 4);
  });

  it('"sometimes" forbids 1 place in about a third of the games; "always", 1 or 2 more than 3', () => {
    const random = seededRandom();
    const tally = (mode: 'none' | 'sometimes' | 'always') => {
      const counts = [0, 0, 0, 0];
      for (let i = 0; i < 3000; i++) counts[drawForbiddenCount(mode, random)]++;
      return counts.map((n) => n / 3000);
    };
    expect(tally('none')).toEqual([1, 0, 0, 0]);
    const sometimes = tally('sometimes');
    expect(sometimes[1]).toBeGreaterThan(0.29);
    expect(sometimes[1]).toBeLessThan(0.38);
    expect(sometimes[2] + sometimes[3]).toBe(0);
    const always = tally('always');
    expect(always[0]).toBe(0);
    expect(always[1]).toBeGreaterThan(always[3]);
    expect(always[2]).toBeGreaterThan(always[3]);
    expect(always[3]).toBeGreaterThan(0.1);
  });

  it('only pairs 3 to 8 steps apart, both ends among the chosen places', () => {
    const fromPortugal = distances(trailGraph, 'PRT');
    const at = (steps: number) =>
      [...fromPortugal].find(([, distance]) => distance === steps)?.[0] as string;
    expect(find(['PRT', at(2)], trailGraph)).toBeNull();
    expect(at(9)).toBeDefined();
    expect(find(['PRT', at(9)], trailGraph)).toBeNull();
    expect(find(['PRT', at(3)], trailGraph)?.steps).toBe(3);
    expect(find(['PRT', at(8)], trailGraph)?.steps).toBe(8);
    // The path may cross other continents: Costa Rica to Ecuador goes through Panama and Colombia.
    const p = find(['CRI', 'ECU'], trailGraph) as TrailPuzzle;
    expect([p.origin, p.destination].sort()).toEqual(['CRI', 'ECU']);
    expect(p.path).toContain('COL');
  });

  it('no puzzle where there is no land route (Oceania)', () => {
    expect(find(ids(inContinent(pool, 'oceania')), trailGraph)).toBeNull();
  });

  it('where no place can be avoided (North America) games forbid none', () => {
    const northAmerica = ids(inContinent(pool, 'north-america'));
    expect(find(northAmerica, trailGraph)).not.toBeNull();
    expect(find(northAmerica, trailGraph, { forbidden: 'always' })).toBeNull();
    expect(countPuzzles(northAmerica, trailGraph, true, 5)).toBe(0);
    expect(canForbid(northAmerica, trailGraph)).toBe(false);
    expect(canForbid(ids(europe), trailGraph)).toBe(true);
    // At any level: the game starts, with nothing forbidden.
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const g = game(level, {
        forbidden: 'always',
        canForbid: false,
        askable: inContinent(pool, 'north-america'),
      });
      expect(g.puzzle?.forbidden).toEqual([]);
      expect(g.level).toBe(level);
    }
  });
});

describe('variety of the pairs', () => {
  it('is the same draw with the same seed', () => {
    const draw = (seed: number) =>
      find(ids(pool), seaGraph, { forbidden: 'always', random: seededRandom(seed) });
    expect(draw(5)).toEqual(draw(5));
    expect(draw(5)).not.toEqual(draw(6));
  });

  it('every origin with a valid pair is as likely', () => {
    // Drawn by pair, a country of the Americas would come out far less often than one of Eurasia.
    const random = seededRandom();
    const places = ids(pool);
    const origins = new Map<string, number>();
    const games = 4000;
    for (let i = 0; i < games; i++) {
      const { origin } = find(places, trailGraph, { random }) as TrailPuzzle;
      origins.set(origin, (origins.get(origin) ?? 0) + 1);
    }
    const expected = games / origins.size;
    for (const [id, times] of origins) {
      expect(times, id).toBeGreaterThan(expected * 0.3);
      expect(times, id).toBeLessThan(expected * 2);
    }
  });

  it('keeps the last 15 pairs, newest first, either way around', () => {
    const random = seededRandom();
    let history = NO_HISTORY;
    const played: string[] = [];
    for (let i = 0; i < 20; i++) {
      const p = find(ids(europe), trailGraph, { history, random }) as TrailPuzzle;
      const key = pairKey(p.origin, p.destination);
      expect(history.pairs).not.toContain(key);
      history = nextHistory(history, trailGraph, p);
      played.unshift(key);
      expect(history.pairs).toEqual(played.slice(0, 15));
    }
  });

  it('repeats a pair only when there is no other', () => {
    const some = ['PRT', 'POL', 'DNK'];
    const first = find(some, trailGraph) as TrailPuzzle;
    let history = nextHistory(NO_HISTORY, trailGraph, first);
    const second = find(some, trailGraph, { history, random: seededRandom() }) as TrailPuzzle;
    expect(pairKey(second.origin, second.destination)).not.toBe(history.pairs[0]);
    history = { pairs: ['DNK|POL', 'DNK|PRT', 'POL|PRT'], centrals: [] };
    expect(find(some, trailGraph, { history })).not.toBeNull();
  });

  it('avoids the central place the last game could not avoid', () => {
    const random = seededRandom();
    const last = puzzle('PRT', 'DEU');
    expect(unavoidableCentrals(trailGraph, last)).toContain('FRA');
    const history = nextHistory(NO_HISTORY, trailGraph, last);
    expect(history.centrals).toContain('FRA');
    for (let i = 0; i < 50; i++) {
      const p = find(ids(europe), trailGraph, { history, random }) as TrailPuzzle;
      const shared = unavoidableCentrals(trailGraph, p).filter((id) =>
        history.centrals.includes(id),
      );
      expect(shared).toEqual([]);
    }
  });

  it('never gets stuck when every pair goes through it', () => {
    const history = { pairs: [], centrals: ['ESP', 'FRA', 'DEU'] };
    expect(find(['PRT', 'POL'], trailGraph, { history })).not.toBeNull();
  });
});

describe('sea crossings', () => {
  const region = (continent: Parameters<typeof inContinent>[1]) =>
    ids(inContinent(pool, continent));
  const oceania = region('oceania');

  it('are edges like any other, in both directions, and leave the borders alone', () => {
    for (const [id, list] of Object.entries(seaGraph)) {
      expect(new Set(list).size, id).toBe(list.length);
      for (const other of list) expect(seaGraph[other], `${id}-${other}`).toContain(id);
    }
    expect(seaGraph['JPN']).toContain('KOR');
    expect(trailGraph['JPN']).toBeUndefined();
    expect(shortestPath(seaGraph, 'PRT', 'JPN')).not.toBeNull();
    const p = { ...puzzle('PRT', 'DEU'), destination: 'JPN' };
    expect(trailDistances(seaGraph, p).fromOrigin.has('JPN')).toBe(true);
  });

  it('on a continent, only those with both ends in it', () => {
    const graph = withCrossings(trailGraph, crossings, false, oceania);
    expect(graph['AUS']).toContain('PNG');
    expect(graph['AUS']).not.toContain('IDN');
  });

  it('those of a trail, and those between the places on the board', () => {
    const pairs = (list: { a: string; b: string }[]) => list.map(({ a, b }) => `${a}|${b}`);
    expect(pairs(crossingsAlong(crossings.off, ['CAN', 'USA', 'CUB', 'HTI']))).toEqual([
      'CUB|USA',
      'CUB|HTI',
    ]);
    expect(pairs(crossingsAlong(crossings.off, ['USA', 'BHS', 'HTI']))).toEqual([
      'BHS|USA',
      'BHS|HTI',
    ]);
    const board = new Set(['USA', 'CAN', 'CUB', 'PRT']);
    expect(pairs(crossingsAmong(crossings.off, board))).toEqual(['CUB|USA']);
  });

  it('make Oceania playable, and forbidding possible in North America', () => {
    const graph = withCrossings(trailGraph, crossings, false, oceania);
    expect(hasEnoughBorders('trilha', oceania, trailGraph)).toBe(false);
    expect(hasEnoughBorders('trilha', oceania, graph)).toBe(true);
    const northAmerica = region('north-america');
    const sea = withCrossings(trailGraph, crossings, false, northAmerica);
    expect(canForbid(northAmerica, trailGraph)).toBe(false);
    expect(canForbid(northAmerica, sea)).toBe(true);
  });

  it('a saved game keeps its crossings', () => {
    const extra = { graph: seaGraph, crossings: true, askable: pool };
    const first = game('normal', extra);
    first.revealOutline();
    expect(first.snapshot().trailCrossings).toBe(true);
    const again = game('normal', { ...extra, saved: first.snapshot() });
    expect(again.resumed).toBe(true);
    expect(again.puzzle).toEqual(first.puzzle);
  });
});

describe('guess colors', () => {
  // From A to D: two shortest paths (A-B-C-D, A-E-F-D), a bump (G), a long loop (C-H-I-J-D),
  // a dead end (K) and an island (X).
  const graph: Graph = {
    A: ['B', 'E'],
    B: ['A', 'C', 'G', 'K'],
    C: ['B', 'D', 'G', 'H'],
    D: ['C', 'F', 'J'],
    E: ['A', 'F'],
    F: ['E', 'D'],
    G: ['B', 'C'],
    H: ['C', 'I'],
    I: ['H', 'J'],
    J: ['I', 'D'],
    K: ['B'],
    X: [],
  };
  const make = (guesses: number, ...forbidden: string[]): TrailPuzzle => ({
    origin: 'A',
    destination: 'D',
    forbidden,
    steps: 3,
    path: ['A', 'B', 'C', 'D'],
    guesses,
  });
  const colorIn = (p: TrailPuzzle, id: string) =>
    trailColor(graph, p, trailDistances(graph, p), id);

  it('green on any shortest path, orange when a trail through it fits, red otherwise', () => {
    const p = make(5);
    for (const id of ['B', 'C', 'E', 'F']) expect(colorIn(p, id)).toBe('near');
    // A-B-G-C-D: 3 places between the ends.
    expect(colorIn(p, 'G')).toBe('detour');
    // A-B-C-H-I-J-D: 5 places between the ends, as many as the guesses.
    expect(colorIn(p, 'H')).toBe('detour');
    expect(colorIn(p, 'I')).toBe('detour');
    // The limit is the guesses of the whole game: one fewer and the loop no longer fits.
    expect(colorIn(make(4), 'I')).toBe('far');
    // A dead end is on no trail (going in and out would repeat B), however many guesses.
    expect(colorIn(make(20), 'K')).toBe('far');
    // No land border at all, or not on the map.
    expect(colorIn(p, 'X')).toBe('far');
    expect(colorIn(p, 'Q')).toBe('far');
  });

  it('a link has a color of its own, by the trails that take it', () => {
    const p = make(5);
    expect(linkColor(graph, p, 'B', 'C')).toBe('near');
    expect(linkColor(graph, p, 'C', 'B')).toBe('near');
    expect(linkColor(graph, p, 'A', 'E')).toBe('near');
    expect(linkColor(graph, p, 'G', 'C')).toBe('detour');
    expect(linkColor(graph, p, 'H', 'I')).toBe('detour');
    expect(linkColor(graph, make(4), 'H', 'I')).toBe('far');
    // Dead end, and a forbidden end.
    expect(linkColor(graph, p, 'B', 'K')).toBe('far');
    expect(linkColor(graph, make(9, 'B'), 'B', 'C')).toBe('far');
    // Both ends green, but no shortest trail takes the link between them.
    const linked = { ...graph, B: [...graph['B'], 'E'], E: [...graph['E'], 'B'] };
    expect(linkColor(linked, p, 'B', 'E')).toBe('detour');
  });

  it('every trail avoids all the forbidden places', () => {
    expect(shortestTrailThrough(graph, 'A', 'D', 'G')).toBe(4);
    expect(shortestTrailThrough(graph, 'A', 'D', 'G', new Set(['B']))).toBeNull();
    // Without E the way is through B and C; without H either, the long loop is cut.
    const two = { ...make(9, 'E', 'H'), path: ['A', 'B', 'C', 'D'] };
    for (const id of ['E', 'H', 'F', 'I']) expect(colorIn(two, id)).toBe('far');
    expect(colorIn(two, 'B')).toBe('near');
    expect(colorIn(two, 'G')).toBe('detour');
  });

  it('a forbidden place on every way but one leaves only that way', () => {
    // Without B, C is reached only through D, so no trail through it ends at D without repeating.
    const p = { ...make(9, 'B'), path: ['A', 'E', 'F', 'D'] };
    expect(colorIn(p, 'B')).toBe('far');
    expect(colorIn(p, 'E')).toBe('near');
    expect(colorIn(p, 'F')).toBe('near');
    for (const id of ['C', 'G', 'H', 'I', 'J']) expect(colorIn(p, id)).toBe('far');
  });

  it('on the real map: Portugal to Germany', () => {
    const normal = puzzle('PRT', 'DEU');
    const color = (p: TrailPuzzle, id: string) =>
      trailColor(trailGraph, p, trailDistances(trailGraph, p), id);
    expect(normal.steps).toBe(3);
    expect(color(normal, 'ESP')).toBe('near');
    expect(color(normal, 'FRA')).toBe('near');
    expect(color(normal, 'AND')).toBe('detour');
    // Morocco is next to Spain, but a trail through it goes around Africa: far more than 7 guesses.
    expect(color(normal, 'MAR')).toBe('far');
    expect(color(normal, 'JPN')).toBe('far');
    expect(color(normal, 'MNG')).toBe('far');
    // Without France the way goes around through Africa: Morocco becomes green.
    const hard = puzzle('PRT', 'DEU', 'FRA');
    expect(hard.path).toContain('MAR');
    expect(color(hard, 'FRA')).toBe('far');
    expect(color(hard, 'ESP')).toBe('near');
    expect(color(hard, 'MAR')).toBe('near');
    // Andorra lies only between Spain and France: with France forbidden it is a dead end.
    expect(color(hard, 'AND')).toBe('far');
  });
});

describe('next outline hint', () => {
  // Two shortest paths from A to Z: A-B-C-D-Z and A-E-F-G-Z.
  const graph: Graph = {
    A: ['B', 'E'],
    B: ['A', 'C'],
    C: ['B', 'D'],
    D: ['C', 'Z'],
    E: ['A', 'F'],
    F: ['E', 'G'],
    G: ['F', 'Z'],
    Z: ['D', 'G'],
  };
  const p: TrailPuzzle = {
    origin: 'A',
    destination: 'Z',
    forbidden: [],
    steps: 4,
    path: ['A', 'B', 'C', 'D', 'Z'],
    guesses: 8,
  };
  const next = (...known: string[]) =>
    nextOutline(graph, p, trailDistances(graph, p), new Set(known));

  it('follows the shortest path that uses the green guesses, from the origin side', () => {
    expect(next()).toBe('B');
    expect(next('E')).toBe('F');
    expect(next('E', 'F')).toBe('G');
    expect(next('E', 'G')).toBe('F');
  });

  it('extends the part joined to the destination when nothing is joined to the origin', () => {
    expect(next('G')).toBe('F');
    expect(next('F', 'G')).toBe('E');
  });

  it('has nothing to show once that path is fully known', () => {
    expect(next('E', 'F', 'G')).toBeNull();
  });
});

describe('where the border games are available', () => {
  const available = (
    id: 'vizinhos' | 'trilha',
    continent: Parameters<typeof inContinent>[1],
    forbidding = false,
  ) =>
    hasEnoughBorders(
      id,
      ids(inContinent(pool, continent)),
      borderGraph(data, 'world', false, id),
      forbidding,
    );

  it('Oceania has too few borders for Neighbors and the Trail', () => {
    expect(available('vizinhos', 'oceania')).toBe(false);
    expect(available('trilha', 'oceania')).toBe(false);
    expect(available('trilha', 'oceania', true)).toBe(false);
  });

  it('the other continents and the whole world are fine', () => {
    const continents = [
      'africa',
      'asia',
      'europe',
      'north-america',
      'south-america',
      null,
    ] as const;
    for (const continent of continents) expect(available('vizinhos', continent)).toBe(true);
    for (const continent of ['africa', 'asia', 'europe', 'south-america', null] as const) {
      expect(available('trilha', continent)).toBe(true);
      expect(available('trilha', continent, true)).toBe(true);
    }
  });

  it('North America has the Trail, but nothing to forbid', () => {
    expect(available('trilha', 'north-america')).toBe(true);
    expect(available('trilha', 'north-america', true)).toBe(false);
  });

  it('each game takes its own graph', () => {
    expect(borderGraph(data, 'world', false, 'vizinhos')).toBe(data.world.territoriesOff);
    expect(borderGraph(data, 'world', false, 'trilha')).toBe(data.world.trail);
    expect(borderGraph(data, 'world', true, 'vizinhos')).toBe(data.world.territoriesOn);
    expect(borderGraph(data, 'world', true, 'trilha')).toBe(data.world.trailTerritories);
    expect(borderGraph(data, 'brazil', false, 'trilha')).toBe(data.brazil);
  });

  it('Brazil has enough states for everything', () => {
    const states = Object.keys(data.brazil);
    expect(hasEnoughBorders('vizinhos', states, data.brazil)).toBe(true);
    expect(hasEnoughBorders('trilha', states, data.brazil)).toBe(true);
    expect(hasEnoughBorders('trilha', states, data.brazil, true)).toBe(true);
  });
});

describe('TrailGame', () => {
  it('origin and destination are given: typing them costs nothing', () => {
    const g = game('normal');
    const p = g.puzzle as TrailPuzzle;
    expect(g.chosen()).toEqual([]);
    expect(g.submit(nameOf(p.origin)).kind).toBe('end');
    expect(g.submit(nameOf(p.destination)).kind).toBe('end');
    expect(g.guessesUsed()).toBe(0);
  });

  it('the places between the ends, typed in any order, win the game', () => {
    const g = game('normal');
    const p = g.puzzle as TrailPuzzle;
    const between = p.path.slice(1, -1).reverse();
    between.forEach((id, n) => {
      const result = g.submit(nameOf(id));
      expect(result).toEqual(
        expect.objectContaining({ kind: 'guess', color: 'near', won: n === between.length - 1 }),
      );
    });
    expect(g.result()).toEqual(
      expect.objectContaining({ found: 1, reason: 'complete', guesses: p.steps - 1 }),
    );
    expect(g.link()).toEqual(p.path);
    expect(g.madeShortest()).toBe(true);
  });

  it('another path with as many steps as the one drawn is a shortest path too', () => {
    const g = gameOn(puzzle('DEU', 'ITA'));
    const other = ['AUT', 'CHE', 'FRA'].find((id) => !g.puzzle?.path.includes(id)) as string;
    expect(g.madeShortest()).toBe(false);
    g.submit(nameOf(other));
    expect(g.link()).toEqual(['DEU', other, 'ITA']);
    expect(g.madeShortest()).toBe(true);
  });

  it('a trail of detours also wins, and colors never change while playing', () => {
    // Germany to Italy is 2 steps (through Austria, Switzerland or France).
    const g = gameOn(puzzle('DEU', 'ITA'));
    for (const id of ['SVN', 'CZE', 'HUN']) {
      expect(g.submit(nameOf(id))).toEqual(
        expect.objectContaining({ kind: 'guess', color: 'detour', won: false }),
      );
    }
    expect(g.guesses().map((guess) => guess.color)).toEqual(['detour', 'detour', 'detour']);
    expect(g.submit(nameOf('SVK'))).toEqual(expect.objectContaining({ won: true }));
    expect(g.link()).toEqual(['DEU', 'CZE', 'SVK', 'HUN', 'SVN', 'ITA']);
    expect(g.madeShortest()).toBe(false);
    expect(g.result()).toEqual(expect.objectContaining({ reason: 'complete', guesses: 4 }));
  });

  it('every new real place costs a guess; repeats, non-places and non-targets do not', () => {
    const g = game('normal');
    expect(g.submit(nameOf('JPN'))).toEqual(
      expect.objectContaining({ kind: 'guess', color: 'far' }),
    );
    expect(g.hasBorders('JPN')).toBe(false);
    expect(g.guessesUsed()).toBe(1);
    expect(g.submit(nameOf('JPN')).kind).toBe('repeat');
    expect(g.submit('xyzxyz').kind).toBe('miss');
    // Greenland is part of Denmark and Kosovo is not a target with territories off.
    expect(g.submit('groenlândia').kind).toBe('miss');
    expect(g.submit('kosovo').kind).toBe('miss');
    expect(g.guessesUsed()).toBe(1);
  });

  it('running out of guesses ends the game; winning with the last one is a win', () => {
    const lost = game('normal');
    for (const id of islands.slice(0, lost.total)) lost.submit(nameOf(id));
    expect(lost.result()).toEqual(
      expect.objectContaining({ found: 0, reason: 'guesses', guesses: lost.total }),
    );
    expect(lost.submit(nameOf('FRA')).kind).toBe('ignored');

    const won = gameOn(puzzle('DEU', 'ITA'));
    for (const id of islands.slice(0, won.total - 1)) won.submit(nameOf(id));
    expect(won.guessesLeft()).toBe(1);
    won.submit(nameOf('AUT'));
    expect(won.result()).toEqual(
      expect.objectContaining({ found: 1, reason: 'complete', guesses: won.total }),
    );
  });

  it('hard: the forbidden place is shown, costs a guess and never links the trail', () => {
    const g = gameOn(puzzle('PRT', 'DEU', 'FRA'));
    expect(g.revealed()).toEqual(new Set(['FRA']));
    expect(g.submit(nameOf('ESP'))).toEqual(expect.objectContaining({ color: 'near' }));
    expect(g.submit(nameOf('FRA'))).toEqual(
      expect.objectContaining({ kind: 'guess', color: 'far', won: false }),
    );
    expect(g.guessesUsed()).toBe(2);
    expect(g.link()).toBeNull();
    expect(trailLink(trailGraph, g.puzzle as TrailPuzzle, ['ESP', 'FRA'])).toBeNull();
  });

  it('several forbidden places are all shown, and none links the trail', () => {
    const p = puzzle('DEU', 'ITA', 'AUT', 'CHE');
    expect(p.path).toEqual(['DEU', 'FRA', 'ITA']);
    const g = gameOn(p);
    expect(g.revealed()).toEqual(new Set(['AUT', 'CHE']));
    expect(g.targets.map((target) => target.id).sort()).toEqual(['AUT', 'CHE']);
    for (const id of ['AUT', 'CHE']) {
      expect(g.submit(nameOf(id))).toEqual(expect.objectContaining({ color: 'far', won: false }));
    }
    expect(g.submit(nameOf('FRA'))).toEqual(expect.objectContaining({ won: true }));
  });

  it('hints are free, unlimited and mark the game', () => {
    const g = game('normal');
    const p = g.puzzle as TrailPuzzle;
    expect(g.hinted()).toBe(false);
    for (let i = 0; i < p.steps - 1; i++) expect(g.revealOutline()).not.toBeNull();
    expect(g.nextOutline()).toBeNull();
    expect(g.revealOutline()).toBeNull();
    expect(g.outlines().length).toBe(p.steps - 1);
    expect(g.guessesUsed()).toBe(0);
    expect(g.hinted()).toBe(true);
    expect(g.revealMap()).toBe(true);
    expect(g.revealMap()).toBe(false);
    // The outlines do not count as guesses: the trail is not closed.
    expect(g.link()).toBeNull();
    for (const id of p.path.slice(1, -1)) g.submit(nameOf(id));
    expect(g.result()).toEqual(expect.objectContaining({ reason: 'complete', hinted: true }));
  });

  it('easy has no "reveal map" hint', () => {
    expect(game('easy').revealMap()).toBe(false);
  });

  it('a saved game resumes with its level, guesses and hints', () => {
    const first = game('hard');
    first.submit(nameOf('JPN'));
    first.revealOutline();
    first.revealMap();
    const again = game('easy', { saved: first.snapshot() });
    expect(again.level).toBe('hard');
    expect(again.puzzle).toEqual(first.puzzle);
    expect(again.chosen()).toEqual(['JPN']);
    expect(again.outlines()).toEqual(first.outlines());
    expect(again.mapShown()).toBe(true);
    expect(again.status()).toBe('paused');
  });

  it('a saved game that no longer fits the borders or the level starts over', () => {
    const p = puzzle('PRT', 'DEU', 'FRA');
    const fresh = (g: TrailGame) => g.status() === 'playing' && g.guessesUsed() === 0;
    // Another level than the puzzle (a hard puzzle saved as normal), or one forbidden place only.
    const old = { ...p, forbidden: 'FRA' as unknown as string[] };
    expect(fresh(game('hard', { saved: save(old, 'hard', { chosen: ['ESP'] }) }))).toBe(true);
    expect(fresh(game('normal', { saved: save(p, 'normal', { chosen: ['ESP'] }) }))).toBe(true);
    // A path that skips a border.
    const broken = { ...p, path: ['PRT', 'DEU'] };
    expect(fresh(game('hard', { saved: save(broken, 'hard', { chosen: ['ESP'] }) }))).toBe(true);
    // No guesses left, or a place guessed twice.
    const full = islands.slice(0, p.guesses);
    expect(fresh(game('hard', { saved: save(p, 'hard', { chosen: full }) }))).toBe(true);
    expect(fresh(game('hard', { saved: save(p, 'hard', { chosen: ['ESP', 'ESP'] }) }))).toBe(true);
    expect(game('hard', { saved: save(p, 'hard', { chosen: ['ESP'] }) }).status()).toBe('paused');
  });

  it('on the Brazil map the trail uses the states', () => {
    const states = buildBrazilTargets(statesJson as unknown as BrazilState[]);
    const g = game('normal', {
      layer: 'brazil',
      pool: states,
      askable: states,
      graph: data.brazil,
      via: {},
    });
    const p = g.puzzle as TrailPuzzle;
    expect(p.steps).toBeGreaterThanOrEqual(3);
    const name = (id: string) => states.find((s) => s.id === id)?.place.name.pt as string;
    for (const id of p.path.slice(1, -1).reverse()) g.submit(name(id));
    expect(g.result()).toEqual(expect.objectContaining({ reason: 'complete' }));
  });
});

describe('Trail records and saves', () => {
  const entry = (guesses: number, hinted?: boolean): RecordEntry => ({
    found: 1,
    total: 1,
    elapsedMs: 60_000,
    guesses,
    hinted,
    date: '2026-11-20',
  });

  it('a game without hints always beats one with hints; then fewer guesses wins', () => {
    expect(isBetter(entry(9), entry(3, true))).toBe(true);
    expect(isBetter(entry(3, true), entry(9))).toBe(false);
    expect(isBetter(entry(4, true), entry(5, true))).toBe(true);
    expect(isBetter(entry(4), entry(5))).toBe(true);
    // A record from before the hints counts as a game without them.
    expect(isBetter(entry(5, true), entry(9, undefined))).toBe(false);
  });

  it('one record per level; custom games also key on the Trail options', () => {
    const base = { gameId: 'trilha', layer: 'world', territories: false, durationMs: null };
    const key = (values: PresetValues, crossings = false, canForbid = true) =>
      recordKey({ ...base, ...recordLevel('trilha', 'world', values, { canForbid, crossings }) });
    const custom = (trailLevel: TrailLevel, trailForbidden: TrailForbidden): PresetValues => ({
      ...PRESETS.normal,
      infoBox: false,
      trailLevel,
      trailForbidden,
    });
    const { easy, normal, hard } = PRESETS;
    expect(new Set([key(easy), key(normal), key(hard)]).size).toBe(3);
    expect(key(custom('easy', 'none'))).not.toBe(key(custom('normal', 'none')));
    expect(key(custom('normal', 'always'))).not.toBe(key(custom('normal', 'none')));
    expect(key(custom('normal', 'sometimes'))).not.toBe(key(normal));
    // Games with and without sea crossings never share a record.
    expect(key(normal, true)).not.toBe(key(normal));
    expect(key(custom('normal', 'none'), true)).not.toBe(key(custom('normal', 'none')));
    // Where no place can be forbidden, the option makes no difference.
    expect(key(custom('normal', 'always'), false, false)).toBe(
      key(custom('normal', 'none'), false, false),
    );
  });
});
