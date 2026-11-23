import {
  GeoProjection,
  geoArea,
  geoCentroid,
  geoConicEqualArea,
  geoContains,
  geoNaturalEarth1,
  geoPath,
} from 'd3-geo';
import { geoPatterson } from 'd3-geo-projection';
import type { Geometry, MultiLineString, Position } from 'geojson';
import { feature } from 'topojson-client';
import { BrazilTopology } from '../../core/data/geo-data.service';
import { MapProjection } from '../../core/settings.service';

// How places are projected, outlined and framed: shared by the map and by the surroundings drawn
// in the Silhouettes game, so both show a place the same way.

const WIDTH = 960;
export const SPHERE = { type: 'Sphere' } as const;
/** A piece of a place counts for its frame only if it is at least this big next to the biggest. */
const MAIN_PART = 0.25;
/** How far (as a share of the map height) it can be dragged past its top and bottom edges. */
const VERTICAL_SLACK = 0.25;

/** [x0, y0, x1, y1] in map units. */
export type Frame = [number, number, number, number];

export interface MapView {
  /** True when the map repeats sideways (world, continuous projection). */
  continuous: boolean;
  /** True when the round map draws its sphere and grid (world, Natural Earth). */
  sphere: boolean;
  /** Share of the map's size that can be dragged past each edge (Brazil shows its neighbours). */
  slack: { x: number; y: number };
  projection: GeoProjection;
  path: ReturnType<typeof geoPath>;
  width: number;
  height: number;
}

/**
 * Two ways to draw the world:
 * - continuous (default): Patterson, a rectangular projection with little distortion (never
 *   Mercator, which inflates areas near the poles). It repeats sideways, so dragging east or
 *   west never ends;
 * - natural-earth: the classic rounded world map, drawn once.
 */
export function makeWorldView(kind: MapProjection): MapView {
  const continuous = kind === 'continuous';
  const projection = (continuous ? geoPatterson() : geoNaturalEarth1()).fitWidth(WIDTH, SPHERE);
  const path = geoPath(projection);
  const [[x0, y0], [x1, y1]] = path.bounds(SPHERE);
  return {
    continuous,
    sphere: !continuous,
    slack: { x: 0, y: VERTICAL_SLACK },
    projection,
    path,
    width: x1 - x0,
    height: Math.ceil(y1 - y0),
  };
}

const BRAZIL_PADDING = 40;
/** The top bar covers the top of the screen, so Brazil starts lower than the edge. */
const BRAZIL_TOP_PADDING = 150;

/**
 * Brazil: an equal-area conic projection (like the world map, it keeps areas honest), with the
 * neighbouring countries around it for context. The clip keeps far-away land out of the drawing.
 */
export function makeBrazilView(brazil: BrazilTopology): MapView {
  // The camera frames the states' own geometry, so it follows the data.
  const frame = feature(brazil, brazil.objects.states);
  const projection = geoConicEqualArea()
    .rotate([54, 0])
    .parallels([-2, -22])
    .clipAngle(55)
    .fitWidth(WIDTH - 2 * BRAZIL_PADDING, frame);
  const [x, y] = projection.translate();
  projection.translate([x + BRAZIL_PADDING, y + BRAZIL_TOP_PADDING]);
  const path = geoPath(projection);
  const [, [, bottom]] = path.bounds(frame);
  return {
    continuous: false,
    sphere: false,
    slack: { x: 0.15, y: 0.15 },
    projection,
    path,
    width: WIDTH,
    height: Math.ceil(bottom + BRAZIL_PADDING),
  };
}

/**
 * True for a segment that lies on the cut of the map, not on a real coast or border: along the
 * 180° meridian (where Natural Earth splits Russia, Fiji...) or along the South Pole edge of
 * Antarctica. Drawing those would show a black line across Chukotka, for example.
 */
function onSeam(a: Position, b: Position): boolean {
  const alongDateLine = Math.abs(a[0]) > 179.999 && Math.abs(b[0]) > 179.999 && a[0] * b[0] > 0;
  const alongSouthPole = a[1] < -89.999 && b[1] < -89.999;
  return alongDateLine || alongSouthPole;
}

/** Lines (rings or arcs) with the seam segments taken out, ready to be stroked. */
export function withoutSeams(lines: Position[][]): MultiLineString {
  const coordinates: Position[][] = [];
  for (const line of lines) {
    let current: Position[] = [line[0]];
    for (let i = 1; i < line.length; i++) {
      if (onSeam(line[i - 1], line[i])) {
        if (current.length > 1) coordinates.push(current);
        current = [line[i]];
      } else {
        current.push(line[i]);
      }
    }
    if (current.length > 1) coordinates.push(current);
  }
  return { type: 'MultiLineString', coordinates };
}

/** Only the segments on the cut along 180°: stroked with the land's fill, they close that seam. */
export function dateLineSeams(lines: Position[][]): MultiLineString {
  const coordinates: Position[][] = [];
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [a, b] = [line[i - 1], line[i]];
      if (onSeam(a, b) && Math.abs(a[0]) > 179.999) coordinates.push([a, b]);
    }
  }
  return { type: 'MultiLineString', coordinates };
}

export function ringsOf(geometry: Geometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  if (geometry.type === 'LineString') return [geometry.coordinates];
  return [];
}

/**
 * The main parts of a place: the polygons that are at least `MAIN_PART` of the biggest one. Far
 * islands and exclaves (Alaska, Chukotka, Guiana, overseas territories) are left out.
 */
export function mainParts(geometry: Geometry): Geometry[] {
  const polygons: Geometry[] =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }))
      : [geometry];
  const areas = polygons.map((g) => geoArea({ type: 'Feature', properties: {}, geometry: g }));
  const biggest = Math.max(...areas);
  return polygons.filter((_, i) => areas[i] >= biggest * MAIN_PART);
}

/**
 * Where to put a mark on a place: its label point, if it falls in a main part of the place (the
 * shapes of its units together); otherwise the center of its biggest main part.
 */
export function markPoint(geometries: readonly Geometry[], point: Position): Position {
  const polygons = geometries.flatMap((geometry) => {
    if (geometry.type === 'Polygon') return [geometry.coordinates];
    return geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  });
  if (polygons.length === 0) return point;
  const parts = mainParts({ type: 'MultiPolygon', coordinates: polygons });
  if (parts.some((part) => geoContains(part, point as [number, number]))) return point;
  const area = (part: Geometry) => geoArea({ type: 'Feature', properties: {}, geometry: part });
  const biggest = parts.reduce((best, part) => (area(part) > area(best) ? part : best));
  return geoCentroid(biggest);
}

const union = (frames: readonly Frame[]): Frame => [
  Math.min(...frames.map((f) => f[0])),
  Math.min(...frames.map((f) => f[1])),
  Math.max(...frames.map((f) => f[2])),
  Math.max(...frames.map((f) => f[3])),
];

/** Frame of the main parts of a place, or null when it has no shape. */
export function frameOfMainParts(path: MapView['path'], geometry: Geometry): Frame | null {
  const frames = mainParts(geometry)
    .map((part) => path.bounds({ type: 'Feature', properties: {}, geometry: part }).flat() as Frame)
    .filter((frame) => frame.every(Number.isFinite));
  return frames.length > 0 ? union(frames) : null;
}

/**
 * Frame of several places. When the map repeats sideways (`repeat`, its width), the narrowest one:
 * two places on both sides of 180° are framed across it, not around the whole world.
 */
export function frameOfPlaces(frames: readonly Frame[], repeat: number | null): Frame | null {
  if (frames.length === 0) return null;
  if (repeat === null) return union(frames);
  // Each place in turn is the leftmost one; those before it go to the next copy of the map.
  const options = frames.map(([left]) =>
    union(
      frames.map(([x0, y0, x1, y1]) =>
        x0 < left ? [x0 + repeat, y0, x1 + repeat, y1] : [x0, y0, x1, y1],
      ),
    ),
  );
  return options.reduce((best, frame) => (frame[2] - frame[0] < best[2] - best[0] ? frame : best));
}
