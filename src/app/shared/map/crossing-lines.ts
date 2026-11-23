import type { MultiLineString, Position } from 'geojson';
import { LonLat } from '../../core/data/geo-data.models';

const RAD = Math.PI / 180;
const POINTS = 16;
/** How far the middle of a line is from the straight one, as a share of its length. */
const BEND = 0.1;

type Vector = [number, number, number];

interface Ends {
  from: LonLat;
  to: LonLat;
}

const toVector = ([lon, lat]: LonLat): Vector => {
  const cos = Math.cos(lat * RAD);
  return [cos * Math.cos(lon * RAD), cos * Math.sin(lon * RAD), Math.sin(lat * RAD)];
};

/**
 * Sea crossings as lines between two points of the coasts, slightly bent (always the same way, to
 * the north) so that they do not look like borders. They are worked out on the sphere, so the
 * projection cuts those that cross 180Â° by itself.
 */
export function crossingLines(crossings: readonly Ends[]): MultiLineString {
  return { type: 'MultiLineString', coordinates: crossings.map(bentLine) };
}

function bentLine({ from, to }: Ends): Position[] {
  const a = toVector(from);
  const b = toVector(to);
  // Perpendicular to the way from one point to the other.
  const cross: Vector = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const length = Math.hypot(...cross);
  if (length === 0) return [from, to];
  const angle = Math.asin(Math.min(1, length));
  const bend = ((cross[2] < 0 ? -1 : 1) * BEND * angle) / length;
  return Array.from({ length: POINTS + 1 }, (_, n) => {
    // The ends are the points of the data, exactly.
    if (n === 0) return from;
    if (n === POINTS) return to;
    const t = n / POINTS;
    const up = bend * Math.sin(Math.PI * t);
    const [x, y, z] = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * t + cross[k] * up);
    return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
  });
}
