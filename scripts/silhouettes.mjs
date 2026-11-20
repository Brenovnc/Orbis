// Places whose outline is too poor to be a Silhouettes question at the resolution of the maps:
// a shape of almost no area, or one drawn with so few points that it is a triangle or a square.
// Runs at the end of `npm run data`; the game never asks the places listed here.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { geoArea } from 'd3-geo';
import { feature } from 'topojson-client';

/** Less area than this (km²) is a dot: it has no shape to guess. */
export const MIN_AREA_KM2 = 1;
/** Fewer distinct points than this (in the pieces that make the outline) is a triangle or a square. */
export const MIN_POINTS = 5;
/** Same rule as `silhouettePieces` in the app: islands under this share of the biggest piece do not count. */
const MIN_PIECE = 0.02;
const EARTH_KM = 6371.0088;

export function buildSilhouetteExclusions(outDir) {
  const readJson = (name) => JSON.parse(readFileSync(join(outDir, name), 'utf8'));
  const world = readJson('world.topo.json');
  const brazil = readJson('brazil.topo.json');
  const result = {
    minAreaKm2: MIN_AREA_KM2,
    minPoints: MIN_POINTS,
    world: degenerate(feature(world, world.objects.units).features),
    brazil: degenerate(feature(brazil, brazil.objects.states).features),
  };
  writeFileSync(join(outDir, 'silhouette-excluded.json'), JSON.stringify(result, null, 1) + '\n');
  return result;
}

function degenerate(features) {
  const found = [];
  for (const { properties, geometry } of features) {
    const polygons =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];
    if (polygons.length === 0) continue;
    const areas = polygons.map((coordinates) => geoArea({ type: 'Polygon', coordinates }));
    const biggest = Math.max(...areas);
    const kept = polygons.filter((_, i) => areas[i] >= biggest * MIN_PIECE);
    const areaKm2 =
      kept.reduce((sum, p) => sum + geoArea({ type: 'Polygon', coordinates: p }), 0) *
      EARTH_KM ** 2;
    const points = kept.reduce(
      (sum, polygon) =>
        sum + polygon.reduce((n, ring) => n + new Set(ring.map((p) => p.join(','))).size, 0),
      0,
    );
    const reasons = [];
    if (areaKm2 < MIN_AREA_KM2) reasons.push('area');
    if (points < MIN_POINTS) reasons.push('points');
    if (reasons.length) {
      found.push({ id: properties.id, reasons, points, areaKm2: Math.round(areaKm2 * 10) / 10 });
    }
  }
  return found.sort((a, b) => a.id.localeCompare(b.id));
}
