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

/**
 * Why a map area is not part of the game: `territories` = of no country, a target of this game
 * when that option is on; `unlisted` = of no country, and not a target of this game even then;
 * `game` = a place of the game in use (a country, or a territory with the option on) that this game
 * does not ask about; `never` = not a target in any mode.
 */
export type OutOfPlayKind = 'territories' | 'unlisted' | 'game' | 'never';

/**
 * The map areas that no target of the game lights up (Antarctica, Kosovo, Bir Tawil...), by shape
 * id. They are real land that is neither to be found nor a wrong answer, so the map paints them
 * apart. Pass the targets this game has on the whole map (before the continent filter), and those
 * it would have with territories on.
 */
export function outOfPlayUnits(
  units: WorldUnitProperties[],
  targets: Target[],
  targetsWithTerritories: Target[],
  includeTerritories: boolean,
): Map<string, OutOfPlayKind> {
  const lit = new Set(targets.flatMap((target) => target.unitIds));
  const litWithTerritories = new Set(targetsWithTerritories.flatMap((target) => target.unitIds));
  const kindOf = (unit: WorldUnitProperties): OutOfPlayKind => {
    if (!unit.country && !unit.territory) return 'never';
    if (unit.country || includeTerritories) return 'game';
    return litWithTerritories.has(unit.id) ? 'territories' : 'unlisted';
  };
  return new Map(units.filter((unit) => !lit.has(unit.id)).map((unit) => [unit.id, kindOf(unit)]));
}

/**
 * True when the area (a territory, if it has a place in the data) lies in another continent than
 * the chosen one: it then keeps the tone of what is outside the region, not the one out of play.
 */
export const isOtherContinent = (
  place: { continent: Continent } | undefined,
  continent: Continent | null,
): boolean => !!continent && !!place && place.continent !== continent;

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

/** Keeps only the targets of one continent (world map); null keeps them all. */
export const inContinent = (targets: Target[], continent: Continent | null): Target[] =>
  continent ? targets.filter((target) => target.group === continent) : targets;

/**
 * The time limit on a continent: the world's limit in the same proportion as the number of
 * targets, in whole minutes, never under 2.
 */
export const continentMinutes = (worldMinutes: number, part: number, whole: number): number =>
  Math.max(2, Math.round((worldMinutes * part) / whole));

/** Capital games can only ask about places that have a capital (Antarctica, Hong Kong... do not). */
export const withCapitals = (targets: Target[]): Target[] =>
  targets.filter((target) => target.place.capitals.length > 0);
