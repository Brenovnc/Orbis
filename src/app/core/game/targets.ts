import {
  BrazilState,
  Continent,
  Country,
  Place,
  Territory,
  WorldUnitProperties,
} from '../data/geo-data.models';

/** Something the player has to find: a country, a territory (when on) or a Brazilian state. */
export interface Target {
  /** Id of the place (country, territory or state abbreviation). */
  id: string;
  place: Place;
  /** Continent (world) or region (Brazil): how the lists are grouped. */
  group: string;
  /** Map shapes that light up when this target is found. */
  unitIds: string[];
  /** Too small to see as a shape: it gets a marker and a bigger click area. */
  tiny: boolean;
}

/**
 * Places smaller than this are too small to see as a shape. Brazil is drawn at a much larger
 * scale than the world, so only the Federal District needs the help there.
 */
const TINY_AREA_KM2 = { world: 3000, brazil: 10_000 };

export const CONTINENT_ORDER: Continent[] = [
  'africa',
  'antarctica',
  'asia',
  'europe',
  'north-america',
  'oceania',
  'south-america',
];

/**
 * Territories off: the 195 countries are the targets, and every territory counts as part of
 * the country that administers it (clicking Greenland = clicking Denmark). Places no country
 * administers (Antarctica, Kosovo...) are on the map but are never targets.
 * Territories on: territories become targets of their own, and the total passes 195.
 */
export function buildWorldTargets(
  countries: Country[],
  territories: Territory[],
  units: WorldUnitProperties[],
  includeTerritories: boolean,
): Target[] {
  const places: (Country | Territory)[] = includeTerritories
    ? [...countries, ...territories]
    : countries;

  return places.map((place) => ({
    id: place.id,
    place,
    group: place.continent,
    unitIds: units
      .filter((unit) =>
        includeTerritories
          ? (unit.territory ?? unit.country) === place.id
          : unit.country === place.id,
      )
      .map((unit) => unit.id),
    tiny: place.areaKm2 < TINY_AREA_KM2.world,
  }));
}

/** The 26 states and the Federal District, grouped by region. Each one is a single map shape. */
export function buildBrazilTargets(states: BrazilState[]): Target[] {
  return states.map((state) => ({
    id: state.id,
    place: state,
    group: state.region,
    unitIds: [state.id],
    tiny: state.areaKm2 < TINY_AREA_KM2.brazil,
  }));
}

/** Capital games can only ask about places that have a capital (Antarctica, Hong Kong... do not). */
export const withCapitals = (targets: Target[]): Target[] =>
  targets.filter((target) => target.place.capitals.length > 0);
