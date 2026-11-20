import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';

/** Islands smaller than this share of the biggest piece are left out (Hawaii, the Canaries...). */
const MIN_PIECE = 0.02;
const PADDING = 0.08;

/**
 * The map shape of the place itself. Map shapes are split by country and territory, so a
 * country's shape never carries the territories it administers (Denmark without Greenland),
 * whatever the territory rule; each territory is a shape of its own. The few tiny bits joined
 * to a country by decisions.json (the British bases in Cyprus, Guantánamo) stay out of the
 * outline through `silhouettePieces`.
 */
export function ownShape(features: Feature[], id: string): Feature | undefined {
  return features.find((f) => f.properties?.['id'] === id);
}

/** The pieces of a place that make its outline: the main land and its sizeable islands. */
export function silhouettePieces(geometry: Geometry): MultiPolygon | null {
  const polygons: Polygon[] =
    geometry.type === 'Polygon'
      ? [geometry]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }))
        : [];
  if (polygons.length === 0) return null;
  const areas = polygons.map((polygon) => geoArea(polygon));
  const biggest = Math.max(...areas);
  return {
    type: 'MultiPolygon',
    coordinates: polygons
      .filter((_, i) => areas[i] >= biggest * MIN_PIECE)
      .map((polygon) => polygon.coordinates),
  };
}

/**
 * The outline of a place as an SVG path in a `size`×`size` box: an equal-area projection
 * centred on the place itself, so it looks the same wherever it is (no Mercator stretching).
 * Empty when the place has no land shape.
 */
export function silhouettePath(feature: Feature, size: number): string {
  const pieces = silhouettePieces(feature.geometry);
  if (!pieces) return '';
  const [lon, lat] = geoCentroid(pieces);
  const margin = size * PADDING;
  const projection = geoAzimuthalEqualArea()
    .rotate([-lon, -lat])
    .fitExtent(
      [
        [margin, margin],
        [size - margin, size - margin],
      ],
      pieces,
    );
  return geoPath(projection)(pieces) ?? '';
}
