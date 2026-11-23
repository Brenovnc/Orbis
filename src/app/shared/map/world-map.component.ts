import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { geoGraticule } from 'd3-geo';
import { interpolateZoom } from 'd3-interpolate';
import { select } from 'd3-selection';
import { ZoomBehavior, ZoomTransform, zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import type { Feature, Geometry } from 'geojson';
import { feature, merge, mesh } from 'topojson-client';
import type { MultiPolygon, Polygon } from 'topojson-specification';
import { CONTINENT_FRAMES } from '../../core/data/continent-frames';
import { GeoDataService } from '../../core/data/geo-data.service';
import { Layer, WorldUnitProperties } from '../../core/data/geo-data.models';
import { buildWorldTargets, isOtherContinent } from '../../core/game/targets';
import { I18nService } from '../../core/i18n/i18n.service';
import { SettingsService } from '../../core/settings.service';
import { crossingLines } from './crossing-lines';
import { MapMarker, MapStateService, SeaTrail, TrailPaint } from './map-state.service';
import {
  Frame,
  SPHERE,
  dateLineSeams,
  frameOfMainParts,
  frameOfPlaces,
  mainParts,
  makeBrazilView,
  makeWorldView,
  markPoint,
  ringsOf,
  withoutSeams,
} from './map-view';

const TRAIL_PAINTS: TrailPaint[] = ['hint', 'far', 'detour', 'near', 'end'];

const SEA_PAINTS = ['far', 'detour', 'near'] as const;

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
/**
 * Smallest frame, in map units, the camera fits when it flies to a place: a smaller place is framed
 * as if it were this big, so it shows with its neighbours around. The units differ by map: the
 * world is 960 wide for the whole Earth (48 is about 2,000 km: Belgium shows with France, the
 * Netherlands and Germany), while Brazil's own 880 units span the country (150 is about 700 km:
 * Sergipe shows with Bahia, Alagoas and Pernambuco).
 */
const MIN_FOCUS_EXTENT: Record<Layer, number> = { world: 48, brazil: 150 };
/** Duration of a camera move that only centers (a zoom move gets its own from the path). */
const CENTER_MS = 700;
/** The numbers of the trail appear this far apart, but all within this time (ms). */
const STEP_GAP_MS = 90;
const STEP_TOTAL_MS = 1100;
/** The tag of a place of the trail: height, and width besides the name (px, fixed on screen). */
const TAG_HEIGHT = 22;
const TAG_PADDING = 36;
/** Where a tag may go to clear another one, in order: it stays, or moves down and up. */
const TAG_SHIFTS = [0, 24, -24, 48, -48];
const TAG_FONT = '600 11px';
let measuringContext: CanvasRenderingContext2D | null | undefined;

/** Width of a name in the tag's font, measured once the page's font is known. */
function textWidth(text: string): number {
  measuringContext ??= document.createElement('canvas').getContext('2d') ?? null;
  const family = getComputedStyle(document.body).getPropertyValue('--font-sans') || 'sans-serif';
  if (!measuringContext) return text.length * 6.5;
  measuringContext.font = `${TAG_FONT} ${family}`;
  return Math.ceil(measuringContext.measureText(text).width);
}
/** Least height under the bars at the top of the screen, in px. */
const TOP_INSET = 130;

interface Shape {
  id: string;
  /** Filled area. */
  d: string;
  /** Outline without the cut along 180° and the South Pole (see `withoutSeams`). */
  outline: string;
  neutral: boolean;
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
    const outside = new Set(targets.filter((t) => t.group !== continent).flatMap((t) => t.unitIds));
    // An area out of play that lies in another continent keeps the tone of what is outside.
    for (const id of this.state.outOfPlay().keys()) {
      if (isOtherContinent(this.geo.place(id), continent)) outside.add(id);
    }
    return outside;
  });

  /** Land that is part of no target (Antarctica, Kosovo...), but not already outside the region. */
  protected readonly outOfPlayIds = computed<ReadonlySet<string>>(() => {
    const outside = this.outsideIds();
    return new Set([...this.state.outOfPlay().keys()].filter((id) => !outside.has(id)));
  });

  /** Only the coast is drawn: the land in play is one shape, under those the game paints. */
  protected readonly coastOnly = computed(() => this.state.borders() === 'coast');
  private readonly mergedLand = computed(() => {
    const world = this.geo.world();
    const brazil = this.geo.brazil();
    if (!this.coastOnly() || !world) return null;
    if (this.state.layer() === 'brazil') {
      const states = brazil?.objects.states.geometries as Polygon[] | undefined;
      return brazil && states ? merge(brazil, states) : null;
    }
    const outside = this.outsideIds();
    const outOfPlay = this.outOfPlayIds();
    const inPlay = world.objects.units.geometries.filter((g) => {
      const { id } = g.properties as WorldUnitProperties;
      return !outside.has(id) && !outOfPlay.has(id);
    });
    return merge(world, inPlay as (Polygon | MultiPolygon)[]);
  });
  protected readonly mergedLandPath = computed(() => {
    const land = this.mergedLand();
    return land ? (this.view().path(land) ?? '') : '';
  });
  /** Stroking the whole merged land made the zoom slow: only the cut along 180° needs it. */
  protected readonly mergedSeamPath = computed(() => {
    const land = this.mergedLand();
    return land ? (this.view().path(dateLineSeams(ringsOf(land))) ?? '') : '';
  });

  protected readonly lakesPath = computed(() => {
    const world = this.geo.world();
    if (!world || this.state.layer() === 'brazil') return '';
    return this.view().path(feature(world, world.objects.lakes)) ?? '';
  });

  protected readonly bordersPath = computed(() => {
    const world = this.geo.world();
    if (!world || this.coastOnly()) return '';
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
      .filter((s) => this.state.found().has(s.id) && !this.state.yoursOnly().has(s.id))
      .map((s) => s.outline)
      .join(' '),
  );
  /** Trail, at the end: the outline of the places only in the player's trail, apart to fade it. */
  protected readonly yoursOnlyOutlines = computed(() =>
    this.shapes()
      .filter((s) => this.state.found().has(s.id) && this.state.yoursOnly().has(s.id))
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
  protected readonly outOfPlayOutlines = computed(() =>
    this.shapes()
      .filter((s) => this.outOfPlayIds().has(s.id))
      .map((s) => s.outline)
      .join(' '),
  );
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
  /** Screen pixels per map unit (see `updateUnit`), to tell when two tags overlap. */
  private readonly unitScale = signal(1);
  /**
   * Trail, at the end: the tags "1 Zâmbia", one after the other (the whole sequence takes about a
   * second, however long the trail). Each goes on the label point of its place, or on the center
   * of the main part when that point falls outside it. Where two tags overlap at the current zoom,
   * the one of the smaller place moves up or down, in a fixed order, until it is clear.
   */
  protected readonly stepMarks = computed(() => {
    const steps = this.state.steps();
    const projection = this.view().projection;
    const features = this.featureById();
    const gap = Math.min(STEP_GAP_MS, STEP_TOTAL_MS / steps.length);
    const pixels = this.state.zoom() * this.unitScale();
    const marks = steps.flatMap((step, i) => {
      const geometries = step.unitIds.flatMap((id) => features.get(id)?.geometry ?? []);
      const xy = projection(markPoint(geometries, step.point) as [number, number]);
      const width = TAG_PADDING + textWidth(step.name);
      return xy ? [{ ...step, x: xy[0], y: xy[1], width, dy: 0, delay: Math.round(i * gap) }] : [];
    });
    const placed: { x: number; y: number; width: number }[] = [];
    for (const mark of [...marks].sort((a, b) => b.area - a.area)) {
      const fits = (dy: number) =>
        placed.every(
          (other) =>
            Math.abs(other.x - mark.x) * pixels >= (other.width + mark.width) / 2 ||
            Math.abs(other.y - (mark.y + dy / pixels)) * pixels >= TAG_HEIGHT,
        );
      mark.dy = TAG_SHIFTS.find(fits) ?? 0;
      placed.push({ x: mark.x, y: mark.y + mark.dy / pixels, width: mark.width });
    }
    return marks;
  });
  /** Trail, at the end: the place under the pointer in the timeline, with a stronger outline. */
  protected readonly stepHoverShapes = computed(() => {
    const hover = this.state.stepHover();
    return hover ? this.shapes().filter((s) => hover.unitIds.includes(s.id)) : [];
  });
  /** Trail: every sea crossing shown discreetly, in a single path. */
  protected readonly seaPath = computed(
    () => this.view().path(crossingLines(this.state.seaLines())) ?? '',
  );
  /** Trail: the crossings the player's trail takes, one path per color. */
  protected readonly seaTrails = computed(() =>
    SEA_PAINTS.map((paint) => ({ paint, d: this.seaTrailPath(paint) })),
  );
  /** Shapes drawn on the hidden map, or over the merged land: everything the game paints. */
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
      if (request) untracked(() => this.flyToUnits(request.ids, request.manual));
    });

    // Switching projection (settings) or continent starts again from the initial view.
    effect(() => {
      this.view();
      this.state.continent();
      untracked(() => this.setUpView());
    });
  }

  private seaTrailPath(paint: SeaTrail['paint']): string {
    const taken = this.state.seaTrail().filter((sea) => sea.paint === paint);
    return this.view().path(crossingLines(taken.map((sea) => sea.crossing))) ?? '';
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
  private frameOf(ids: readonly string[]): Frame | null {
    const { path, continuous, width } = this.view();
    const frames = ids.flatMap((id) => {
      const geometry = this.featureById().get(id)?.geometry;
      const frame = geometry && frameOfMainParts(path, geometry);
      return frame ? [frame] : [];
    });
    return frameOfPlaces(frames, continuous ? width : null);
  }

  /**
   * Flies the camera to the places: smoothly, or in one jump when the user asks for less motion.
   * The camera setting decides how: zooming to frame them, only centering them, or (when the
   * game moves by itself) not at all. What the player asked for still zooms when it is off.
   */
  private flyToUnits(ids: readonly string[], manual: boolean): void {
    const camera = this.settings.value().camera;
    if (camera === 'off' && !manual) return;
    // One frame later, so panels that open together with the request are already in place.
    requestAnimationFrame(() => this.flyToFrame(ids, camera === 'center' ? 'center' : 'zoom'));
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

  /** Height at the top covered by the bar; taller in a game with choices. */
  private coveredTop(): number {
    const bar = document.querySelector('[data-map-cover-top]');
    return Math.max(TOP_INSET, bar?.getBoundingClientRect().bottom ?? 0);
  }

  private flyToFrame(ids: readonly string[], mode: 'zoom' | 'center'): void {
    const behavior = this.zoomBehavior;
    const frame = this.frameOf(ids);
    const rect = this.svg().nativeElement.getBoundingClientRect();
    if (!behavior || !frame || !rect.width || !rect.height) return;
    const { continuous, width: w, height: h } = this.view();
    const unit = Math.min(rect.width / w, rect.height / h);
    const [x0, y0, x1, y1] = frame;
    // The free part of the screen: under the bars at the top, above any panel at the bottom.
    const top = this.coveredTop();
    const freeHeight = Math.max(rect.height - top - this.coveredBottom(), rect.height / 4);
    // A small place is framed as if it were bigger (see MIN_FOCUS_EXTENT), so its surroundings show.
    const least = MIN_FOCUS_EXTENT[this.state.layer()];
    const fit = Math.min(
      rect.width / unit / Math.max(x1 - x0, least),
      freeHeight / unit / Math.max(y1 - y0, least),
    );
    const svg = select(this.svg().nativeElement);
    const from = zoomTransform(this.svg().nativeElement);
    // Centering keeps the zoom the map has now.
    const k = mode === 'center' ? from.k : Math.min(FOCUS_MAX_ZOOM, Math.max(1, FOCUS_FILL * fit));
    let cx = (x0 + x1) / 2;
    // On the repeating map, go to the copy of the place that is nearest to where the camera is.
    if (continuous) cx += w * Math.round(((w / 2 - from.x) / from.k - cx) / w);
    const cy = (y0 + y1) / 2;
    const down = (top + freeHeight / 2 - rect.height / 2) / unit;
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
    const [fromX, fromY, size] = center(from);
    const [toX, toY, toSize] = center(target);
    // Zooming follows the zoom-out-and-in path; centering is a plain slide at the same size.
    const zoomPath =
      mode === 'zoom' ? interpolateZoom([fromX, fromY, size], [toX, toY, toSize]) : null;
    const way = (p: number): [number, number, number] =>
      zoomPath ? zoomPath(p) : [fromX + (toX - fromX) * p, fromY + (toY - fromY) * p, size];
    const duration = zoomPath ? Math.min(1200, Math.max(500, zoomPath.duration)) : CENTER_MS;
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
        // Not `scale`: rounded, it can fall just short of 1 and hide every name.
        this.state.zoom.set(k);
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
    if (scale) {
      this.layer().nativeElement.style.setProperty('--unit', String(scale));
      this.unitScale.set(scale);
    }
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
    if (shape && this.outOfPlayIds().has(shape.id)) {
      // Not an answer: the game explains the area with a card.
      this.state.select(null);
      this.state.registerOutOfPlayClick(shape.id);
      return;
    }
    const hidden =
      shape && (this.state.hidden() || this.coastOnly()) && !this.shownIds().has(shape.id);
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
