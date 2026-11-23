import { Injectable, signal } from '@angular/core';
import { PlayableContinent, isPlayableContinent } from '../../core/data/continent-frames';
import { Layer, LonLat } from '../../core/data/geo-data.models';
import { Crossing } from '../../core/data/proximity';
import { OutOfPlayKind } from '../../core/game/targets';
import type { MapBorders } from '../../core/settings.service';
import { readStore, writeStore } from '../../core/storage';

/**
 * How the Trail paints a place: origin and destination (`end`), a guess by its color, or an
 * outline shown by the hint (`hint`).
 */
export type TrailPaint = 'end' | 'near' | 'detour' | 'far' | 'hint';

/** A sea crossing of a trail, in the color of a guess. */
export interface SeaTrail {
  crossing: Crossing;
  paint: 'near' | 'detour' | 'far';
}

/** A numbered dot on a place of the trail shown at the end of the Trail (1 = the origin). */
export interface StepMark {
  /** Changes when the trail changes, so the numbers appear again, one after the other. */
  key: string;
  /** The place (target id). */
  id: string;
  n: number;
  /** The label point of the place and the shapes it is made of. */
  point: LonLat;
  unitIds: readonly string[];
  /** Area of the place (km²): where two tags overlap, the smaller place gives way. */
  area: number;
  /** Written in the tag, after the number. */
  name: string;
  /** Same color as the dot of the place in the timeline. */
  paint: TrailPaint;
  /** The number, the place and what it is, as text. */
  label: string;
}

/** A ring drawn on a place too small to see as a shape (Vatican, Tuvalu...). */
export interface MapMarker {
  id: string;
  point: LonLat;
  kind: 'found' | 'missed' | 'focus' | 'heat' | 'trail' | 'forbidden';
  /** Heat level (0-5) of a `heat` marker. */
  heat?: number;
  /** Paint of a `trail` marker. */
  trail?: TrailPaint;
}

/** A name written on the map over a found place. */
export interface MapLabel {
  id: string;
  point: LonLat;
  text: string;
  /** Zoom level (1 = whole world) from which the name is shown; small places need more zoom. */
  minZoom: number;
}

const NONE: ReadonlySet<string> = new Set();

function storedContinent(): PlayableContinent | null {
  const stored = readStore<string>('continent');
  return isPlayableContinent(stored) ? stored : null;
}

/**
 * What the map shows and what the user did on it. The map lives in the app shell (always on
 * screen), so pages talk to it through this service instead of through inputs and outputs.
 */
@Injectable({ providedIn: 'root' })
export class MapStateService {
  /** Which map is shown: the world or Brazil. Remembered, so the menu opens on the last one. */
  readonly layer = signal<Layer>(readStore<Layer>('layer') === 'brazil' ? 'brazil' : 'world');
  /** Continent chosen on the world map (null = whole world). Remembered like the layer. */
  readonly continent = signal<PlayableContinent | null>(storedContinent());
  /** When false, clicks on the map do nothing (e.g. on the home menu). */
  readonly selectable = signal(false);
  /** Feature id (unit id from world.topo.json) currently selected. */
  readonly selectedId = signal<string | null>(null);

  /** Shapes already found: filled, with a dark outline. */
  readonly found = signal<ReadonlySet<string>>(NONE);
  /** Shapes missed at the end of a game: solid terracotta, with a continuous outline. */
  readonly missed = signal<ReadonlySet<string>>(NONE);
  /** Shapes that just changed: briefly pulsing outline. */
  readonly pulse = signal<readonly string[]>([]);
  readonly markers = signal<readonly MapMarker[]>([]);
  /** The place a round is about (Neighbors): amber fill and a steady outline. */
  readonly focus = signal<ReadonlySet<string>>(NONE);
  /**
   * Land that is no target of the game being played (Antarctica, Kosovo...), by shape id and why:
   * it is painted apart, with a continuous outline. Empty outside games.
   */
  readonly outOfPlay = signal<ReadonlyMap<string, OutOfPlayKind>>(new Map());
  /** The last click on such an area (`n` tells repeats apart); the game answers with a card. */
  readonly outOfPlayClick = signal<{ id: string; n: number } | null>(null);
  private outOfPlayCount = 0;
  /** Shapes just clicked wrongly: briefly shown with a dashed outline. */
  readonly wrong = signal<readonly string[]>([]);
  /**
   * Invisible, larger click areas on tiny places (Vatican, Tuvalu...) so they can be hit with a
   * finger or mouse. Only places still to be found get one.
   */
  readonly hitAreas = signal<readonly MapMarker[]>([]);
  /** Shapes painted from hot (0, neighbour) to cold (5, far away): the Proximity guesses. */
  readonly heat = signal<ReadonlyMap<string, number>>(new Map());
  /** Trail: how each shape is painted (origin and destination, guesses, outline hints). */
  readonly trailPaint = signal<ReadonlyMap<string, TrailPaint>>(new Map());
  /** Trail, at the end: the numbered dots of the trail shown (the player's or a shortest one). */
  readonly steps = signal<readonly StepMark[]>([]);
  /**
   * Trail, at the end: the places (target and shape ids) that are only in the player's trail, and
   * whether they are faded, so that the map shows a shortest path alone.
   */
  readonly yoursOnly = signal<ReadonlySet<string>>(NONE);
  readonly yoursOnlyFaded = signal(false);
  /** Trail, at the end: the place the pointer or focus is on in the timeline. */
  readonly stepHover = signal<{ id: string; unitIds: readonly string[] } | null>(null);
  /** Trail: the sea crossings shown discreetly, and those the trails take. */
  readonly seaLines = signal<readonly Crossing[]>([]);
  readonly seaTrail = signal<readonly SeaTrail[]>([]);
  /**
   * Hidden map (Trail): only the water and the shapes the game paints are drawn. No other coast,
   * no borders, no highlight under the mouse, and hidden shapes cannot be clicked.
   */
  readonly hidden = signal(false);
  /**
   * 'coast' (typing games and Neighbors): the land is one piece with no borders inside, and only the
   * shapes the game paints stand out; the others can be neither highlighted nor clicked.
   */
  readonly borders = signal<MapBorders>('all');
  /** Every click on a place, even on the same one twice in a row (`n` tells them apart). */
  readonly lastClick = signal<{ id: string | null; n: number } | null>(null);
  private clickCount = 0;
  /** Shape under the mouse pointer (mouse only, not touch). */
  readonly hoveredId = signal<string | null>(null);
  readonly labels = signal<readonly MapLabel[]>([]);
  /** Current zoom level of the map (1 = whole world). */
  readonly zoom = signal(1);
  /** Mouse double click zooms in. Click games turn it off: two quick answers are not a zoom. */
  readonly doubleClickZoom = signal(true);

  /**
   * A request for the camera to fly to some places (shape ids); `n` tells repeats apart. `manual`
   * marks what the player asked for (a click on a list item): the "Off" camera setting only
   * stops the moves the game makes by itself.
   */
  readonly cameraRequest = signal<{ ids: readonly string[]; n: number; manual: boolean } | null>(
    null,
  );
  private cameraCount = 0;

  /** Asks the map to move smoothly until these shapes fill a comfortable part of the screen. */
  flyTo(ids: readonly string[], manual = false): void {
    if (ids.length > 0) this.cameraRequest.set({ ids, n: ++this.cameraCount, manual });
  }

  setLayer(layer: Layer): void {
    this.layer.set(layer);
    writeStore('layer', layer);
  }

  setContinent(continent: PlayableContinent | null): void {
    this.continent.set(continent);
    writeStore('continent', continent);
  }

  select(id: string | null): void {
    this.selectedId.set(id);
  }

  hover(id: string | null): void {
    this.hoveredId.set(id);
  }

  registerClick(id: string | null): void {
    this.lastClick.set({ id, n: ++this.clickCount });
  }

  /** A click on an area out of play: not an answer, so it is not a click of the game. */
  registerOutOfPlayClick(id: string): void {
    this.outOfPlayClick.set({ id, n: ++this.outOfPlayCount });
  }

  /** Clears everything a game drew on the map. */
  reset(): void {
    this.selectable.set(false);
    this.selectedId.set(null);
    this.found.set(NONE);
    this.missed.set(NONE);
    this.focus.set(NONE);
    this.heat.set(new Map());
    this.pulse.set([]);
    this.markers.set([]);
    this.wrong.set([]);
    this.hitAreas.set([]);
    this.outOfPlay.set(new Map());
    this.outOfPlayClick.set(null);
    this.lastClick.set(null);
    this.hoveredId.set(null);
    this.labels.set([]);
    this.doubleClickZoom.set(true);
    this.trailPaint.set(new Map());
    this.steps.set([]);
    this.yoursOnly.set(NONE);
    this.yoursOnlyFaded.set(false);
    this.stepHover.set(null);
    this.seaLines.set([]);
    this.seaTrail.set([]);
    this.hidden.set(false);
    this.borders.set('all');
    this.cameraRequest.set(null);
  }
}
