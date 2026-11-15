import { Injectable, signal } from '@angular/core';
import { Layer, LonLat } from '../../core/data/geo-data.models';
import { readStore, writeStore } from '../../core/storage';

/** A ring drawn on a place too small to see as a shape (Vatican, Tuvalu...). */
export interface MapMarker {
  id: string;
  point: LonLat;
  kind: 'found' | 'missed';
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

/**
 * What the map shows and what the user did on it. The map lives in the app shell (always on
 * screen), so pages talk to it through this service instead of through inputs and outputs.
 */
@Injectable({ providedIn: 'root' })
export class MapStateService {
  /** Which map is shown: the world or Brazil. Remembered, so the menu opens on the last one. */
  readonly layer = signal<Layer>(readStore<Layer>('layer') === 'brazil' ? 'brazil' : 'world');
  /** When false, clicks on the map do nothing (e.g. on the home menu). */
  readonly selectable = signal(false);
  /** Feature id (unit id from world.topo.json) currently selected. */
  readonly selectedId = signal<string | null>(null);

  /** Shapes already found: filled, with a dark outline. */
  readonly found = signal<ReadonlySet<string>>(NONE);
  /** Shapes missed at the end of a game: hatched, with a dashed outline. */
  readonly missed = signal<ReadonlySet<string>>(NONE);
  /** Shapes that just changed: briefly pulsing outline. */
  readonly pulse = signal<readonly string[]>([]);
  readonly markers = signal<readonly MapMarker[]>([]);
  /** Shapes just clicked wrongly: briefly shown with a dashed outline. */
  readonly wrong = signal<readonly string[]>([]);
  /**
   * Invisible, larger click areas on tiny places (Vatican, Tuvalu...) so they can be hit with a
   * finger or mouse. Only places still to be found get one.
   */
  readonly hitAreas = signal<readonly MapMarker[]>([]);
  /** Every click on a place, even on the same one twice in a row (`n` tells them apart). */
  readonly lastClick = signal<{ id: string | null; n: number } | null>(null);
  private clickCount = 0;
  /** Shape under the mouse pointer (mouse only, not touch). */
  readonly hoveredId = signal<string | null>(null);
  readonly labels = signal<readonly MapLabel[]>([]);
  /** Current zoom level of the map (1 = whole world). */
  readonly zoom = signal(1);

  setLayer(layer: Layer): void {
    this.layer.set(layer);
    writeStore('layer', layer);
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

  /** Clears everything a game drew on the map. */
  reset(): void {
    this.selectable.set(false);
    this.selectedId.set(null);
    this.found.set(NONE);
    this.missed.set(NONE);
    this.pulse.set([]);
    this.markers.set([]);
    this.wrong.set([]);
    this.hitAreas.set([]);
    this.lastClick.set(null);
    this.hoveredId.set(null);
    this.labels.set([]);
  }
}
