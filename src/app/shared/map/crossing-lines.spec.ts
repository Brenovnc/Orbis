import crossingsJson from '../../../../public/data/trail-crossings.json';
import { CrossingsData } from '../../core/data/proximity';
import { crossingLines } from './crossing-lines';
import { makeWorldView } from './map-view';

const crossings = crossingsJson as unknown as CrossingsData;

describe('lines of the sea crossings', () => {
  it('go from one point of the data to the other, slightly bent', () => {
    for (const crossing of crossings.on) {
      const [line] = crossingLines([crossing]).coordinates;
      expect(line[0]).toEqual(crossing.from);
      expect(line.at(-1)).toEqual(crossing.to);
    }
    // On the equator the bend is easy to measure: north of the straight line, a tenth of it.
    const [line] = crossingLines([{ from: [0, 0], to: [4, 0] }]).coordinates;
    const [lon, lat] = line[line.length / 2 - 0.5];
    expect(lon).toBeCloseTo(2, 5);
    expect(lat).toBeGreaterThan(0.2);
    expect(lat).toBeLessThan(0.8);
  });

  it('no line crosses the whole map, even across 180°', () => {
    const acrossDateLine = crossings.on.filter((c) => Math.abs(c.from[0] - c.to[0]) > 180);
    expect(acrossDateLine.length).toBeGreaterThan(0);
    for (const projection of ['continuous', 'natural-earth'] as const) {
      const { path, width } = makeWorldView(projection);
      const pieces = (path(crossingLines(crossings.on)) ?? '').split('M').slice(1);
      for (const piece of pieces) {
        const xs = [...piece.matchAll(/(-?[\d.]+),/g)].map((m) => Number(m[1]));
        expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(width / 10);
      }
      // Cut in two at the edge of the map.
      expect(pieces.length).toBe(crossings.on.length + acrossDateLine.length);
    }
  });
});
