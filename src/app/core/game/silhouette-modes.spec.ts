import neighborsJson from '../../../../public/data/neighbors.json';
import proximityBrazilJson from '../../../../public/data/proximity-brazil.json';
import proximityTerritoriesJson from '../../../../public/data/proximity-world-territories.json';
import proximityWorldJson from '../../../../public/data/proximity-world.json';
import statesJson from '../../../../public/data/states.json';
import { BrazilState } from '../data/geo-data.models';
import { NeighborsData, ProximityData, distanceKm, nearestIds } from '../data/proximity';
import { borderGraph } from './availability';
import { PRESETS } from '../settings.service';
import { RecordEntry, isBetter, recordKey, recordLevel } from './records.service';
import { CHOICES, pickChoices } from './silhouette-choices';
import { SilhouetteGame, SilhouetteGameConfig } from './silhouette-game';
import { lettersHint, neighborsHint } from './silhouette-hints';
import { Target, buildBrazilTargets, inContinent } from './targets';
import { seededRandom, worldTargets } from './test-targets';

const neighbors = neighborsJson as NeighborsData;
const distances = proximityWorldJson as ProximityData;
const distancesBrazil = proximityBrazilJson as ProximityData;
const pool = worldTargets(false);
const states = buildBrazilTargets(statesJson as unknown as BrazilState[]);
const byId = (targets: Target[], id: string) => targets.find((t) => t.id === id) as Target;

function game(extra: Partial<SilhouetteGameConfig> = {}) {
  return new SilhouetteGame({
    mode: 'choices',
    pool,
    targets: inContinent(pool, 'south-america'),
    distances,
    tolerance: 1,
    territories: false,
    durationMs: null,
    revealAfterErrors: 3,
    learnMode: false,
    random: seededRandom(),
    ...extra,
  });
}

describe('Silhouettes choices', () => {
  it('gives 4 different options, the answer once, all of the same continent', () => {
    const random = seededRandom();
    for (const answer of pool) {
      const options = pickChoices(answer, pool, distances, random);
      expect(options.length, answer.id).toBe(CHOICES);
      expect(new Set(options).size, answer.id).toBe(CHOICES);
      expect(options.filter((id) => id === answer.id).length, answer.id).toBe(1);
      for (const id of options) expect(byId(pool, id).group, answer.id).toBe(answer.group);
    }
  });

  it('is the same draw with the same seed, and shuffles the answer around', () => {
    const answer = byId(pool, 'BRA');
    const draw = (seed: number) => pickChoices(answer, pool, distances, seededRandom(seed));
    expect(draw(7)).toEqual(draw(7));
    const places = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((seed) => draw(seed).indexOf('BRA'));
    expect(new Set(places).size).toBeGreaterThan(1);
  });

  it('prefers places of similar size', () => {
    // Of the 46 other Asian countries, the options for Maldives are among the smallest.
    const sizes = inContinent(pool, 'asia')
      .map((t) => t.place.areaKm2)
      .sort((a, b) => a - b);
    for (const id of pickChoices(byId(pool, 'MDV'), pool, distances, seededRandom())) {
      expect(byId(pool, id).place.areaKm2).toBeLessThanOrEqual(sizes[9]);
    }
  });

  it('in Brazil stays in the region, and completes a small one with the nearest states', () => {
    for (const answer of states) {
      const options = pickChoices(answer, states, distancesBrazil, seededRandom());
      expect(new Set(options).size, answer.id).toBe(CHOICES);
      const outside = options.filter((id) => byId(states, id).group !== answer.group);
      const region = states.filter((t) => t.group === answer.group).length;
      expect(outside.length, answer.id).toBe(Math.max(0, CHOICES - region));
      const others = states.filter((t) => t.group !== answer.group).map((t) => t.id);
      const nearest = nearestIds(distancesBrazil, answer.id).filter((id) => others.includes(id));
      for (const id of outside) expect(id).toBe(nearest[outside.indexOf(id)]);
    }
  });

  it('completes Antarctica (territories on) with the nearest places', () => {
    const all = worldTargets(true);
    const data = proximityTerritoriesJson as ProximityData;
    const onlyOne = all.filter((t) => t.group !== 'antarctica' || t.id === 'ATA');
    const options = pickChoices(byId(all, 'ATA'), onlyOne, data, seededRandom());
    expect(new Set(options)).toEqual(
      new Set([
        'ATA',
        ...nearestIds(data, 'ATA')
          .filter((id) => onlyOne.some((t) => t.id === id))
          .slice(0, 3),
      ]),
    );
  });

  it('the right option scores; a wrong one is an error and closes', () => {
    const g = game();
    const asked = g.current()?.id as string;
    const [wrong] = (g.choices()?.options ?? []).filter((id) => id !== asked);
    expect(g.choose(wrong).kind).toBe('wrong');
    expect(g.errors()).toBe(1);
    expect(g.choices()?.wrong).toEqual([wrong]);
    expect(g.choose(wrong).kind).toBe('ignored');
    expect(g.errors()).toBe(1);
    expect(g.choose(asked).kind).toBe('hit');
    expect(g.foundCount()).toBe(1);
    expect(g.choices()?.options).toContain(g.current()?.id);
  });

  it('a wrong option is an error even when that place was already answered', () => {
    const g = game({ targets: pool.filter((t) => ['BRA', 'ARG'].includes(t.id)) });
    const first = g.current()?.id as string;
    g.choose(first);
    const second = g.current()?.id as string;
    const again = game({
      targets: pool.filter((t) => ['BRA', 'ARG'].includes(t.id)),
      saved: {
        ...g.snapshot(),
        choices: { [second]: { options: [first, second, 'CHL', 'PER'], wrong: [] } },
      },
    });
    again.resume();
    expect(again.choose(first).kind).toBe('wrong');
  });

  it('shows the answer when the attempts run out, like the click games', () => {
    const g = game({ revealAfterErrors: 2 });
    const asked = g.current()?.id as string;
    const wrong = (g.choices()?.options ?? []).filter((id) => id !== asked);
    expect(g.choose(wrong[0]).kind).toBe('wrong');
    expect(g.choose(wrong[1]).kind).toBe('revealed');
    expect(g.revealed().has(asked)).toBe(true);
    expect(g.current()?.id).not.toBe(asked);
  });

  it('neither skipping nor reloading draws the options of a question again', () => {
    const g = game({ targets: pool.filter((t) => ['BRA', 'ARG'].includes(t.id)) });
    const asked = g.current()?.id as string;
    const wrong = (g.choices()?.options ?? []).find((id) => id !== asked) as string;
    g.choose(wrong);
    const before = g.choices();
    g.skip();
    g.skip();
    expect(g.current()?.id).toBe(asked);
    expect(g.choices()).toEqual(before);
    const again = game({
      targets: pool.filter((t) => ['BRA', 'ARG'].includes(t.id)),
      saved: g.snapshot(),
      random: seededRandom(99),
    });
    expect(again.choices()).toEqual(before);
  });
});

describe('Silhouettes hints', () => {
  const hintGame = (extra: Partial<SilhouetteGameConfig> = {}) => game({ mode: 'hints', ...extra });

  it('come one at a time, in order, and then run out', () => {
    const g = hintGame();
    expect(g.hints()).toEqual([]);
    expect([g.useHint(), g.useHint(), g.useHint()]).toEqual([
      'surroundings',
      'neighbors',
      'letters',
    ]);
    expect(g.useHint()).toBeNull();
    expect(g.hintedQuestions()).toBe(1);
  });

  it('count questions, not hints, and belong to their question', () => {
    const g = hintGame();
    const first = g.current()?.id as string;
    g.useHint();
    g.useHint();
    g.skip();
    expect(g.hints()).toEqual([]);
    g.useHint();
    expect(g.hintedQuestions()).toBe(2);
    const again = hintGame({ saved: g.snapshot() });
    expect(again.hintedQuestions()).toBe(2);
    while (again.current()?.id !== first) {
      again.resume();
      again.skip();
    }
    expect(again.hints()).toEqual(['surroundings', 'neighbors']);
    again.giveUp();
    expect(again.result()?.hintedQuestions).toBe(2);
  });

  it('are progress worth saving', () => {
    const g = hintGame();
    expect(g.hasProgress()).toBe(false);
    g.useHint();
    expect(g.hasProgress()).toBe(true);
  });

  it('do not exist in the other modes', () => {
    for (const mode of ['choices', 'typing'] as const) {
      const g = game({ mode });
      expect(g.useHint()).toBeNull();
      g.giveUp();
      expect(g.result()?.hintedQuestions).toBeUndefined();
    }
  });

  it('neighbors: the land borders, following the territories rule', () => {
    const off = borderGraph(neighbors, 'world', false, 'silhuetas');
    const on = borderGraph(neighbors, 'world', true, 'silhuetas');
    const brazil = borderGraph(neighbors, 'brazil', false, 'silhuetas');
    expect(neighborsHint('PRT', off, distances)).toEqual({ kind: 'borders', ids: ['ESP'] });
    expect(neighborsHint('BRA', off, distances).ids).toContain('FRA');
    expect(neighborsHint('BRA', on, distances).ids).toContain('GUF');
    expect(neighborsHint('BRA', on, distances).ids).not.toContain('FRA');
    expect(neighborsHint('SP', brazil, distancesBrazil).ids).toEqual(neighbors.brazil['SP']);
  });

  it('neighbors: without a land border, the 2 nearest places', () => {
    const graph = borderGraph(neighbors, 'world', false, 'silhuetas');
    for (const { id } of pool.filter((t) => !graph[t.id]?.length)) {
      const hint = neighborsHint(id, graph, distances);
      expect(hint.kind, id).toBe('nearest');
      expect(hint.ids.length, id).toBe(2);
      const farthest = distanceKm(distances, id, hint.ids[1]);
      const closer = distances.ids.filter(
        (other) => other !== id && distanceKm(distances, id, other) < farthest,
      );
      expect(closer.length, id).toBeLessThanOrEqual(1);
    }
  });

  it('letters: the first letter and how many, as the name is written', () => {
    expect(lettersHint('Paraguai')).toEqual({ letter: 'P', n: 8 });
    expect(lettersHint('Guiné-Bissau')).toEqual({ letter: 'G', n: 11 });
    expect(lettersHint('África do Sul')).toEqual({ letter: 'Á', n: 11 });
    expect(lettersHint('South Africa')).toEqual({ letter: 'S', n: 11 });
  });
});

describe('Silhouettes records', () => {
  const entry = (
    found: number,
    hintedQuestions: number,
    errors: number,
    elapsedMs = 60_000,
  ): RecordEntry => ({
    found,
    total: 185,
    elapsedMs,
    errors,
    hintedQuestions,
    date: '2026-11-23',
  });

  it('more right answers win, then fewer questions with a hint, then errors and time', () => {
    expect(isBetter(entry(50, 40, 9), entry(49, 0, 0))).toBe(true);
    expect(isBetter(entry(50, 2, 9, 900_000), entry(50, 3, 0, 1))).toBe(true);
    expect(isBetter(entry(50, 3, 0, 1), entry(50, 2, 9, 900_000))).toBe(false);
    expect(isBetter(entry(50, 2, 1), entry(50, 2, 4))).toBe(true);
    expect(isBetter(entry(50, 2, 1, 1), entry(50, 2, 1, 2))).toBe(true);
  });

  it('custom games of different modes do not share a record', () => {
    const base = { gameId: 'silhuetas', layer: 'world', territories: false, durationMs: null };
    const key = (silhouetteMode: 'choices' | 'hints' | 'typing') =>
      recordKey({
        ...base,
        ...recordLevel('silhuetas', 'world', { ...PRESETS.easy, showNames: false, silhouetteMode }),
      });
    expect(new Set([key('choices'), key('hints'), key('typing')]).size).toBe(3);
  });
});
