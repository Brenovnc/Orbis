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
