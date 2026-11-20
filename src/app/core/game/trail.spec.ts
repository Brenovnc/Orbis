import neighborsJson from '../../../../public/data/neighbors.json';
import statesJson from '../../../../public/data/states.json';
import { BrazilState } from '../data/geo-data.models';
import { NeighborsData } from '../data/proximity';
import type { TrailLevel } from '../settings.service';
import { borderGraph, hasEnoughBorders, playableTrailLevel } from './availability';
import { SavedGame } from './playable-game';
import { RecordEntry, isBetter, trailRecordId } from './records.service';
import { SavedGameStore } from './saved-game.store';
import { buildBrazilTargets, inContinent } from './targets';
import { seededRandom, worldTargets } from './test-targets';
import { TrailGame, TrailGameConfig } from './trail-game';
import {
  Graph,
  TrailPuzzle,
  countPuzzles,
  distances,
  findPuzzle,
  nextOutline,
  shortestPath,
  trailColor,
  trailDistances,
  trailLink,
} from './trail-graph';

const data = neighborsJson as NeighborsData;
const pool = worldTargets(false);
const europe = inContinent(pool, 'europe');
const trailGraph = data.world.trail;
const ids = (targets: { id: string }[]) => targets.map((t) => t.id);
const nameOf = (id: string) => pool.find((t) => t.id === id)?.place.name.pt as string;
/** Countries with no land border at all (island countries), to spend guesses on. */
const islands = ids(pool).filter((id) => !trailGraph[id]?.length);

function game(level: TrailLevel, extra: Partial<TrailGameConfig> = {}) {
  return new TrailGame({
    level,
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
function puzzle(origin: string, destination: string, forbidden: string | null = null): TrailPuzzle {
  const path = shortestPath(trailGraph, origin, destination, forbidden ?? undefined) as string[];
  const steps = path.length - 1;
  return { origin, destination, forbidden, steps, path, guesses: steps + (forbidden ? 2 : 4) };
}

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
function gameOn(p: TrailPuzzle, level: TrailLevel = p.forbidden ? 'hard' : 'normal'): TrailGame {
  const g = game(level, { saved: save(p, level) });
  g.resume();
  return g;
}

describe('trail graph', () => {
  it('distances and shortest paths follow the borders', () => {
    expect(distances(trailGraph, 'PRT').get('ESP')).toBe(1);
    expect(shortestPath(trailGraph, 'PRT', 'FRA')).toEqual(['PRT', 'ESP', 'FRA']);
    // Around a place: Portugal reaches France only through Spain.
    expect(shortestPath(trailGraph, 'PRT', 'FRA', 'ESP')).toBeNull();
    expect(shortestPath(trailGraph, 'PRT', 'JPN')).toBeNull();
  });

  it('a normal puzzle is 3 to 8 steps, with 4 spare guesses', () => {
    for (let i = 0; i < 20; i++) {
      const p = findPuzzle(ids(europe), trailGraph, false, seededRandom()) as TrailPuzzle;
      expect(p.steps).toBeGreaterThanOrEqual(3);
      expect(p.steps).toBeLessThanOrEqual(8);
      expect(p.path.length).toBe(p.steps + 1);
      expect(p.guesses).toBe(p.steps + 4);
      expect(p.forbidden).toBeNull();
      p.path.slice(1).forEach((id, n) => expect(trailGraph[p.path[n]]).toContain(id));
    }
  });

  it('a hard puzzle forbids a place that can be avoided, with 2 spare guesses', () => {
    for (let i = 0; i < 20; i++) {
      const p = findPuzzle(ids(europe), trailGraph, true, seededRandom()) as TrailPuzzle;
      const forbidden = p.forbidden as string;
      const fromOrigin = distances(trailGraph, p.origin);
      const direct = fromOrigin.get(p.destination) as number;
      const fromForbidden = distances(trailGraph, forbidden).get(p.destination) as number;
      expect(direct).toBeGreaterThanOrEqual(3);
      expect(direct).toBeLessThanOrEqual(8);
      expect([p.origin, p.destination]).not.toContain(forbidden);
      // It lies on a shortest trail, and the trail shown goes around it.
      expect((fromOrigin.get(forbidden) as number) + fromForbidden).toBe(direct);
      expect(p.path).not.toContain(forbidden);
      // The guesses count the shortest trail without the forbidden place.
      const around = distances(trailGraph, p.origin, forbidden).get(p.destination);
      expect(p.steps).toBe(around);
      expect(p.path.length).toBe(p.steps + 1);
      expect(p.guesses).toBe(p.steps + 2);
    }
  });

  it('only pairs 3 to 8 steps apart, both ends among the chosen places', () => {
    const fromPortugal = distances(trailGraph, 'PRT');
    const at = (steps: number) =>
      [...fromPortugal].find(([, distance]) => distance === steps)?.[0] as string;
    expect(findPuzzle(['PRT', at(2)], trailGraph, false, seededRandom())).toBeNull();
    expect(at(9)).toBeDefined();
    expect(findPuzzle(['PRT', at(9)], trailGraph, false, seededRandom())).toBeNull();
    expect(findPuzzle(['PRT', at(3)], trailGraph, false, seededRandom())?.steps).toBe(3);
    expect(findPuzzle(['PRT', at(8)], trailGraph, false, seededRandom())?.steps).toBe(8);
    // The path may cross other continents: Costa Rica to Ecuador goes through Panama and Colombia.
    const p = findPuzzle(['CRI', 'ECU'], trailGraph, false, seededRandom()) as TrailPuzzle;
    expect([p.origin, p.destination].sort()).toEqual(['CRI', 'ECU']);
    expect(p.path).toContain('COL');
  });

  it('no puzzle where there is no land route (Oceania)', () => {
    expect(
      findPuzzle(ids(inContinent(pool, 'oceania')), trailGraph, false, seededRandom()),
    ).toBeNull();
  });

  it('no hard puzzle where no place can be avoided (North America)', () => {
    const northAmerica = ids(inContinent(pool, 'north-america'));
    expect(findPuzzle(northAmerica, trailGraph, false, seededRandom())).not.toBeNull();
    expect(findPuzzle(northAmerica, trailGraph, true, seededRandom())).toBeNull();
    expect(countPuzzles(northAmerica, trailGraph, true, 5)).toBe(0);
  });

  it('hard falls back to normal where it is impossible, and only there', () => {
    const northAmerica = ids(inContinent(pool, 'north-america'));
    expect(playableTrailLevel('hard', northAmerica, trailGraph)).toBe('normal');
    expect(playableTrailLevel('hard', ids(europe), trailGraph)).toBe('hard');
    expect(playableTrailLevel('easy', northAmerica, trailGraph)).toBe('easy');
    expect(trailRecordId(playableTrailLevel('hard', northAmerica, trailGraph))).toBe('trilha');
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
  const make = (guesses: number, forbidden: string | null = null): TrailPuzzle => ({
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

  it('on the hard level every trail avoids the forbidden place', () => {
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
    forbidden: null,
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
    hard = false,
  ) =>
    hasEnoughBorders(
      id,
      ids(inContinent(pool, continent)),
      borderGraph(data, 'world', false, id),
      hard,
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

  it('North America has the Trail, but not its hard level', () => {
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

  it('a save from before the levels resumes as the normal level', () => {
    const p = puzzle('PRT', 'DEU');
    const old = { ...save(p, 'normal', { chosen: undefined, trail: ['PRT', 'ESP'] }) };
    delete old.trailLevel;
    const g = game('hard', { saved: old });
    expect(g.level).toBe('normal');
    expect(g.chosen()).toEqual(['ESP']);
    expect(g.status()).toBe('paused');
  });

  it('a saved game that no longer fits the borders or the level starts over', () => {
    const p = puzzle('PRT', 'DEU', 'FRA');
    const fresh = (g: TrailGame) => g.status() === 'playing' && g.guessesUsed() === 0;
    // Another level than the puzzle (a hard puzzle saved as normal).
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

  it('one record per level; normal and hard keep the keys of the old menu entries', () => {
    expect(trailRecordId('normal')).toBe('trilha');
    expect(trailRecordId('hard')).toBe('trilha-dificil');
    expect(trailRecordId('easy')).toBe('trilha-facil');
  });

  it('a hard Trail saved before the levels resumes as the hard level', () => {
    localStorage.clear();
    const store = new SavedGameStore();
    const old = { ...save(puzzle('PRT', 'DEU', 'FRA'), 'hard'), gameId: 'trilha-dificil' };
    delete old.trailLevel;
    localStorage.setItem('orbis:v1:game:trilha-dificil', JSON.stringify(old));
    expect(store.get('trilha', 'world', null)).toEqual(
      expect.objectContaining({ gameId: 'trilha', trailLevel: 'hard' }),
    );
    store.clear('trilha', 'world', null);
    expect(store.has('trilha', 'world', null)).toBe(false);
  });
});
