// Real generated data, shared by the game specs.
import countriesJson from '../../../../public/data/countries.json';
import territoriesJson from '../../../../public/data/territories.json';
import worldTopo from '../../../../public/data/world.topo.json';
import { Country, Territory, WorldUnitProperties } from '../data/geo-data.models';
import { buildWorldTargets } from './targets';

export const countries = countriesJson as unknown as Country[];
export const territories = territoriesJson as unknown as Territory[];
export const units = worldTopo.objects.units.geometries.map(
  (g) => g.properties as WorldUnitProperties,
);

export const worldTargets = (includeTerritories: boolean) =>
  buildWorldTargets(countries, territories, units, includeTerritories);

/** A fixed-seed random source (mulberry32), so tests that draw questions never vary between runs. */
export function seededRandom(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
