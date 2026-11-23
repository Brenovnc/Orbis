import { Crossing, CrossingsData } from '../data/proximity';

/** The sea crossings of a game; with `region` (the ids of a continent), both ends in it. */
export function crossingsIn(
  crossings: CrossingsData,
  territories: boolean,
  region: readonly string[] | null,
): Crossing[] {
  const list = crossings[territories ? 'on' : 'off'];
  return region ? crossingsAmong(list, new Set(region)) : list;
}

/** The crossings with both ends among some places. */
export function crossingsAmong(list: readonly Crossing[], ids: ReadonlySet<string>): Crossing[] {
  return list.filter(({ a, b }) => ids.has(a) && ids.has(b));
}

/** The crossings a trail takes, in its order. */
export function crossingsAlong(list: readonly Crossing[], trail: readonly string[]): Crossing[] {
  return trail.slice(1).flatMap((id, n) => {
    const previous = trail[n];
    const step = list.find(
      ({ a, b }) => (a === previous && b === id) || (a === id && b === previous),
    );
    return step ?? [];
  });
}
