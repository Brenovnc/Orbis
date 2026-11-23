import { ProximityData, nearestIds } from '../data/proximity';
import { shuffle } from './click-game';
import { Target } from './targets';

export const CHOICES = 4;
/** The wrong options are drawn among this many places of the same group, the closest in size. */
const SIMILAR_SIZE = 8;

/**
 * The options of a Silhouettes question, shuffled: the answer and places of the same continent
 * (region, in Brazil) of similar size. Where the group is too small, the nearest places complete
 * it.
 */
export function pickChoices(
  answer: Target,
  candidates: Target[],
  distances: ProximityData | undefined,
  random: () => number,
): string[] {
  const others = candidates.filter((target) => target.id !== answer.id);
  const sizeGap = (target: Target) =>
    Math.abs(Math.log(target.place.areaKm2 / answer.place.areaKm2));
  const similar = others
    .filter((target) => target.group === answer.group)
    .sort((a, b) => sizeGap(a) - sizeGap(b))
    .slice(0, SIMILAR_SIZE);
  const wrong = shuffle(similar, random)
    .slice(0, CHOICES - 1)
    .map((target) => target.id);
  if (wrong.length < CHOICES - 1 && distances) {
    const left = new Set(others.map((target) => target.id).filter((id) => !wrong.includes(id)));
    const nearest = nearestIds(distances, answer.id).filter((id) => left.has(id));
    wrong.push(...nearest.slice(0, CHOICES - 1 - wrong.length));
  }
  return shuffle([answer.id, ...wrong], random);
}
