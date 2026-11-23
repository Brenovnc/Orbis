import type { Geometry } from 'geojson';
import { markPoint } from './map-view';

/** A square of `size` degrees whose lower left corner is `[lon, lat]`; clockwise, as D3 wants. */
const square = (lon: number, lat: number, size: number): Geometry => ({
  type: 'Polygon',
  coordinates: [
    [
      [lon, lat],
      [lon, lat + size],
      [lon + size, lat + size],
      [lon + size, lat],
      [lon, lat],
    ],
  ],
});

describe('the point of a numbered dot', () => {
  const mainland = square(0, 0, 10);
  const island = square(40, 40, 1);

  it('is the label point when it is in the main part', () => {
    expect(markPoint([mainland, island], [5, 5])).toEqual([5, 5]);
  });

  it('is the center of the main part when the label point is outside it', () => {
    const [lon, lat] = markPoint([mainland, island], [40.5, 40.5]);
    expect(lon).toBeCloseTo(5, 0);
    expect(lat).toBeCloseTo(5, 0);
  });

  it('keeps the label point of a place with no shape', () => {
    expect(markPoint([], [12, 34])).toEqual([12, 34]);
  });
});
