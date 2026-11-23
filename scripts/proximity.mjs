// Land neighbours, distances and directions, worked out from the generated map files.
// Usage: npm run data:proximity  (also runs at the end of `npm run data`; needs no download)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoBounds, geoContains } from 'd3-geo';
import { feature, neighbors } from 'topojson-client';

const RAD = Math.PI / 180;
/** Rings are filled in with a point at least this often (km), so a border is not just its corners. */
const SPACING_KM = 15;
const EARTH_KM = 6371.0088;
/** Decimals of the ends of a crossing (0.01° is about 1 km). */
const POINT_DECIMALS = 2;
/** Directions are kept as one of 16 compass sectors (one hex digit): 0 = north, 4 = east... */
const SECTORS = 16;

const readJson = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));

export function buildProximity(outDir, decisions) {
  const worldTopo = readJson(outDir, 'world.topo.json');
  const brazilTopo = readJson(outDir, 'brazil.topo.json');
  const countries = readJson(outDir, 'countries.json');
  const territories = readJson(outDir, 'territories.json');
  const states = readJson(outDir, 'states.json');

  // --- World: one record per map shape, with the country and territory it belongs to.
  const geometries = worldTopo.objects.units.geometries;
  const units = geometries.map((g) => g.properties);
  const shapes = feature(worldTopo, worldTopo.objects.units).features;
  const unitNeighbors = withEnclaves(shapes, neighbors(geometries));

  // Territories off: a territory counts as the country that administers it.
  const coreNode = (u) => u.country;
  // Territories on: a territory is a place of its own.
  const territoryNode = (u) => u.territory ?? u.country;

  const core = graph(units, unitNeighbors, coreNode, true);
  const withTerritories = graph(units, unitNeighbors, territoryNode, false);

  // Real borders the simplified map loses: added by hand in decisions.json, with the reason.
  const worldIds = countries.map((c) => c.id);
  const allIds = [...worldIds, ...territories.map((t) => t.id)];
  for (const { a, b } of decisions.extraNeighbors.list) {
    if (worldIds.includes(a) && worldIds.includes(b)) addBorder(core.neighbors, a, b);
    if (allIds.includes(a) && allIds.includes(b)) addBorder(withTerritories.neighbors, a, b);
  }

  const continentOf = new Map([...countries, ...territories].map((p) => [p.id, p.continent]));
  const excluded = decisions.trailExcludedBorders.list;
  const trail = withoutBorders(trailGraph(core, territories, continentOf), excluded);
  const trailTerritories = withoutBorders(withTerritories.neighbors, excluded);

  const neighborsFile = {
    world: {
      territoriesOff: core.neighbors,
      territoriesOn: withTerritories.neighbors,
      // Borders that exist only through a territory: "BRA|FRA": ["GUF"] (ids in alphabetical order).
      via: core.via,
      // For the Trail game: a border that exists only through a territory counts only when the
      // territory is on the same continent as the country that administers it.
      trail,
      // The Trail with territories on: each territory is a place of its own, so only the borders
      // excluded by hand (a territory the map does not separate) are dropped.
      trailTerritories,
    },
    brazil: brazilNeighbors(brazilTopo, states),
  };
  writeFileSync(join(outDir, 'neighbors.json'), JSON.stringify(neighborsFile, null, 1) + '\n');

  // --- Distances and directions.
  const labelOf = new Map(
    [...countries, ...territories, ...states].map((p) => [p.id, p.labelPoint]),
  );
  const linesByNode = (node, linesOf) => {
    const map = new Map();
    units.forEach((u, i) => {
      const id = node(u);
      if (!id) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(...linesOf(i));
    });
    return map;
  };
  const ringsByNode = (node) => linesByNode(node, (i) => ringsOf(shapes[i].geometry));
  // With territories off, a distance is measured only on the country's own land: the pieces that
  // are territories (Gibraltar, Virgin Islands...) are left out, while islands of the country
  // itself (Sicily, Hawaii, Jan Mayen) count. Borders through a territory stay (neighbours: 0 km).
  const ownLandNode = (u) => (u.territory ? null : coreNode(u));
  const files = {
    'proximity-world.json': proximity(worldIds, ringsByNode(ownLandNode), labelOf, core.neighbors),
    'proximity-world-territories.json': proximity(
      allIds,
      ringsByNode(territoryNode),
      labelOf,
      withTerritories.neighbors,
    ),
    'proximity-brazil.json': (() => {
      const shapesBr = feature(brazilTopo, brazilTopo.objects.states).features;
      const rings = new Map(shapesBr.map((f) => [f.properties.id, ringsOf(f.geometry)]));
      return proximity(
        states.map((s) => s.id),
        rings,
        labelOf,
        neighborsFile.brazil,
      );
    })(),
  };
  const sizes = {};
  for (const [name, data] of Object.entries(files)) {
    const text = JSON.stringify(data);
    writeFileSync(join(outDir, name), text + '\n');
    sizes[name] = text.length;
  }

  // --- Sea crossings of the Trail game, with the same own-land rule for territories off.
  const coasts = coastsOf(worldTopo, geometries);
  const coastsByNode = (node) => linesByNode(node, (i) => coasts[i]);
  // An excluded entry is a pair, or a place and all those of some continents.
  const rules = {
    ...decisions.trailCrossings,
    excluded: [
      ...excluded,
      ...decisions.trailCrossings.excluded.flatMap(({ a, b, continents }) =>
        continents
          ? allIds
              .filter((id) => continents.includes(continentOf.get(id)))
              .map((id) => ({ a, b: id }))
          : [{ a, b }],
      ),
    ],
  };
  const crossings = {
    off: seaCrossings(
      worldIds,
      coastsByNode(ownLandNode),
      trail,
      // A border through a territory (Spain–United Kingdom: Gibraltar) does not make the United
      // Kingdom part of the continent, nor does it join them in one island group.
      withoutBorders(
        trail,
        Object.keys(core.via).map((key) => ({ a: key.slice(0, 3), b: key.slice(4) })),
      ),
      rules,
    ),
    on: seaCrossings(
      allIds,
      coastsByNode(territoryNode),
      trailTerritories,
      trailTerritories,
      rules,
    ),
  };
  const crossingsText = JSON.stringify(crossings);
  writeFileSync(join(outDir, 'trail-crossings.json'), crossingsText + '\n');
  sizes['trail-crossings.json'] = crossingsText.length;

  const names = new Map([...countries, ...territories, ...states].map((p) => [p.id, p.name.pt]));
  return {
    neighbors: neighborsFile,
    sizes,
    closePairs: closePairs(files, names, neighborsFile),
    crossings,
    guaranteed: guaranteedCrossings(crossings, names),
  };
}

/** The crossings that only exist so that no island is left alone, for the report. */
function guaranteedCrossings(crossings, names) {
  const label = { off: 'territórios desligados', on: 'territórios ligados' };
  return Object.entries(crossings).flatMap(([rule, list]) =>
    list
      .filter((c) => c.guarantee)
      .map(
        (c) => `${label[rule]}: ${c.a} ${names.get(c.a)} – ${c.b} ${names.get(c.b)}, ≈ ${c.km} km`,
      ),
  );
}

/** The coast of each map shape: the lines that are not shared with another shape. */
function coastsOf(topo, geometries) {
  const arcsOf = (geometry) => (geometry.arcs ?? []).flat(Infinity).map((i) => (i < 0 ? ~i : i));
  const uses = new Map();
  for (const i of geometries.flatMap(arcsOf)) uses.set(i, (uses.get(i) ?? 0) + 1);
  return geometries.map((geometry) => {
    const arcs = arcsOf(geometry).filter((i) => uses.get(i) === 1);
    return feature(topo, { type: 'MultiLineString', arcs: arcs.map((i) => [i]) }).geometry
      .coordinates;
  });
}

/** The places joined to each other by the edges of a graph, as lists of ids. */
function connectedGroups(ids, graphOf) {
  const seen = new Set();
  const groups = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const group = [id];
    // The group grows while it is walked: for-of keeps going until it is empty.
    for (const place of group) {
      for (const next of graphOf[place] ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        group.push(next);
      }
    }
    groups.push(group);
  }
  return groups;
}

/**
 * Sea crossings for the Trail game (rules in decisions.json, "trailCrossings"): an island (a small
 * group of places joined by land) is linked to every place within `maxKm` of its coast, or, when
 * there is none, to the nearest place outside its group (`guarantee`). An archipelago whose islands
 * only link to each other also gets one to the nearest place outside it. Two continental masses are
 * never linked. `from` and `to` are the [longitude, latitude] of the nearest points of both coasts.
 */
function seaCrossings(ids, coastById, borders, ownLand, rules) {
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const skip = new Set(rules.excluded.map((e) => key(e.a, e.b)));
  const parts = new Map(ids.map((id) => [id, (coastById.get(id) ?? []).map(dense)]));
  const known = new Map();
  const measure = (a, b) => {
    const pair = key(a, b);
    if (!known.has(pair)) {
      const [first, second] = pair.split('|');
      const { angle: best, from, to } = nearestPoints(parts.get(first), parts.get(second));
      // A place with no coast is at no distance by sea.
      const km = from ? Math.max(1, Math.round(best * EARTH_KM)) : Infinity;
      known.set(pair, { a: first, b: second, km, from, to });
    }
    return known.get(pair);
  };

  const optionsOf = (group) =>
    group.flatMap((a) =>
      ids
        .filter((b) => !group.includes(b) && !borders[a]?.includes(b) && !skip.has(key(a, b)))
        .map((b) => measure(a, b)),
    );

  const result = new Map();
  const add = (c) => result.set(key(c.a, c.b), c);
  const addNearest = (group) => {
    const nearest = optionsOf(group).reduce((best, c) => (c.km < best.km ? c : best));
    add({ ...nearest, guarantee: true });
  };

  const islandGroups = connectedGroups(ids, ownLand).filter(
    (group) => group.length <= rules.maxIslandGroup,
  );
  const islands = new Set(islandGroups.flat());
  for (const group of islandGroups) {
    const near = optionsOf(group).filter((c) => c.km <= rules.maxKm);
    near.forEach(add);
    if (!near.length) addNearest(group);
  }
  // Archipelagos: one link at a time, as each may join two of them.
  for (;;) {
    const linked = Object.fromEntries(ids.map((id) => [id, [...(borders[id] ?? [])]]));
    for (const { a, b } of result.values()) {
      linked[a].push(b);
      linked[b].push(a);
    }
    const loose = connectedGroups(ids, linked).find((group) =>
      group.every((id) => islands.has(id)),
    );
    if (!loose) break;
    addNearest(loose);
  }
  return [...result.keys()].sort().map((pair) => {
    const c = result.get(pair);
    return { ...c, from: lonLat(c.from), to: lonLat(c.to) };
  });
}

function addBorder(graphOf, a, b) {
  for (const [x, y] of [
    [a, b],
    [b, a],
  ]) {
    const list = (graphOf[x] ??= []);
    if (!list.includes(y)) list.push(y);
    list.sort();
  }
}

/**
 * Land borders for the Trail game, from the "territories off" graph. A border that exists only
 * through a territory is dropped unless that territory is on the same continent as the country
 * that administers it (Gibraltar stays; French Guiana and Saint-Martin do not).
 */
function trailGraph(core, territories, continentOf) {
  const administrator = new Map(territories.map((t) => [t.id, t.administeredBy]));
  const sameContinent = (id) => continentOf.get(id) === continentOf.get(administrator.get(id));
  const result = {};
  for (const [a, list] of Object.entries(core.neighbors)) {
    for (const b of list) {
      const via = core.via[a < b ? `${a}|${b}` : `${b}|${a}`];
      if (via && !via.some(sameContinent)) continue;
      (result[a] ??= []).push(b);
    }
  }
  return result;
}

/** A copy of the graph without the borders listed in `excluded` ({ a, b } pairs). */
function withoutBorders(graphOf, excluded) {
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const drop = new Set(excluded.map((e) => key(e.a, e.b)));
  const result = {};
  for (const [a, list] of Object.entries(graphOf)) {
    const kept = list.filter((b) => !drop.has(key(a, b)));
    if (kept.length) result[a] = kept;
  }
  return result;
}

/** Pairs closer than 10 km that are not neighbours: candidates for extraNeighbors in decisions.json. */
function closePairs(files, names, neighborsFile) {
  const graphs = {
    'proximity-world.json': neighborsFile.world.territoriesOff,
    'proximity-world-territories.json': neighborsFile.world.territoriesOn,
    'proximity-brazil.json': neighborsFile.brazil,
  };
  const seen = new Set();
  const lines = [];
  for (const [file, { ids, km }] of Object.entries(files)) {
    let k = 0;
    ids.forEach((a, i) => {
      for (let j = i + 1; j < ids.length; j++, k++) {
        const b = ids[j];
        if (km[k] === 0 || km[k] >= 10 || seen.has(`${a}|${b}`)) continue;
        if (graphs[file][a]?.includes(b)) continue;
        seen.add(`${a}|${b}`);
        lines.push(`${a} ${names.get(a)} – ${b} ${names.get(b)}: ≈ ${km[k]} km`);
      }
    });
  }
  return lines;
}

/**
 * Two places are neighbours when their shapes share a border (an arc of the topology), not just
 * a corner. `viaTerritories` also records, for each pair of countries, the territories that make
 * the border when the countries' own land does not touch.
 */
function graph(units, unitNeighbors, node, viaTerritories) {
  const edges = new Map(); // "A|B" -> { direct: boolean, via: Set }
  unitNeighbors.forEach((list, i) => {
    for (const j of list) {
      const a = node(units[i]);
      const b = node(units[j]);
      if (!a || !b || a === b) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const edge = edges.get(key) ?? { direct: false, via: new Set() };
      const own = (u) => !viaTerritories || !u.territory;
      if (own(units[i]) && own(units[j])) edge.direct = true;
      for (const u of [units[i], units[j]])
        if (viaTerritories && u.territory) edge.via.add(u.territory);
      edges.set(key, edge);
    }
  });
  const result = {};
  const via = {};
  for (const [key, edge] of [...edges].sort(([x], [y]) => (x < y ? -1 : 1))) {
    const [a, b] = key.split('|');
    (result[a] ??= []).push(b);
    (result[b] ??= []).push(a);
    if (!edge.direct && edge.via.size) via[key] = [...edge.via].sort();
  }
  for (const list of Object.values(result)) list.sort();
  return { neighbors: result, via };
}

/**
 * A place lying inside another (the Vatican in Italy) has no border arc of its own with it, only
 * the shape of one sits within the other. That counts as a border. Checked with the first point
 * of each of the place's polygons, so a place that merely touches never matches.
 */
function withEnclaves(shapes, unitNeighbors) {
  const result = unitNeighbors.map((list) => [...list]);
  const bounds = shapes.map((shape) => geoBounds(shape));
  const inBounds = ([[west, south], [east, north]], [lon, lat]) =>
    lat >= south &&
    lat <= north &&
    (west <= east ? lon >= west && lon <= east : lon >= west || lon <= east);
  shapes.forEach((inner, i) => {
    const polygons =
      inner.geometry.type === 'Polygon' ? [inner.geometry.coordinates] : inner.geometry.coordinates;
    const points = polygons.map((rings) => rings[0][0]);
    shapes.forEach((outer, j) => {
      if (i === j || result[i].includes(j)) return;
      if (points.every((point) => !inBounds(bounds[j], point) || !geoContains(outer, point)))
        return;
      result[i].push(j);
      result[j].push(i);
    });
  });
  return result;
}

function brazilNeighbors(topo, states) {
  const geometries = topo.objects.states.geometries;
  const result = {};
  neighbors(geometries).forEach((list, i) => {
    const id = geometries[i].id ?? geometries[i].properties?.id;
    result[id] = list.map((j) => geometries[j].id ?? geometries[j].properties?.id).sort();
  });
  for (const state of states) result[state.id] ??= [];
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => (a < b ? -1 : 1)));
}

function ringsOf(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat();
  return [];
}

const vector = ([lon, lat]) => {
  const cosLat = Math.cos(lat * RAD);
  return [cosLat * Math.cos(lon * RAD), cosLat * Math.sin(lon * RAD), Math.sin(lat * RAD)];
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angle = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot(a, b))));

/** A ring as 3D points on the sphere, filled in along the great circle every SPACING_KM. */
function dense(ring) {
  const points = [];
  for (let i = 1; i < ring.length; i++) {
    const a = vector(ring[i - 1]);
    const b = vector(ring[i]);
    const steps = Math.max(1, Math.ceil((angle(a, b) * EARTH_KM) / SPACING_KM));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const length = Math.hypot(...p) || 1;
      points.push([p[0] / length, p[1] / length, p[2] / length]);
    }
  }
  points.push(vector(ring.at(-1)));
  const sum = points.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);
  const length = Math.hypot(...sum) || 1;
  const center = [sum[0] / length, sum[1] / length, sum[2] / length];
  const radius = Math.max(...points.map((p) => angle(center, p)));
  return { points, center, radius };
}

const lonLat = ([x, y, z]) =>
  [Math.atan2(y, x) / RAD, Math.asin(z) / RAD].map((n) => Number(n.toFixed(POINT_DECIMALS)));

/** The nearest points of the edges of two places, the lines they are on and the angle (radians). */
function nearestPoints(partsA, partsB) {
  const pairs = [];
  for (const a of partsA) {
    for (const b of partsB) {
      pairs.push({ a, b, bound: Math.max(0, angle(a.center, b.center) - a.radius - b.radius) });
    }
  }
  pairs.sort((x, y) => x.bound - y.bound);
  let best = Infinity;
  let [from, to] = [null, null];
  let lines = [];
  for (const { a, b, bound } of pairs) {
    if (bound >= best) break; // the rest are all farther than what was already found
    for (const p of a.points) {
      for (const q of b.points) {
        const d = dot(p, q);
        // Compare by cosine first: the angle is only worked out for a new best.
        if (best === Infinity || d > Math.cos(best)) {
          best = angle(p, q);
          [from, to] = [p, q];
          lines = [a, b];
        }
      }
    }
  }
  return { angle: best, from, to, lines };
}

/** Shortest distance (km) between the edges of two places. */
const minDistance = (partsA, partsB) => nearestPoints(partsA, partsB).angle * EARTH_KM;

function bearing([lon1, lat1], [lon2, lat2]) {
  const dLon = (lon2 - lon1) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * RAD);
  const x =
    Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) -
    Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos(dLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/**
 * `km`: distance between the nearest edges, rounded to km, for every pair i < j in the order of
 * `ids` (row by row). Neighbours are exactly 0, anything else at least 1.
 * `dir[i][j]`: one hex digit, the compass sector (0 = N, 4 = E, 8 = S, c = W) from the centre
 * of place i towards the centre of place j; "." on the diagonal.
 */
function proximity(ids, ringsById, labelOf, neighborsOf) {
  const parts = new Map(
    ids.map((id) => {
      const rings = ringsById.get(id);
      if (!rings?.length) throw new Error(`Sem geometria para ${id}`);
      return [id, rings.map(dense)];
    }),
  );
  const km = [];
  const dir = [];
  ids.forEach((a, i) => {
    let row = '';
    ids.forEach((b, j) => {
      if (i === j) {
        row += '.';
        return;
      }
      const sector =
        Math.round(bearing(labelOf.get(a), labelOf.get(b)) / (360 / SECTORS)) % SECTORS;
      row += sector.toString(16);
      if (j <= i) return;
      const touching = neighborsOf[a]?.includes(b);
      km.push(touching ? 0 : Math.max(1, Math.round(minDistance(parts.get(a), parts.get(b)))));
    });
    dir.push(row);
  });
  return { ids, km, dir };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
  if (!existsSync(join(outDir, 'world.topo.json'))) throw new Error('Rode npm run data antes.');
  const decisionsFile = join(outDir, '..', '..', 'scripts', 'decisions.json');
  const { sizes, closePairs, crossings, guaranteed } = buildProximity(
    outDir,
    readJson(dirname(decisionsFile), 'decisions.json'),
  );
  for (const [name, size] of Object.entries(sizes))
    console.log(`${name}: ${Math.round(size / 1024)} KB`);
  console.log(
    `Travessias: ${crossings.off.length} (territórios desligados), ${crossings.on.length} (ligados).`,
  );
  console.log(`Só pela garantia:\n${guaranteed.join('\n')}`);
  console.log(`Pares a menos de 10 km que não são vizinhos:\n${closePairs.join('\n')}`);
}
