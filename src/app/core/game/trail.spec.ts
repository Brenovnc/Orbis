import neighborsJson from '../../../../public/data/neighbors.json';
import statesJson from '../../../../public/data/states.json';
import { BrazilState } from '../data/geo-data.models';
import { NeighborsData } from '../data/proximity';
import { ChallengeId } from '../games';
import { borderGraph, hasEnoughBorders } from './availability';
import { buildBrazilTargets, inContinent } from './targets';
import { worldTargets } from './test-targets';
import { TrailGame, TrailGameConfig } from './trail-game';
import { TrailPuzzle, countPuzzles, distances, findPuzzle, shortestPath } from './trail-graph';

const data = neighborsJson as NeighborsData;
const pool = worldTargets(false);
const europe = inContinent(pool, 'europe');
const trailGraph = data.world.trail;
const ids = (targets: { id: string }[]) => targets.map((t) => t.id);
const nameOf = (id: string) => pool.find((t) => t.id === id)?.place.name.pt as string;

function game(gameId: 'trilha' | 'trilha-dificil', extra: Partial<TrailGameConfig> = {}) {
  return new TrailGame({
    gameId,
    pool,
    askable: europe,
    graph: trailGraph,
    via: data.world.via,
    tolerance: 1,
    territories: false,
    ...extra,
  });
}

/** A place that does not border the origin of the game (so it is a wrong step). */
function stranger(g: TrailGame): string {
  const origin = (g.puzzle as TrailPuzzle).origin;
  return Object.keys(trailGraph).find(
    (id) => id !== origin && !trailGraph[origin].includes(id),
  ) as string;
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
      const puzzle = findPuzzle(ids(europe), trailGraph, false) as TrailPuzzle;
      expect(puzzle.steps).toBeGreaterThanOrEqual(3);
      expect(puzzle.steps).toBeLessThanOrEqual(8);
      expect(puzzle.path.length).toBe(puzzle.steps + 1);
      expect(puzzle.guesses).toBe(puzzle.steps + 4);
      expect(puzzle.forbidden).toBeNull();
      puzzle.path.slice(1).forEach((id, n) => expect(trailGraph[puzzle.path[n]]).toContain(id));
    }
  });

  it('a hard puzzle forbids a place that can be avoided, with 2 spare guesses', () => {
    for (let i = 0; i < 20; i++) {
      const puzzle = findPuzzle(ids(europe), trailGraph, true) as TrailPuzzle;
      const forbidden = puzzle.forbidden as string;
      const fromOrigin = distances(trailGraph, puzzle.origin);
      const direct = fromOrigin.get(puzzle.destination) as number;
      const fromForbidden = distances(trailGraph, forbidden).get(puzzle.destination) as number;
      expect(direct).toBeGreaterThanOrEqual(3);
      expect(direct).toBeLessThanOrEqual(8);
      expect([puzzle.origin, puzzle.destination]).not.toContain(forbidden);
      // It lies on a shortest trail, and the trail shown goes around it.
      expect((fromOrigin.get(forbidden) as number) + fromForbidden).toBe(direct);
      expect(puzzle.path).not.toContain(forbidden);
      // The guesses count the shortest trail without the forbidden place.
      const around = distances(trailGraph, puzzle.origin, forbidden).get(puzzle.destination);
      expect(puzzle.steps).toBe(around);
      expect(puzzle.path.length).toBe(puzzle.steps + 1);
      expect(puzzle.guesses).toBe(puzzle.steps + 2);
    }
  });

  it('only pairs 3 to 8 steps apart, both ends among the chosen places', () => {
    const fromPortugal = distances(trailGraph, 'PRT');
    const at = (steps: number) =>
      [...fromPortugal].find(([, distance]) => distance === steps)?.[0] as string;
    expect(findPuzzle(['PRT', at(2)], trailGraph, false)).toBeNull();
    expect(at(9)).toBeDefined();
    expect(findPuzzle(['PRT', at(9)], trailGraph, false)).toBeNull();
    expect(findPuzzle(['PRT', at(3)], trailGraph, false)?.steps).toBe(3);
    expect(findPuzzle(['PRT', at(8)], trailGraph, false)?.steps).toBe(8);
    // The path may cross other continents: Costa Rica to Ecuador goes through Panama and Colombia.
    const puzzle = findPuzzle(['CRI', 'ECU'], trailGraph, false) as TrailPuzzle;
    expect([puzzle.origin, puzzle.destination].sort()).toEqual(['CRI', 'ECU']);
    expect(puzzle.path).toContain('COL');
  });

  it('no puzzle where there is no land route (Oceania)', () => {
    expect(findPuzzle(ids(inContinent(pool, 'oceania')), trailGraph, false)).toBeNull();
  });

  it('no hard puzzle where no place can be avoided (North America)', () => {
    const northAmerica = ids(inContinent(pool, 'north-america'));
    expect(findPuzzle(northAmerica, trailGraph, false)).not.toBeNull();
    expect(findPuzzle(northAmerica, trailGraph, true)).toBeNull();
    expect(countPuzzles(northAmerica, trailGraph, true, 5)).toBe(0);
  });
});

describe('where the border games are available', () => {
  const available = (id: ChallengeId, continent: Parameters<typeof inContinent>[1]) =>
    hasEnoughBorders(id, ids(inContinent(pool, continent)), borderGraph(data, 'world', false, id));

  it('Oceania has too few borders for Neighbors and the Trail', () => {
    for (const id of ['vizinhos', 'trilha', 'trilha-dificil'] as const) {
      expect(available(id, 'oceania')).toBe(false);
    }
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
      expect(available('trilha-dificil', continent)).toBe(true);
    }
  });

  it('North America has the Trail, but not the hard one', () => {
    expect(available('trilha', 'north-america')).toBe(true);
    expect(available('trilha-dificil', 'north-america')).toBe(false);
  });

  it('each game takes its own graph', () => {
    expect(borderGraph(data, 'world', false, 'vizinhos')).toBe(data.world.territoriesOff);
    expect(borderGraph(data, 'world', false, 'trilha')).toBe(data.world.trail);
    expect(borderGraph(data, 'world', true, 'vizinhos')).toBe(data.world.territoriesOn);
    expect(borderGraph(data, 'world', true, 'trilha-dificil')).toBe(data.world.trailTerritories);
    expect(borderGraph(data, 'brazil', false, 'trilha')).toBe(data.brazil);
  });

  it('Brazil has enough states for everything', () => {
    const states = Object.keys(data.brazil);
    for (const id of ['vizinhos', 'trilha', 'trilha-dificil'] as const) {
      expect(hasEnoughBorders(id, states, borderGraph(data, 'brazil', false, id))).toBe(true);
    }
  });
});

describe('TrailGame', () => {
  it('following the shortest path wins, using exactly the steps as guesses', () => {
    const g = game('trilha');
    const puzzle = g.puzzle as TrailPuzzle;
    expect(g.trail()).toEqual([puzzle.origin]);
    for (const id of puzzle.path.slice(1)) g.submit(nameOf(id));
    expect(g.status()).toBe('finished');
    expect(g.result()).toEqual(
      expect.objectContaining({ found: 1, reason: 'complete', guesses: puzzle.steps }),
    );
  });

  it('a place that does not border the last one costs a guess and stays off the trail', () => {
    const g = game('trilha');
    expect(g.submit(nameOf(stranger(g))).kind).toBe('notBorder');
    expect(g.guessesUsed()).toBe(1);
    expect(g.trail()).toEqual([(g.puzzle as TrailPuzzle).origin]);
  });

  it('a place already on the trail is free, and so is something that is not a place', () => {
    const g = game('trilha');
    expect(g.submit(nameOf((g.puzzle as TrailPuzzle).origin)).kind).toBe('inTrail');
    expect(g.submit('xyzxyz').kind).toBe('miss');
    expect(g.guessesUsed()).toBe(0);
  });

  it('a place with no land neighbours (Japan) costs a guess too', () => {
    const g = game('trilha');
    expect(g.submit(nameOf('JPN'))).toEqual(expect.objectContaining({ kind: 'notBorder' }));
    expect(g.guessesUsed()).toBe(1);
  });

  it('undo takes the step back but not the guess', () => {
    const g = game('trilha');
    expect(g.undo()).toBe(false);
    g.submit(nameOf((g.puzzle as TrailPuzzle).path[1]));
    expect(g.trail().length).toBe(2);
    expect(g.undo()).toBe(true);
    expect(g.trail().length).toBe(1);
    expect(g.guessesUsed()).toBe(1);
    // The origin always stays, and a place taken off the trail costs again.
    expect(g.undo()).toBe(false);
    expect(g.trail()).toEqual([(g.puzzle as TrailPuzzle).origin]);
    expect(g.submit(nameOf((g.puzzle as TrailPuzzle).path[1])).kind).toBe('step');
    expect(g.guessesUsed()).toBe(2);
  });

  it('winning with the last guess is a win, and nothing counts after the end', () => {
    const g = game('trilha-dificil');
    const puzzle = g.puzzle as TrailPuzzle;
    g.submit(nameOf(stranger(g)));
    g.submit(nameOf(puzzle.forbidden as string));
    for (const id of puzzle.path.slice(1)) g.submit(nameOf(id));
    expect(g.guessesLeft()).toBe(0);
    expect(g.result()).toEqual(
      expect.objectContaining({ found: 1, reason: 'complete', guesses: puzzle.guesses }),
    );
    expect(g.submit(nameOf(stranger(g))).kind).toBe('ignored');
    expect(g.undo()).toBe(false);
  });

  it('running out of guesses ends the game', () => {
    const g = game('trilha');
    const far = nameOf(stranger(g));
    for (let i = 0; i < g.total; i++) g.submit(far);
    expect(g.status()).toBe('finished');
    expect(g.result()).toEqual(
      expect.objectContaining({ found: 0, reason: 'guesses', guesses: g.total }),
    );
  });

  it('typing the forbidden place costs a guess and does not enter the trail', () => {
    const g = game('trilha-dificil');
    const puzzle = g.puzzle as TrailPuzzle;
    expect(g.submit(nameOf(puzzle.forbidden as string)).kind).toBe('forbidden');
    expect(g.guessesUsed()).toBe(1);
    expect(g.trail()).toEqual([puzzle.origin]);
  });

  it('a saved game resumes with the same puzzle, trail and guesses', () => {
    const first = game('trilha');
    first.submit(nameOf((first.puzzle as TrailPuzzle).path[1]));
    first.submit(nameOf(stranger(first)));
    const again = new TrailGame({
      gameId: 'trilha',
      pool,
      askable: europe,
      graph: trailGraph,
      via: data.world.via,
      tolerance: 1,
      territories: false,
      saved: first.snapshot(),
    });
    expect(again.puzzle).toEqual(first.puzzle);
    expect(again.trail()).toEqual(first.trail());
    expect(again.guessesUsed()).toBe(2);
    expect(again.status()).toBe('paused');
  });

  it('a saved game that no longer fits the borders or the level starts over', () => {
    const first = game('trilha-dificil');
    const puzzle = first.puzzle as TrailPuzzle;
    first.submit(nameOf(puzzle.path[1]));
    const saved = first.snapshot();
    const fresh = (g: TrailGame) => g.status() === 'playing' && g.guessesUsed() === 0;
    // Another level.
    expect(fresh(game('trilha', { saved }))).toBe(true);
    // A trail that skips a border.
    const broken = { ...saved, trail: [puzzle.origin, puzzle.destination] };
    expect(fresh(game('trilha-dificil', { saved: broken }))).toBe(true);
    // No guesses left.
    expect(fresh(game('trilha-dificil', { saved: { ...saved, guesses: puzzle.guesses } }))).toBe(
      true,
    );
    expect(game('trilha-dificil', { saved }).status()).toBe('paused');
  });

  it('on the Brazil map the trail uses the states', () => {
    const states = buildBrazilTargets(statesJson as unknown as BrazilState[]);
    const g = game('trilha', {
      layer: 'brazil',
      pool: states,
      askable: states,
      graph: data.brazil,
      via: {},
    });
    const puzzle = g.puzzle as TrailPuzzle;
    expect(puzzle.steps).toBeGreaterThanOrEqual(3);
    const name = (id: string) => states.find((s) => s.id === id)?.place.name.pt as string;
    for (const id of puzzle.path.slice(1)) g.submit(name(id));
    expect(g.result()).toEqual(expect.objectContaining({ reason: 'complete' }));
  });

  it('a place that is not an answer (Greenland, Kosovo) costs no guess', () => {
    const g = game('trilha');
    expect(g.submit('groenlândia').kind).toBe('miss');
    expect(g.submit('kosovo').kind).toBe('miss');
    expect(g.guessesUsed()).toBe(0);
  });
});
