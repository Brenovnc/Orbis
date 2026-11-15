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
  geoConicEqualArea,
  geoGraticule10,
  geoNaturalEarth1,
  geoPath,
} from 'd3-geo';
import { geoPatterson } from 'd3-geo-projection';
import { select } from 'd3-selection';
import { ZoomBehavior, ZoomTransform, zoom, zoomIdentity } from 'd3-zoom';
import type { Geometry, MultiLineString, Position } from 'geojson';
import { feature, mesh } from 'topojson-client';
import { BrazilTopology, GeoDataService } from '../../core/data/geo-data.service';
import { WorldUnitProperties } from '../../core/data/geo-data.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { MapProjection, SettingsService } from '../../core/settings.service';
import { MapMarker, MapStateService } from './map-state.service';

const WIDTH = 960;
const SPHERE = { type: 'Sphere' } as const;
const MAX_ZOOM = 80; // enough to see the Vatican
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
  protected readonly graticulePath = computed(() => this.view().path(geoGraticule10()) ?? '');
  protected readonly loading = computed(() => {
    const ready = this.geo.world() && (this.state.layer() === 'world' || this.geo.brazil());
    return !ready && !this.geo.error();
  });
  protected readonly error = this.geo.error;

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
  protected readonly foundShapes = computed(() =>
    this.shapes().filter((s) => this.state.found().has(s.id)),
  );
  protected readonly missedShapes = computed(() =>
    this.shapes().filter((s) => this.state.missed().has(s.id)),
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
        .on('zoom', (event) => this.applyTransform(event.transform))
        // Only at the end of a zoom or drag, so the labels are not recalculated all the time.
        .on('end', (event) => this.state.zoom.set(event.transform.k));
      select(this.svg().nativeElement).call(this.zoomBehavior);
      this.setUpView();
    });

    // Switching projection (settings) starts again from the initial view.
    effect(() => {
      this.view();
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

  /**
   * On a phone held upright the whole world is a thin strip, so the map opens zoomed in on
   * the Atlantic (the Americas, Europe and Africa). The "whole world" button zooms out.
   */
  private initialView(): ZoomTransform {
    const { width: w, height: h, projection } = this.view();
    const { width, height } = this.svg().nativeElement.getBoundingClientRect();
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
    const placeId = shape && !shape.neutral ? shape.id : null;
    this.state.select(placeId);
    this.state.registerClick(placeId);
  }

  protected zoomBy(factor: number): void {
    if (this.zoomBehavior) this.zoomBehavior.scaleBy(select(this.svg().nativeElement), factor);
  }

  protected resetZoom(): void {
    if (this.zoomBehavior) {
      this.zoomBehavior.transform(select(this.svg().nativeElement), zoomIdentity);
    }
  }
}
