import brazilTopo from '../../../../public/data/brazil.topo.json';
import statesJson from '../../../../public/data/states.json';
import worldTopo from '../../../../public/data/world.topo.json';
import { feature } from 'topojson-client';
import excludedJson from '../../../../public/data/silhouette-excluded.json';
import { geoArea, geoBounds, geoCentroid, geoContains } from 'd3-geo';
import type { Feature, MultiPolygon } from 'geojson';
import { BrazilState, SilhouetteExclusions } from '../data/geo-data.models';
import { ownShape, silhouettePath, silhouettePieces } from '../data/silhouette';
import { SilhouetteGame, SilhouetteGameConfig } from './silhouette-game';
import { buildBrazilTargets, inContinent } from './targets';
import { countries, territories, worldTargets } from './test-targets';

const excluded = excludedJson as unknown as SilhouetteExclusions;
const pool = worldTargets(false);
const only = (...ids: string[]) => pool.filter((target) => ids.includes(target.id));

function game(askable = only('BRA'), extra: Partial<SilhouetteGameConfig> = {}) {
  return new SilhouetteGame({
    pool,
    targets: askable,
    tolerance: 1,
    territories: false,
    durationMs: null,
    revealAfterErrors: 0,
    learnMode: false,
    ...extra,
  });
}

describe('SilhouetteGame', () => {
  it('asks every place once, and the right name scores', () => {
    const g = game(only('BRA', 'ARG'));
    expect(g.total).toBe(2);
    const first = g.current()?.place.name.pt as string;
    expect(g.submit(first, false)).toEqual(expect.objectContaining({ kind: 'hit' }));
    expect(g.foundCount()).toBe(1);
    expect(g.errors()).toBe(0);
  });

  it('answers in English work too, and a typo only on Enter', () => {
    expect(game().submit('brazil', false).kind).toBe('hit');
    const typo = game();
    expect(typo.submit('brazl', false).kind).toBe('miss');
    expect(typo.submit('brazil ', true).kind).toBe('hit');
    expect(game().submit('brasill', true).kind).toBe('hit');
  });

  it('another real place is an error only on Enter, never while typing', () => {
    const g = game();
    expect(g.submit('argentina', false).kind).toBe('ignored');
    expect(g.errors()).toBe(0);
    expect(g.submit('argentina', true).kind).toBe('wrong');
    expect(g.errors()).toBe(1);
  });

  it('a wrong place outside the chosen continent is an error too', () => {
    const g = game(only('BRA'));
    expect(g.submit('japão', true)).toEqual(expect.objectContaining({ kind: 'wrong' }));
    expect(g.errors()).toBe(1);
  });

  it('text that is not a place, or a place that is not an answer, costs nothing', () => {
    const g = game();
    expect(g.submit('xyzxyz', true).kind).toBe('miss');
    expect(g.submit('groenlândia', true).kind).toBe('miss');
    expect(g.errors()).toBe(0);
  });

  it('reveals the answer after too many errors and moves on', () => {
    const g = game(only('BRA', 'ARG'), { revealAfterErrors: 2 });
    const asked = g.current();
    const wrong = asked?.id === 'BRA' ? 'chile' : 'peru';
    expect(g.submit(wrong, true).kind).toBe('wrong');
    expect(g.submit(wrong, true).kind).toBe('revealed');
    expect(g.revealed().has(asked?.id as string)).toBe(true);
    expect(g.current()?.id).not.toBe(asked?.id);
  });

  it('skipping puts the place at the end; the game ends when all are answered', () => {
    const g = game(only('BRA', 'ARG'));
    const first = g.current()?.id;
    g.skip();
    expect(g.current()?.id).not.toBe(first);
    while (g.current()) g.submit(g.current()?.place.name.pt as string, false);
    expect(g.status()).toBe('finished');
    expect(g.result()).toEqual(expect.objectContaining({ found: 2, total: 2, reason: 'complete' }));
  });

  it('"Guiné" waits for Enter while "Guiné-Bissau" is still a place', () => {
    const g = game(only('GIN'));
    expect(g.submit('guiné', false).kind).toBe('pending');
    expect(g.submit('guiné', true).kind).toBe('hit');
  });

  it('works with the states of Brazil', () => {
    const states = buildBrazilTargets(statesJson as unknown as BrazilState[]);
    const g = new SilhouetteGame({
      layer: 'brazil',
      pool: states,
      targets: states.filter((s) => s.id === 'SP'),
      tolerance: 1,
      territories: false,
      durationMs: null,
      revealAfterErrors: 0,
      learnMode: false,
    });
    expect(g.submit('rio de janeiro', true).kind).toBe('wrong');
    expect(g.submit('são paulo', false).kind).toBe('hit');
  });

  it('a saved game resumes with its progress', () => {
    const first = game(only('BRA', 'ARG', 'CHL'));
    const answered = first.current()?.place.name.pt as string;
    first.submit(answered, false);
    first.submit('japão', true);
    const again = game(only('BRA', 'ARG', 'CHL'), { saved: first.snapshot() });
    expect(again.foundCount()).toBe(1);
    expect(again.errors()).toBe(1);
    expect(again.current()?.id).toBe(first.current()?.id);
    expect(again.status()).toBe('paused');
  });

  it('the continent only limits what is asked', () => {
    const europe = inContinent(pool, 'europe');
    expect(game(europe).total).toBe(europe.length);
  });
});

describe('silhouette outlines', () => {
  const worldFeatures = feature(
    worldTopo as never,
    (worldTopo as never as { objects: { units: never } }).objects.units,
  ) as unknown as { features: Feature[] };
  const byId = (id: string) => ownShape(worldFeatures.features, id) as Feature;

  it('every country has an outline', () => {
    for (const country of countries) {
      expect(silhouettePath(byId(country.id), 200), country.id).toMatch(/^M/);
    }
  });

  it('a country never carries the territories it administers', () => {
    // [west, south, east, north] around the country's own land, loose on purpose.
    const ownLand: Record<string, number[]> = {
      DNK: [7, 54, 16, 58], // no Greenland, no Faroe Islands
      FRA: [-6, 41, 10, 52], // no French Guiana, Réunion, New Caledonia...
      GBR: [-9, 49, 2, 61.5], // no Falklands, Gibraltar, Bermuda, the bases in Cyprus...
      NLD: [3, 50, 8, 54], // no Aruba, Curaçao, Caribbean Netherlands
      USA: [-180, 18, -66, 72], // no Puerto Rico, Guam..., Guantánamo (in Cuba)
    };
    for (const [id, [west, south, east, north]] of Object.entries(ownLand)) {
      const shape = byId(id);
      expect(shape.properties?.['territory'], id).toBeNull();
      const [[w, s], [e, n]] = geoBounds(silhouettePieces(shape.geometry) as MultiPolygon);
      expect(w, id).toBeGreaterThanOrEqual(west);
      expect(s, id).toBeGreaterThanOrEqual(south);
      expect(e, id).toBeLessThanOrEqual(east);
      expect(n, id).toBeLessThanOrEqual(north);
    }
  });

  it('with territories on, each territory has an outline of its own', () => {
    const outline = (id: string) => silhouettePath(byId(id), 200);
    const asked = new Set(worldTargets(true).map((target) => target.id));
    for (const territory of territories) {
      expect(asked.has(territory.id), territory.id).toBe(true);
      expect(outline(territory.id), territory.id).toMatch(/^M/);
    }
    for (const [territory, country] of [
      ['GRL', 'DNK'],
      ['GUF', 'FRA'],
      ['FLK', 'GBR'],
      ['ABW', 'NLD'],
    ]) {
      expect(outline(territory)).not.toBe(outline(country));
      expect(geoContains(byId(country), geoCentroid(byId(territory)))).toBe(false);
    }
  });

  it('every state of Brazil has an outline', () => {
    const states = feature(
      brazilTopo as never,
      (brazilTopo as never as { objects: { states: never } }).objects.states,
    ) as unknown as { features: Feature[] };
    expect(states.features.length).toBe(27);
    for (const state of states.features) expect(silhouettePath(state, 200)).toMatch(/^M/);
  });

  it('far islands are left out, sizeable ones stay', () => {
    const pieces = (id: string) => silhouettePieces(byId(id).geometry)?.coordinates.length ?? 0;
    const all = (id: string) =>
      (byId(id).geometry as { coordinates: unknown[] }).coordinates.length;
    expect(pieces('USA')).toBeLessThan(all('USA')); // Hawaii and the small islands
    expect(pieces('JPN')).toBeGreaterThanOrEqual(4); // the four main islands
    expect(pieces('BRA')).toBeGreaterThanOrEqual(1);
  });

  it('places with a degenerate outline are listed, and only those', () => {
    const { minAreaKm2, minPoints, world, brazil } = excluded;
    const degenerate = (feature: Feature) => {
      const pieces = silhouettePieces(feature.geometry) as MultiPolygon;
      const points = pieces.coordinates.reduce(
        (sum, polygon) =>
          sum + polygon.reduce((n, ring) => n + new Set(ring.map((p) => p.join(','))).size, 0),
        0,
      );
      return points < minPoints || geoArea(pieces) * 6371.0088 ** 2 < minAreaKm2;
    };
    const listed = new Set(world.map((place) => place.id));
    expect(listed.has('VAT')).toBe(true);
    for (const shape of worldFeatures.features) {
      expect(listed.has(shape.properties?.['id']), shape.properties?.['id']).toBe(
        degenerate(shape),
      );
    }
    expect(brazil).toEqual([]);

    // The game asks only the places with a real outline: the total reflects the exclusions.
    const askable = pool.filter((target) => !listed.has(target.id));
    expect(askable.length).toBeLessThan(pool.length);
    expect(game(askable).total).toBe(askable.length);
  });

  it('the outline fits inside its box', () => {
    for (const id of ['RUS', 'FJI', 'CHL', 'VAT', 'USA']) {
      const numbers = (silhouettePath(byId(id), 200).match(/-?\d+\.?\d*/g) ?? []).map(Number);
      expect(Math.min(...numbers), id).toBeGreaterThanOrEqual(-0.5);
      expect(Math.max(...numbers), id).toBeLessThanOrEqual(200.5);
    }
  });
});
