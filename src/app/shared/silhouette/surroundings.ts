import type { Feature, Position } from 'geojson';
import { Layer } from '../../core/data/geo-data.models';
import { MapView, frameOfMainParts, mainParts, ringsOf, withoutSeams } from '../map/map-view';

/** Side of the frame next to the bigger side of the place. */
const MARGIN = 1.7;
/**
 * Small places get more around them, up to this many map units (about 4.5° on either map) and
 * this many times their own size, so that they can still be seen.
 */
const MIN_SIDE: Record<Layer, number> = { world: 12, brazil: 100 };
const MAX_TIMES = 12;
/**
 * An isolated island gets a wider frame, until it reaches a place near it, up to this many map
 * units (about 45° on the world map). The margins are for the whole of a near piece of land, or
 * for a stretch of its coast when it is big.
 */
const MAX_SIDE = 120;
const PIECE_MARGIN = 1.1;
const COAST_MARGIN = 1.35;
/** A piece of land can be made out in the frame when it is at least this share of its side. */
const VISIBLE = 0.03;
/** A place whose biggest part is a smaller share of the frame than this gets a ring around it. */
const TINY = 0.05;
const MIN_RING = 0.07;

export interface MapShape {
  feature: Feature;
  bounds: [[number, number], [number, number]];
}

export interface Surroundings {
  viewBox: string;
  /** Fill and outline of the place itself, and the outlines of everything else in the frame. */
  place: string;
  placeOutline: string;
  others: string;
  /** Ring around a place that would be too small to see, or null. */
  ring: { x: number; y: number; r: number } | null;
  /** Copies of the map (offsets) to draw: a place near its edge continues on the other side. */
  offsets: number[];
}

/** The shapes of a map with their size on it, measured once for every question. */
export function measureShapes(view: MapView, features: Feature[]): MapShape[] {
  return features.map((feature) => ({ feature, bounds: view.path.bounds(feature) }));
}

/**
 * A square cut of the map around the main parts of a place, or null when it has no shape.
 * `near` are the shapes of the places nearest to it: at least one of them is in the frame.
 */
export function surroundingsOf(
  view: MapView,
  shapes: MapShape[],
  id: string,
  layer: Layer,
  near: readonly string[],
): Surroundings | null {
  const own = shapes.find(({ feature }) => feature.properties?.['id'] === id);
  const frame = own && frameOfMainParts(view.path, own.feature.geometry);
  if (!own || !frame) return null;
  const [x0, y0, x1, y1] = frame;
  const size = Math.max(x1 - x0, y1 - y0);
  const [x, y] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const base = Math.max(size * MARGIN, Math.min(MIN_SIDE[layer], size * MAX_TIMES));
  // A place already bigger than the limit is not a small island: its frame stays.
  const reach =
    base < MAX_SIDE ? Math.min(MAX_SIDE, 2 * reachOf(view, shapes, near, [x, y], base / 2)) : base;
  const side = Math.min(view.width, reach);
  const left = x - side / 2;
  const top = y - side / 2;

  const biggest = Math.max(
    ...mainParts(own.feature.geometry).map((part) => {
      const [[ax, ay], [bx, by]] = view.path.bounds({
        type: 'Feature',
        properties: {},
        geometry: part,
      });
      return Math.max(bx - ax, by - ay);
    }),
  );
  const r = Math.max(size * 0.6, side * MIN_RING);
  // A place scattered over the whole map has nothing a ring could go around.
  const ringed = biggest < side * TINY && r < side / 2;

  const outlineOf = (feature: Feature) => view.path(withoutSeams(ringsOf(feature.geometry))) ?? '';
  const offsets = view.continuous ? [-view.width, 0, view.width] : [0];
  const inFrame = ({ bounds: [[ax, ay], [bx, by]] }: MapShape) =>
    ay <= top + side &&
    by >= top &&
    offsets.some((offset) => ax + offset <= left + side && bx + offset >= left);
  return {
    viewBox: `${left} ${top} ${side} ${side}`,
    place: view.path(own.feature) ?? '',
    placeOutline: outlineOf(own.feature),
    others: shapes
      .filter((shape) => shape !== own && inFrame(shape))
      .map(({ feature }) => outlineOf(feature))
      .join(' '),
    ring: ringed ? { x, y, r } : null,
    offsets,
  };
}

/**
 * Half the side of a frame around `center` that shows a piece of land of some shapes: `half` itself
 * when it already does, or else the nearest piece. One that can be made out is preferred: next to
 * a far atoll, all that is near may be other atolls, dots of one pixel.
 */
function reachOf(
  view: MapView,
  shapes: MapShape[],
  ids: readonly string[],
  [x, y]: Position,
  half: number,
): number {
  let [nearest, nearestVisible] = [Infinity, Infinity];
  for (const { feature } of shapes) {
    if (!ids.includes(feature.properties?.['id'])) continue;
    for (const ring of ringsOf(feature.geometry)) {
      const points = ring.flatMap((point) => {
        const xy = view.projection(point as [number, number]);
        if (!xy) return [];
        const dx = xy[0] - x;
        // On the repeating map, the copy of the land that is nearest.
        const turns = view.continuous ? Math.round(dx / view.width) : 0;
        return [[dx - view.width * turns, xy[1] - y]];
      });
      const away = points.map(([dx, dy]) => Math.max(Math.abs(dx), Math.abs(dy)));
      const [closest, farthest] = [Math.min(...away), Math.max(...away)];
      const reach =
        closest < half * 0.9
          ? half
          : Math.max(half, Math.min(farthest * PIECE_MARGIN, closest * COAST_MARGIN));
      nearest = Math.min(nearest, reach);
      const [xs, ys] = [0, 1].map((k) => points.map((point) => point[k]));
      const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      if (size >= 2 * reach * VISIBLE) nearestVisible = Math.min(nearestVisible, reach);
    }
  }
  if (2 * nearestVisible <= MAX_SIDE) return nearestVisible;
  return Number.isFinite(nearest) ? nearest : half;
}
