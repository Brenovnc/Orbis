import { Continent } from './geo-data.models';

/** The continents a player can choose (Antarctica has no country, so it is never a game). */
export type PlayableContinent = Exclude<Continent, 'antarctica'>;

export const CONTINENT_CHOICES: PlayableContinent[] = [
  'africa',
  'north-america',
  'south-america',
  'asia',
  'europe',
  'oceania',
];

/**
 * Where the camera looks for each continent: [west, south, east, north] in degrees. This is only
 * a viewing window, not data about the places: Natural Earth counts all of Russia as Europe and
 * puts Hawaii in North America, so the window stops where a person would expect the continent to
 * end. Oceania goes past 180° because Fiji, Tonga and Kiribati lie across the date line.
 * A test checks that every country of the continent has its label point inside its window.
 */
export const CONTINENT_FRAMES: Record<PlayableContinent, [number, number, number, number]> = {
  africa: [-27, -37, 60, 38],
  'north-america': [-170, 5, -50, 72],
  'south-america': [-82, -57, -33, 14],
  asia: [25, -12, 148, 56],
  europe: [-25, 34, 50, 72],
  oceania: [108, -50, 205, 14],
};

export function isPlayableContinent(value: unknown): value is PlayableContinent {
  return CONTINENT_CHOICES.includes(value as PlayableContinent);
}
