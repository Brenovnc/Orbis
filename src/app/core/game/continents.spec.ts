import { CONTINENT_CHOICES, CONTINENT_FRAMES } from '../data/continent-frames';
import { SavedGameStore } from './saved-game.store';
import { recordKey } from './records.service';
import { continentMinutes, inContinent } from './targets';
import { countries, worldTargets } from './test-targets';

describe('continents', () => {
  it('the six choices cover every country, and none is left out', () => {
    const covered = CONTINENT_CHOICES.flatMap((c) => inContinent(worldTargets(false), c));
    expect(covered.length).toBe(countries.length);
    expect(inContinent(worldTargets(false), null).length).toBe(countries.length);
  });

  it('keeps territories in their own continent only when they are targets', () => {
    const off = inContinent(worldTargets(false), 'south-america').map((t) => t.id);
    const on = inContinent(worldTargets(true), 'south-america').map((t) => t.id);
    expect(off).not.toContain('FLK');
    expect(on).toContain('FLK');
    expect(on.length).toBeGreaterThan(off.length);
  });

  it('every country has its label point inside the window of its continent', () => {
    const misplaced: string[] = [];
    for (const country of countries) {
      if (country.continent === 'antarctica') continue;
      const [west, south, east, north] = CONTINENT_FRAMES[country.continent];
      const [lon, lat] = country.labelPoint;
      // Longitude counted eastwards from the west edge, so windows past 180° work too.
      const fromWest = (((lon - west) % 360) + 360) % 360;
      const inside = fromWest <= east - west && lat >= south && lat <= north;
      if (!inside) misplaced.push(country.id);
    }
    expect(misplaced).toEqual([]);
  });
});

describe('records and saved games by continent', () => {
  const base = {
    gameId: 'clicar-nome',
    layer: 'world',
    territories: false,
    durationMs: null,
    level: 'normal' as const,
  };

  it('keeps a separate record for the whole world and for each continent', () => {
    expect(recordKey({ ...base, continent: null })).toBe(recordKey(base));
    expect(recordKey({ ...base, continent: null })).not.toBe(
      recordKey({ ...base, continent: 'asia' }),
    );
    expect(recordKey({ ...base, continent: 'europe' })).not.toBe(recordKey(base));
    expect(recordKey({ ...base, continent: 'europe' })).not.toBe(
      recordKey({ ...base, continent: 'asia' }),
    );
  });

  it('saves one game per continent', () => {
    localStorage.clear();
    const store = new SavedGameStore();
    const game = {
      v: 1 as const,
      gameId: 'digitar-paises' as const,
      layer: 'world' as const,
      territories: false,
      found: ['FRA'],
      elapsedMs: 1000,
      durationMs: null,
    };
    store.save(game, 'europe');
    expect(store.has('digitar-paises', 'world', 'europe')).toBe(true);
    expect(store.has('digitar-paises', 'world', null)).toBe(false);
    expect(store.has('digitar-paises', 'world', 'asia')).toBe(false);
    store.clear('digitar-paises', 'world', 'europe');
    expect(store.has('digitar-paises', 'world', 'europe')).toBe(false);
  });
});

describe('time limit on a continent', () => {
  it('scales the world limit by the share of targets, in whole minutes, at least 2', () => {
    const world = worldTargets(false);
    const europe = inContinent(world, 'europe').length;
    expect(continentMinutes(15, europe, world.length)).toBe(Math.round((15 * europe) / 195));
    expect(continentMinutes(15, 195, 195)).toBe(15);
    expect(continentMinutes(15, 12, 195)).toBe(2); // 0.9 min rounds below the minimum
    expect(continentMinutes(10, 54, 195)).toBe(3);
  });
});
