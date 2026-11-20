import neighborsJson from '../../../../public/data/neighbors.json';
import { NeighborsData } from '../data/proximity';
import { NEIGHBOR_ROUNDS, NeighborsGame } from './neighbors-game';
import { worldTargets } from './test-targets';

const data = neighborsJson as NeighborsData;
const pool = worldTargets(false);

function game(askable = pool, extra: { random?: () => number; rounds?: number } = {}) {
  return new NeighborsGame({
    pool,
    askable,
    graph: data.world.territoriesOff,
    via: data.world.via,
    tolerance: 1,
    territories: false,
    durationMs: null,
    ...extra,
  });
}

const only = (id: string) => pool.filter((target) => target.id === id);

describe('NeighborsGame', () => {
  it('asks 10 rounds, only about places that have a neighbor', () => {
    const g = game();
    expect(g.subjects.length).toBe(NEIGHBOR_ROUNDS);
    expect(new Set(g.subjects).size).toBe(NEIGHBOR_ROUNDS);
    for (const id of g.subjects) expect(data.world.territoriesOff[id]?.length).toBeGreaterThan(0);
    expect(game(only('JPN')).subjects).toEqual([]);
    expect(game(only('AUS')).subjects).toEqual([]);
  });

  it('the total is every neighbor of every place asked', () => {
    const g = game();
    const expected = g.subjects.reduce((sum, id) => sum + data.world.territoriesOff[id].length, 0);
    expect(g.total).toBe(expected);
  });

  it('typing a neighbor counts, a repeat does not, and a stranger is only explained on Enter', () => {
    const g = game(only('BRA'));
    expect(g.neighbors().length).toBe(10);
    expect(g.submit('argentina', false).kind).toBe('hit');
    expect(g.foundCount()).toBe(1);
    expect(g.submit('argentina', false).kind).toBe('duplicate');
    expect(g.foundCount()).toBe(1);
    // Chile exists but does not border Brazil: silent while typing, explained on Enter.
    expect(g.submit('chile', false).kind).toBe('ignored');
    expect(g.submit('chile', true).kind).toBe('notNeighbor');
    expect(g.submit('brasil', true).kind).toBe('subject');
    expect(g.foundCount()).toBe(1);
  });

  it('a border through a territory is a hit, and the territory is named', () => {
    const g = game(only('BRA'));
    expect(g.submit('frança', true).kind).toBe('hit');
    expect(g.viaTerritories('FRA')).toEqual(['GUF']);
    expect(g.viaTerritories('ARG')).toEqual([]);
  });

  it('giving up the round shows what is missing; the next round waits for it', () => {
    const g = game(only('BRA'));
    g.submit('argentina', false);
    expect(g.roundOver()).toBe(false);
    g.nextRound();
    expect(g.results().length).toBe(0); // not over yet: nothing happens
    g.giveUpRound();
    expect(g.revealed().size).toBe(9);
    expect(g.roundOver()).toBe(true);
    expect(g.submit('bolivia', true).kind).toBe('ignored');
    g.nextRound(); // it was the only round
    expect(g.status()).toBe('finished');
    expect(g.result()).toEqual(
      expect.objectContaining({ found: 1, total: 10, reason: 'complete' }),
    );
    expect(g.results()).toEqual([{ id: 'BRA', found: 1, total: 10 }]);
  });

  it('plays through the rounds: found places count over all rounds', () => {
    const g = game(only('URY').concat(only('PRY')));
    expect(g.subjects.length).toBe(2);
    for (const round of [0, 1]) {
      expect(g.round()).toBe(round);
      for (const neighbor of g.neighbors()) g.submit(neighbor.place.name.pt, true);
      expect(g.roundOver()).toBe(true);
      g.nextRound();
    }
    expect(g.status()).toBe('finished');
    expect(g.result()?.found).toBe(g.total);
    expect(g.foundCount()).toBe(g.total);
  });

  it('giving up the game mid-round keeps the partial round in the results', () => {
    const g = game(only('BRA'));
    g.submit('argentina', false);
    g.giveUp();
    expect(g.result()).toEqual(expect.objectContaining({ found: 1, total: 10, reason: 'gaveup' }));
    expect(g.results()).toEqual([{ id: 'BRA', found: 1, total: 10 }]);
  });

  it('a saved game resumes on the same round with the same progress', () => {
    const first = game(pool.filter((t) => ['BRA', 'URY', 'PRY'].includes(t.id)));
    first.submit(first.neighbors()[0].place.name.pt, true);
    first.giveUpRound();
    first.nextRound();
    first.submit(first.neighbors()[0].place.name.pt, true);

    const again = new NeighborsGame({
      pool,
      askable: pool,
      graph: data.world.territoriesOff,
      via: data.world.via,
      tolerance: 1,
      territories: false,
      durationMs: null,
      saved: first.snapshot(),
    });
    expect(again.subjects).toEqual(first.subjects);
    expect(again.round()).toBe(1);
    expect(again.found()).toEqual(first.found());
    expect(again.foundCount()).toBe(first.foundCount());
    expect(again.status()).toBe('paused');
  });

  it('a place that is not an answer (Greenland) is only a miss, never a hit or an error', () => {
    const g = game(only('DNK'));
    expect(g.submit('groenlândia', true).kind).toBe('miss');
    expect(g.foundCount()).toBe(0);
  });
});
