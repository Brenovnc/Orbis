import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import {
  GeoProjection,
  geoArea,
  geoConicEqualArea,
  geoGraticule,
  geoNaturalEarth1,
  geoPath,
} from 'd3-geo';
import { geoPatterson } from 'd3-geo-projection';
import { interpolateZoom } from 'd3-interpolate';
import { select } from 'd3-selection';
import { ZoomBehavior, ZoomTransform, zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import type { Feature, Geometry, MultiLineString, Position } from 'geojson';
import { feature, mesh } from 'topojson-client';
import { CONTINENT_FRAMES } from '../../core/data/continent-frames';
import { BrazilTopology, GeoDataService } from '../../core/data/geo-data.service';
import { WorldUnitProperties } from '../../core/data/geo-data.models';
import { buildWorldTargets } from '../../core/game/targets';
import { I18nService } from '../../core/i18n/i18n.service';
import { MapProjection, SettingsService } from '../../core/settings.service';
import { MapMarker, MapStateService, TrailPaint } from './map-state.service';

const WIDTH = 960;
const TRAIL_PAINTS: TrailPaint[] = ['hint', 'far', 'detour', 'near', 'end'];
const SPHERE = { type: 'Sphere' } as const;

/**
 * Meridians and parallels every 10°. D3's default grid (geoGraticule10) stops most meridians at
 * 80°; here every one reaches the poles. The tiny offset keeps the parallels at 80°, not 90°
 * (the pole is a point, a "parallel" there would only repeat the edge of the map).
 */
const GRATICULE = geoGraticule()
  .extentMinor([
    [-180, -90 + 1e-6],
    [180, 90 - 1e-6],
  ])
  .step([10, 10])();
const MAX_ZOOM = 80; // enough to see the Vatican
/** Share of the screen a chosen continent fills (the rest is under the bars and the menu). */
const CONTINENT_FILL = 0.8;
/** Share of the free screen a place fills when the camera flies to it, and the zoom limit. */
const FOCUS_FILL = 0.5;
const FOCUS_MAX_ZOOM = 14;
/** Height under the bars at the top of the screen, in px. */
const TOP_INSET = 130;
/** A piece of a place counts for its frame only if it is at least this big next to the biggest. */
const MAIN_PART = 0.25;
/** How far (as a share of the map height) it can be dragged past its top and bottom edges. */
const VERTICAL_SLACK = 0.25;

interface MapView {
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
function makeWorldView(kind: MapProjection): MapView {
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
function makeBrazilView(brazil: BrazilTopology): MapView {
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

interface Shape {
  id: string;
  /** Filled area. */
  d: string;
  /** Outline without the cut along 180° and the South Pole (see `withoutSeams`). */
  outline: string;
  neutral: boolean;
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
function withoutSeams(lines: Position[][]): MultiLineString {
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

function ringsOf(geometry: Geometry): Position[][] {
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
function mainParts(geometry: Geometry): Geometry[] {
  const polygons: Geometry[] =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates.map((coordinates) => ({ type: 'Polygon', coordinates }))
      : [geometry];
  const areas = polygons.map((g) => geoArea({ type: 'Feature', properties: {}, geometry: g }));
  const biggest = Math.max(...areas);
  return polygons.filter((_, i) => areas[i] >= biggest * MAIN_PART);
}

/** Group used for borders: with territories off, a territory belongs to its country. */
const borderKey = (p: WorldUnitProperties) => p.country ?? p.id;
/** On the Brazil map the states replace Brazil's own shape, so its border and coast are left out. */
const isBrazil = (g: { properties?: unknown }) =>
  borderKey(g.properties as WorldUnitProperties) === 'BRA';

@Component({
  selector: 'app-world-map',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:resize)': 'updateUnit()' },
  templateUrl: './world-map.component.html',
  styleUrl: './world-map.component.css',
})
export class WorldMapComponent {
  private readonly geo = inject(GeoDataService);
  protected readonly settings = inject(SettingsService);
  protected readonly i18n = inject(I18nService);
  protected readonly state = inject(MapStateService);

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly layer = viewChild.required<ElementRef<SVGGElement>>('layer');
  private zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;
  /** Frame id of the camera flight in progress (see `flyToUnits`). */
  private flight: number | null = null;

  protected readonly view = computed(() => {
    const brazil = this.geo.brazil();
    // While Brazil's files load the world view stands in (the loading message covers the map).
    return this.state.layer() === 'brazil' && brazil
      ? makeBrazilView(brazil)
      : makeWorldView(this.settings.value().mapProjection);
  });
  protected readonly viewBox = computed(() => `0 0 ${this.view().width} ${this.view().height}`);
  /** Copies of the world side by side; three cover any screen once the drag is wrapped. */
  protected readonly copies = computed(() => {
    const { continuous, width } = this.view();
    return continuous ? [-width, 0, width] : [0];
  });
  protected readonly spherePath = computed(() => this.view().path(SPHERE) ?? '');
  protected readonly graticulePath = computed(() => this.view().path(GRATICULE) ?? '');
  protected readonly loading = computed(() => {
    const ready = this.geo.world() && (this.state.layer() === 'world' || this.geo.brazil());
    return !ready && !this.geo.error();
  });
  protected readonly error = this.geo.error;
  /** The reset button goes back to the chosen continent, or to the whole world. */
  protected readonly resetLabel = computed(() =>
    this.i18n.t(
      this.state.layer() === 'world' && this.state.continent() ? 'map.resetContinent' : 'map.reset',
    ),
  );

  protected readonly shapes = computed<Shape[]>(() => {
    const world = this.geo.world();
    const brazil = this.geo.brazil();
    const path = this.view().path;
    const brazilMap = this.state.layer() === 'brazil';
    const worldShapes: Shape[] = world
      ? feature(world, world.objects.units).features.map((f) => ({
          id: f.properties.id,
          d: path(f) ?? '',
          // Only shapes that are part of the game need an outline of their own.
          outline: brazilMap ? '' : (path(withoutSeams(ringsOf(f.geometry))) ?? ''),
          // On the Brazil map the rest of the world is only context, and Brazil's own shape
          // stays underneath its states so no gap shows between them.
          neutral: brazilMap || (!f.properties.country && !f.properties.territory),
        }))
      : [];
    if (!brazilMap || !brazil) return worldShapes;
    const stateShapes: Shape[] = feature(brazil, brazil.objects.states).features.map((f) => ({
      id: f.properties.id,
      d: path(f) ?? '',
      outline: path(withoutSeams(ringsOf(f.geometry))) ?? '',
      neutral: false,
    }));
    return [...worldShapes, ...stateShapes];
  });

  /**
   * Land that is not part of the game right now, shown in a much duller tone: the countries
   * outside the chosen continent, or on the Brazil map every country but Brazil's own shape.
   * It can be neither clicked nor highlighted.
   */
  protected readonly outsideIds = computed<ReadonlySet<string>>(() => {
    const world = this.geo.world();
    if (!world) return new Set();
    const units = world.objects.units.geometries.map((g) => g.properties as WorldUnitProperties);
    if (this.state.layer() === 'brazil') {
      return new Set(units.filter((u) => borderKey(u) !== 'BRA').map((u) => u.id));
    }
    const continent = this.state.continent();
    if (!continent) return new Set();
    const targets = buildWorldTargets(
      this.geo.countries(),
      this.geo.territories(),
      units,
      this.settings.value().includeTerritories,
    );
    return new Set(targets.filter((t) => t.group !== continent).flatMap((t) => t.unitIds));
  });

  protected readonly lakesPath = computed(() => {
    const world = this.geo.world();
    if (!world || this.state.layer() === 'brazil') return '';
    return this.view().path(feature(world, world.objects.lakes)) ?? '';
  });

  protected readonly bordersPath = computed(() => {
    const world = this.geo.world();
    if (!world) return '';
    const brazilMap = this.state.layer() === 'brazil';
    const borders = mesh(world, world.objects.units, (a, b) => {
      const keyA = borderKey(a.properties as WorldUnitProperties);
      const different = a !== b && keyA !== borderKey(b.properties as WorldUnitProperties);
      return different && !(brazilMap && (isBrazil(a) || isBrazil(b)));
    });
    const path = this.view().path;
    const brazil = this.geo.brazil();
    if (!brazilMap || !brazil) return path(borders) ?? '';
    const stateBorders = mesh(brazil, brazil.objects.states, (a, b) => a !== b);
    return `${path(borders) ?? ''} ${path(stateBorders) ?? ''}`;
  });

  protected readonly coastPath = computed(() => {
    const world = this.geo.world();
    if (!world) return '';
    const brazilMap = this.state.layer() === 'brazil';
    // Coast = arcs on the edge of one shape only; the cut along 180° is not a coast.
    const coast = mesh(world, world.objects.units, (a, b) => {
      return a === b && !(brazilMap && isBrazil(a));
    });
    const path = this.view().path;
    const brazil = this.geo.brazil();
    if (!brazilMap || !brazil) return path(withoutSeams(ringsOf(coast))) ?? '';
    // Brazil's outline (coast and land borders) comes from the states, so it matches them.
    const outline = mesh(brazil, brazil.objects.states, (a, b) => a === b);
    return `${path(withoutSeams(ringsOf(coast))) ?? ''} ${path(outline) ?? ''}`;
  });

  protected readonly selectedShape = computed(() => {
    const id = this.state.selectedId();
    return id ? this.shapes().find((s) => s.id === id) : undefined;
  });

  // Outlines drawn on top of the borders so they are never hidden by neighbours.
  protected readonly foundOutlines = computed(() =>
    this.shapes()
      .filter((s) => this.state.found().has(s.id))
      .map((s) => s.outline)
      .join(' '),
  );
  /**
   * Every guessed place in the Proximity game gets a solid outline, whatever its color, but only
   * around its main part: islands and distant territories stay painted, with no outline.
   */
  protected readonly heatOutlines = computed(() => {
    const path = this.view().path;
    const features = this.featureById();
    return [...this.state.heat().keys()]
      .flatMap((id) => {
        const geometry = features.get(id)?.geometry;
        if (!geometry) return [];
        const rings = mainParts(geometry).flatMap(ringsOf);
        return path(withoutSeams(rings)) ?? [];
      })
      .join(' ');
  });
  protected readonly missedOutlines = computed(() =>
    this.shapes()
      .filter((s) => this.state.missed().has(s.id))
      .map((s) => s.outline)
      .join(' '),
  );
  /** Trail: one outline path per paint (origin and destination, each guess color, hints). */
  protected readonly trailOutlines = computed(() => {
    const paint = this.state.trailPaint();
    const byPaint: Record<TrailPaint, string[]> = {
      end: [],
      near: [],
      detour: [],
      far: [],
      hint: [],
    };
    for (const shape of this.shapes()) {
      const kind = paint.get(shape.id);
      if (kind) byPaint[kind].push(shape.outline);
    }
    return TRAIL_PAINTS.map((kind) => ({ kind, d: byPaint[kind].join(' ') }));
  });
  protected readonly routeOutline = computed(() =>
    this.shapes()
      .filter((s) => this.state.route().has(s.id))
      .map((s) => s.outline)
      .join(' '),
  );
  /** Shapes drawn on the hidden map: everything the game paints. */
  protected readonly shownIds = computed<ReadonlySet<string>>(
    () =>
      new Set([
        ...this.state.trailPaint().keys(),
        ...this.state.found(),
        ...this.state.missed(),
        ...this.state.focus(),
      ]),
  );
  protected readonly focusShapes = computed(() =>
    this.shapes().filter((s) => this.state.focus().has(s.id)),
  );
  protected readonly pulseShapes = computed(() =>
    this.shapes().filter((s) => this.state.pulse().includes(s.id)),
  );
  protected readonly wrongShapes = computed(() =>
    this.shapes().filter((s) => this.state.wrong().includes(s.id)),
  );
  /** Names of found places; the small ones only appear once the map is zoomed in enough. */
  protected readonly labels = computed(() => {
    const zoom = this.state.zoom();
    const visible = this.state.labels().filter((label) => zoom >= label.minZoom);
    const projection = this.view().projection;
    return visible.flatMap((label) => {
      const xy = projection(label.point);
      return xy ? [{ id: label.id, text: label.text, x: xy[0], y: xy[1] }] : [];
    });
  });
  protected readonly markers = computed(() => this.project(this.state.markers()));
  protected readonly hitAreas = computed(() => this.project(this.state.hitAreas()));

  constructor() {
    void this.geo.loadWorld();
    effect(() => {
      if (this.state.layer() === 'brazil') void this.geo.loadBrazil();
    });

    afterNextRender(() => {
      this.zoomBehavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent([1, MAX_ZOOM])
        // A small finger movement during a tap still counts as a click, not a drag.
        .clickDistance(6)
        // Only the mouse's "dblclick" is filtered: the double tap on a touch screen reaches the
        // zoom through its touch events, so it keeps working.
        .filter(
          (event: Event) =>
            !(event.type === 'dblclick' && !this.state.doubleClickZoom()) &&
            (!(event as MouseEvent).ctrlKey || event.type === 'wheel') &&
            !(event as MouseEvent).button,
        )
        // The user taking the map in hand (drag, wheel, pinch) stops a flight.
        .on('start', (event) => event.sourceEvent && this.stopFlight())
        .on('zoom', (event) => this.applyTransform(event.transform))
        // Only at the end of a zoom or drag, so the labels are not recalculated all the time.
        .on('end', (event) => {
          if (this.flight === null) this.state.zoom.set(event.transform.k);
        });
      select(this.svg().nativeElement).call(this.zoomBehavior);
      this.setUpView();
    });

    // The games ask the camera to go to a place (a revealed answer, a new round, a list click).
    effect(() => {
      const request = this.state.cameraRequest();
      if (request) untracked(() => this.flyToUnits(request.ids));
    });

    // Switching projection (settings) or continent starts again from the initial view.
    effect(() => {
      this.view();
      this.state.continent();
      untracked(() => this.setUpView());
    });
  }

  private setUpView(): void {
    if (!this.zoomBehavior) return;
    const { continuous, width, height, slack } = this.view();
    // Room around the map, so Greenland or Antarctica can be dragged clear of the bars; no side
    // limits at all when the map repeats.
    this.zoomBehavior.translateExtent([
      [continuous ? -Infinity : -width * slack.x, -height * slack.y],
      [continuous ? Infinity : width * (1 + slack.x), height * (1 + slack.y)],
    ]);
    this.zoomBehavior.transform(select(this.svg().nativeElement), this.initialView());
  }

  /** Draws the zoom/drag. In the continuous map the sideways offset wraps around one world width. */
  private applyTransform(transform: ZoomTransform): void {
    const { continuous, width } = this.view();
    const { k, y } = transform;
    let x = transform.x;
    if (continuous) x -= k * width * Math.round(x / (k * width));
    const layer = this.layer().nativeElement;
    layer.setAttribute('transform', `translate(${x},${y}) scale(${k})`);
    // Lets markers and click areas keep the same size on screen at any zoom (see the CSS).
    layer.style.setProperty('--k', String(k));
    this.updateUnit();
  }

  /** Shapes by id, to measure the places the camera flies to. */
  private readonly featureById = computed(() => {
    const map = new Map<string, Feature<Geometry>>();
    const world = this.geo.world();
    const brazil = this.geo.brazil();
    if (this.state.layer() === 'brazil' && brazil) {
      for (const f of feature(brazil, brazil.objects.states).features) map.set(f.properties.id, f);
    } else if (world) {
      for (const f of feature(world, world.objects.units).features) map.set(f.properties.id, f);
    }
    return map;
  });

  /**
   * Frame (in map units) of the main part of the places: the pieces much smaller than the biggest
   * one (Alaska, Chukotka, Guiana, far islands) are left out, so a country is framed as it looks.
   */
  private frameOf(ids: readonly string[]): [number, number, number, number] | null {
    const path = this.view().path;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const id of ids) {
      const shape = this.featureById().get(id);
      if (!shape) continue;
      for (const g of mainParts(shape.geometry)) {
        const [[ax, ay], [bx, by]] = path.bounds({ type: 'Feature', properties: {}, geometry: g });
        if (![ax, ay, bx, by].every(Number.isFinite)) continue;
        [x0, y0, x1, y1] = [Math.min(x0, ax), Math.min(y0, ay), Math.max(x1, bx), Math.max(y1, by)];
      }
    }
    return x0 <= x1 ? [x0, y0, x1, y1] : null;
  }

  /** Flies the camera to the places: smoothly, or in one jump when the user asks for less motion. */
  private flyToUnits(ids: readonly string[]): void {
    // One frame later, so panels that open together with the request are already in place.
    requestAnimationFrame(() => this.flyToFrame(ids));
  }

  /** Height at the bottom covered by a full-width panel (end screen, info card, list on phones). */
  private coveredBottom(): number {
    let covered = 0;
    for (const element of document.querySelectorAll('[data-map-cover]')) {
      const box = element.getBoundingClientRect();
      if (box.width >= innerWidth * 0.9) covered = Math.max(covered, innerHeight - box.top);
    }
    return covered;
  }

  private flyToFrame(ids: readonly string[]): void {
    const behavior = this.zoomBehavior;
    const frame = this.frameOf(ids);
    const rect = this.svg().nativeElement.getBoundingClientRect();
    if (!behavior || !frame || !rect.width || !rect.height) return;
    const { continuous, width: w, height: h } = this.view();
    const unit = Math.min(rect.width / w, rect.height / h);
    const [x0, y0, x1, y1] = frame;
    // The free part of the screen: under the bars at the top, above any panel at the bottom.
    const freeHeight = Math.max(rect.height - TOP_INSET - this.coveredBottom(), rect.height / 4);
    const fit = Math.min(
      rect.width / unit / Math.max(x1 - x0, 1),
      freeHeight / unit / Math.max(y1 - y0, 1),
    );
    const k = Math.min(FOCUS_MAX_ZOOM, Math.max(1, FOCUS_FILL * fit));
    const svg = select(this.svg().nativeElement);
    const from = zoomTransform(this.svg().nativeElement);
    let cx = (x0 + x1) / 2;
    // On the repeating map, go to the copy of the place that is nearest to where the camera is.
    if (continuous) cx += w * Math.round(((w / 2 - from.x) / from.k - cx) / w);
    const cy = (y0 + y1) / 2;
    const down = (TOP_INSET + freeHeight / 2 - rect.height / 2) / unit;
    const target = zoomIdentity.translate(w / 2 - k * cx, h / 2 + down - k * cy).scale(k);

    this.stopFlight();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      behavior.transform(svg, target);
      this.state.zoom.set(k);
      return;
    }
    const center = (t: ZoomTransform): [number, number, number] => [
      (w / 2 - t.x) / t.k,
      (h / 2 - t.y) / t.k,
      w / t.k,
    ];
    const way = interpolateZoom(center(from), center(target));
    const duration = Math.min(1200, Math.max(500, way.duration));
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // Ease in and out.
      const eased = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
      const [x, y, size] = way(eased);
      const scale = w / size;
      const frameTransform = zoomIdentity.translate(w / 2 - scale * x, h / 2 - scale * y);
      behavior.transform(svg, frameTransform.scale(scale));
      if (p < 1) {
        this.flight = requestAnimationFrame(step);
      } else {
        this.flight = null;
        this.state.zoom.set(scale);
      }
    };
    this.flight = requestAnimationFrame(step);
  }

  private stopFlight(): void {
    if (this.flight !== null) cancelAnimationFrame(this.flight);
    this.flight = null;
  }

  /** The camera on the chosen continent, or null when the whole world is shown. */
  private continentView(): ZoomTransform | null {
    const continent = this.state.layer() === 'world' ? this.state.continent() : null;
    const { width, height } = this.svg().nativeElement.getBoundingClientRect();
    if (!continent || !width || !height) return null;
    const { continuous, width: w, height: h, projection } = this.view();
    const [west, south, east, north] = CONTINENT_FRAMES[continent];
    // Patterson's x grows with longitude, so a window past 180° (Oceania) continues on the next
    // copy of the map. The rounded map is drawn once and stops at 180°.
    const lastLon = continuous ? east : Math.min(east, 180);
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const lon = west + ((lastLon - west) * i) / 4;
        const xy = projection([lon, south + ((north - south) * j) / 4]);
        if (!xy) continue;
        const x = xy[0] + (lon > 180 ? w : 0);
        [x0, y0, x1, y1] = [
          Math.min(x0, x),
          Math.min(y0, xy[1]),
          Math.max(x1, x),
          Math.max(y1, xy[1]),
        ];
      }
    }
    // Part of the screen is under the bars and panels, so the window fills only most of it.
    const unit = Math.min(width / w, height / h);
    const k = CONTINENT_FILL * Math.min(width / unit / (x1 - x0), height / unit / (y1 - y0));
    const zoom = Math.min(MAX_ZOOM, Math.max(1, k));
    return zoomIdentity
      .translate(w / 2 - (zoom * (x0 + x1)) / 2, h / 2 - (zoom * (y0 + y1)) / 2)
      .scale(zoom);
  }

  /**
   * On a phone held upright the whole world is a thin strip, so the map opens zoomed in on
   * the Atlantic (the Americas, Europe and Africa). The "whole world" button zooms out.
   */
  private initialView(): ZoomTransform {
    const { width: w, height: h, projection } = this.view();
    const { width, height } = this.svg().nativeElement.getBoundingClientRect();
    const continent = this.continentView();
    if (continent) return continent;
    if (!width || !height || this.state.layer() === 'brazil') return zoomIdentity;
    const tallness = (height / width) * (w / h);
    if (tallness < 1.4) return zoomIdentity;
    const k = Math.min(tallness * 0.65, 2.6);
    const [x, y] = projection([-15, 12])!;
    return zoomIdentity.translate(w / 2 - k * x, h / 2 - k * y).scale(k);
  }

  /** Adds map coordinates to markers given in longitude/latitude. */
  private project(markers: readonly MapMarker[]) {
    const projection = this.view().projection;
    return markers.flatMap((marker) => {
      const xy = projection(marker.point);
      return xy ? [{ ...marker, x: xy[0], y: xy[1] }] : [];
    });
  }

  /** Screen pixels per map unit, so click areas can keep a finger-sized size on any screen. */
  protected updateUnit(): void {
    // Worked out from the view, not read from the SVG: when the map changes (world → Brazil) the
    // SVG still has the old viewBox until Angular updates it.
    const { width, height } = this.view();
    const rect = this.svg().nativeElement.getBoundingClientRect();
    const scale = Math.min(rect.width / width, rect.height / height);
    if (scale) this.layer().nativeElement.style.setProperty('--unit', String(scale));
  }

  /** Tells the game which place the mouse rests on (to reopen its info card). Mouse only. */
  protected onPointerOver(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const id = (event.target as Element).closest('[data-id]')?.getAttribute('data-id') ?? null;
    this.state.hover(id);
  }

  protected onClick(event: MouseEvent): void {
    if (!this.state.selectable()) return;
    const target = (event.target as Element).closest('[data-id]');
    const id = target?.getAttribute('data-id') ?? null;
    const shape = id ? this.shapes().find((s) => s.id === id) : undefined;
    const hidden = shape && this.state.hidden() && !this.shownIds().has(shape.id);
    const placeId =
      shape && !shape.neutral && !hidden && !this.outsideIds().has(shape.id) ? shape.id : null;
    this.state.select(placeId);
    this.state.registerClick(placeId);
  }

  protected zoomBy(factor: number): void {
    if (this.zoomBehavior) this.zoomBehavior.scaleBy(select(this.svg().nativeElement), factor);
  }

  protected resetZoom(): void {
    if (this.zoomBehavior) {
      this.zoomBehavior.transform(
        select(this.svg().nativeElement),
        this.continentView() ?? zoomIdentity,
      );
    }
  }
}
