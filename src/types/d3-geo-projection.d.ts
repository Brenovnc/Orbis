// d3-geo-projection ships no TypeScript types; only what Orbis uses is declared here.
declare module 'd3-geo-projection' {
  import type { GeoProjection } from 'd3-geo';
  export function geoPatterson(): GeoProjection;
}
