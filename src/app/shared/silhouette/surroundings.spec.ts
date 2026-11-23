import { feature } from 'topojson-client';
import excludedJson from '../../../../public/data/silhouette-excluded.json';
import territoriesProximityJson from '../../../../public/data/proximity-world-territories.json';
import proximityJson from '../../../../public/data/proximity-world.json';
import worldJson from '../../../../public/data/world.topo.json';
import { WorldTopology } from '../../core/data/geo-data.service';
import { ProximityData, nearestIds } from '../../core/data/proximity';
import { worldTargets } from '../../core/game/test-targets';
import { makeWorldView } from '../map/map-view';
import { Surroundings, measureShapes, surroundingsOf } from './surroundings';

const world = worldJson as unknown as WorldTopology;
const view = makeWorldView('continuous');
const shapes = measureShapes(view, feature(world, world.objects.units).features);
const excluded = new Set(excludedJson.world.map((place) => place.id));

function cutOf(id: string, territories: boolean): Surroundings {
  const data = (territories ? territoriesProximityJson : proximityJson) as ProximityData;
  const targets = new Map(worldTargets(territories).map((target) => [target.id, target]));
  const near = nearestIds(data, id)
    .slice(0, 10)
    .flatMap((other) => targets.get(other)?.unitIds ?? []);
  return surroundingsOf(view, shapes, id, 'world', near) as Surroundings;
}

/** Whether some point of the other places is inside the frame. */
function showsLand({ viewBox, others, offsets }: Surroundings): boolean {
  const [left, top, side] = viewBox.split(' ').map(Number);
  const inside = (from: number, value: number) => value >= from && value <= from + side;
  return [...others.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].some(
    ([, x, y]) =>
      inside(top, Number(y)) && offsets.some((offset) => inside(left, Number(x) + offset)),
  );
}

describe('surroundings of a silhouette', () => {
  for (const territories of [false, true]) {
    it(`always show some other place (territories ${territories ? 'on' : 'off'})`, () => {
      for (const target of worldTargets(territories)) {
        if (excluded.has(target.id)) continue;
        expect(showsLand(cutOf(target.id, territories)), target.id).toBe(true);
      }
    });
  }

  it('mark with a ring the places too small to see, and only those', () => {
    for (const id of ['KIR', 'TUV', 'MHL']) expect(cutOf(id, false).ring, id).not.toBeNull();
    for (const id of ['BRA', 'CUB', 'ISL', 'NZL']) expect(cutOf(id, false).ring, id).toBeNull();
  });
});
