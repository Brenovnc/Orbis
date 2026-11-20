import brazilProximityJson from '../../../../public/data/proximity-brazil.json';
import worldTerritoriesJson from '../../../../public/data/proximity-world-territories.json';
import worldProximityJson from '../../../../public/data/proximity-world.json';
import statesJson from '../../../../public/data/states.json';
import { BrazilState } from '../data/geo-data.models';
import { ProximityData, distanceKm } from '../data/proximity';
import { ProximityGame, ProximityGameConfig, heatLevel } from './proximity-game';
import { buildBrazilTargets, inContinent } from './targets';
import { seededRandom, worldTargets } from './test-targets';

const world = worldProximityJson as ProximityData;
const pool = worldTargets(false);
const only = (id: string) => pool.filter((target) => target.id === id);
const nameOf = (id: string) => pool.find((t) => t.id === id)?.place.name.pt as string;

/** A game whose secret is Brazil. */
function game(extra: Partial<ProximityGameConfig> = {}) {
  return new ProximityGame({
    pool,
    askable: only('BRA'),
    data: world,
    tolerance: 1,
    territories: false,
    random: seededRandom(),
    ...extra,
  });
}

describe('heat levels', () => {
  it('neighbours are the hottest, far places the coldest, Brazil on a tighter scale', () => {
    expect(heatLevel(0, 'world')).toBe(0);
    expect(heatLevel(1, 'world')).toBe(1);
    expect(heatLevel(500, 'world')).toBe(1);
    expect(heatLevel(501, 'world')).toBe(2);
    expect(heatLevel(7000, 'world')).toBe(4);
    expect(heatLevel(15_000, 'world')).toBe(5);
    expect(heatLevel(300, 'brazil')).toBe(2);
    expect(heatLevel(2500, 'brazil')).toBe(5);
  });
});

describe('ProximityGame', () => {
  it('the secret comes from the chosen places', () => {
    const europe = inContinent(pool, 'europe');
    for (const random of [0, 0.5, 0.99]) {
      const g = game({ askable: europe, random: () => random });
      expect(europe).toContain(g.secret);
    }
    expect(game().targets.map((t) => t.id)).toEqual(['BRA']);
  });

  it('each guess tells the distance, the direction and the heat', () => {
    const g = game();
    const argentina = g.submit('argentina');
    expect(argentina).toEqual(
      expect.objectContaining({ kind: 'guess', closest: true, won: false }),
    );
    if (argentina.kind !== 'guess') return;
    expect(argentina.guess.km).toBe(0);
    expect(argentina.guess.heat).toBe(0);
    // Brazil is north-east of Argentina.
    expect(argentina.guess.sector).toBeGreaterThanOrEqual(0);
    expect(argentina.guess.sector).toBeLessThanOrEqual(4);

    const japan = g.submit('japão');
    if (japan.kind !== 'guess') throw new Error('expected a guess');
    expect(japan.guess.km).toBe(distanceKm(world, 'JPN', 'BRA'));
    expect(japan.guess.heat).toBe(5);
    expect(japan.closest).toBe(false);
  });

  it('the list goes from nearest to farthest', () => {
    const g = game();
    for (const name of ['japão', 'portugal', 'argentina', 'chile']) g.submit(name);
    expect(g.ranked().map((guess) => guess.target.id)).toEqual(['ARG', 'CHL', 'PRT', 'JPN']);
    expect(g.guessed()).toEqual(['JPN', 'PRT', 'ARG', 'CHL']);
  });

  it('a repeat or text that is no place costs nothing', () => {
    const g = game();
    g.submit('chile');
    expect(g.submit('chile').kind).toBe('repeat');
    expect(g.submit('xyzxyz').kind).toBe('miss');
    expect(g.guessed().length).toBe(1);
  });

  it('guessing the secret wins; the score is the number of guesses', () => {
    const g = game();
    g.submit('chile');
    g.submit('peru');
    expect(g.submit('brasil')).toEqual(expect.objectContaining({ kind: 'guess', won: true }));
    expect(g.status()).toBe('finished');
    expect(g.found()).toEqual(new Set(['BRA']));
    expect(g.ranked()[0].target.id).toBe('BRA');
    expect(g.result()).toEqual(
      expect.objectContaining({ found: 1, total: 1, reason: 'complete', guesses: 3 }),
    );
    expect(g.submit('argentina').kind).toBe('ignored');
  });

  it('giving up ends the game without finding the secret', () => {
    const g = game();
    g.submit('chile');
    g.giveUp();
    expect(g.found().size).toBe(0);
    expect(g.result()).toEqual(expect.objectContaining({ found: 0, reason: 'gaveup', guesses: 1 }));
  });

  it('a saved game resumes with the same secret and guesses', () => {
    const first = game({ askable: pool });
    first.submit('chile');
    first.submit('japão');
    const again = game({ askable: pool, saved: first.snapshot() });
    expect(again.secret).toBe(first.secret);
    expect(again.guessed()).toEqual(first.guessed());
    expect(again.status()).toBe('paused');
  });

  it('a saved game that no longer fits the data starts over', () => {
    const first = game();
    first.submit('chile');
    const saved = first.snapshot();
    const fresh = (g: ProximityGame) => g.status() === 'playing' && g.guessed().length === 0;
    expect(fresh(game({ saved: { ...saved, secret: 'XXX' } }))).toBe(true);
    expect(fresh(game({ saved: { ...saved, guessed: ['XXX'] } }))).toBe(true);
    expect(game({ saved }).status()).toBe('paused');
  });

  it('with territories on, territories can be guessed and France is only France', () => {
    const territories = worldTargets(true);
    const g = game({
      pool: territories,
      askable: territories.filter((t) => t.id === 'BRA'),
      data: worldTerritoriesJson as ProximityData,
      territories: true,
    });
    const guiana = g.submit('guiana francesa');
    const france = g.submit('frança');
    if (guiana.kind !== 'guess' || france.kind !== 'guess') throw new Error('expected guesses');
    expect(guiana.guess.km).toBe(0);
    expect(france.guess.km).toBeGreaterThan(5000);
  });

  it('on the Brazil map the secret is a state', () => {
    const states = buildBrazilTargets(statesJson as unknown as BrazilState[]);
    const g = new ProximityGame({
      layer: 'brazil',
      pool: states,
      askable: states.filter((s) => s.id === 'SP'),
      data: brazilProximityJson as ProximityData,
      tolerance: 1,
      territories: false,
      random: seededRandom(),
    });
    const minas = g.submit('minas gerais');
    if (minas.kind !== 'guess') throw new Error('expected a guess');
    expect(minas.guess.km).toBe(0);
    expect(g.submit('são paulo')).toEqual(expect.objectContaining({ won: true }));
  });

  it('no data, no secret', () => {
    const g = game({ data: { ids: [], km: [], dir: [] } });
    expect(g.secret).toBeNull();
    expect(g.submit(nameOf('BRA')).kind).toBe('ignored');
  });

  it('a place that is not an answer (Greenland) is no guess and no error', () => {
    const g = game();
    expect(g.submit('groenlândia').kind).toBe('miss');
    expect(g.submit('antártida').kind).toBe('miss');
    expect(g.guessed().length).toBe(0);
  });
});
