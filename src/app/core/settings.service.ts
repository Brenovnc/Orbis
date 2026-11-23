import { Injectable, signal } from '@angular/core';
import { Lang, Layer } from './data/geo-data.models';
import { readStore, writeStore } from './storage';

/** continuous = rectangular map that repeats sideways; natural-earth = classic rounded map. */
export type MapProjection = 'continuous' | 'natural-earth';

/** Trail: easy shows the map; normal hides it; hard also gives fewer guesses. */
export type TrailLevel = 'easy' | 'normal' | 'hard';

/** Trail: places the trail may not cross (sometimes = 1 in about a third of the games; always = 1 to 3). */
export type TrailForbidden = 'none' | 'sometimes' | 'always';

/**
 * Silhouettes: choices = pick one of 4 names, with the surroundings drawn; hints = type the name,
 * with the continent shown and optional hints; typing = type the name from the outline alone.
 */
export type SilhouetteMode = 'choices' | 'hints' | 'typing';

/** Borders on the map (typing games and Neighbors): coast = the land in one piece, only its coast. */
export type MapBorders = 'all' | 'coast';

/** What a Proximity guess tells, besides its color on the map. */
export type ProximityClues = 'distance-direction' | 'distance' | 'color';

/** Time limits in minutes. The typing games have their own (see `durationOf`). */
export type Durations = Record<'typing' | 'others', Record<Layer, number>>;

/**
 * What the camera does when a game takes it to a place: zoom = frames it (never closer than a
 * minimum), center = moves to it keeping the zoom, off = stays where it is.
 */
export type CameraMode = 'zoom' | 'center' | 'off';

export interface Settings {
  language: Lang;
  mapProjection: MapProjection;
  camera: CameraMode;
  sounds: boolean;
  timerEnabled: boolean;
  durationMinutes: Durations;
  includeTerritories: boolean;
  /** Typo tolerance when pressing Enter: 0 = off, 1 = normal, 2 = generous. */
  typoTolerance: 0 | 1 | 2;
  infoBox: boolean;
  /** After a wrong click, show the name and facts of the place that was clicked. */
  learnMode: boolean;
  /**
   * Attempts per question in click games and Silhouettes (1, 2, 3 or 5): after this many wrong
   * answers the answer is revealed. The name is kept so saved settings and games still load.
   */
  revealAfterErrors: number;
  /** Highlight the place under the mouse. */
  hoverHighlight: boolean;
  /** Write the name of found places on the map. */
  showNames: boolean;
  trailLevel: TrailLevel;
  trailForbidden: TrailForbidden;
  /** The Trail also crosses the sea between islands and the continent (world map only). */
  trailCrossings: boolean;
  silhouetteMode: SilhouetteMode;
  mapBorders: MapBorders;
  proximityClues: ProximityClues;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'pt',
  mapProjection: 'continuous',
  camera: 'zoom',
  sounds: false,
  timerEnabled: true,
  durationMinutes: { typing: { world: 15, brazil: 5 }, others: { world: 15, brazil: 5 } },
  includeTerritories: false,
  typoTolerance: 1,
  infoBox: true,
  learnMode: true,
  revealAfterErrors: 3,
  hoverHighlight: true,
  showNames: false,
  trailLevel: 'normal',
  trailForbidden: 'sometimes',
  trailCrossings: false,
  silhouetteMode: 'hints',
  mapBorders: 'all',
  proximityClues: 'distance',
};

export type Preset = 'easy' | 'normal' | 'hard';

/**
 * The options a difficulty level sets. Language, map, camera, sounds, territories and the
 * Trail's sea crossings are left alone.
 */
export type PresetValues = Pick<
  Settings,
  | 'timerEnabled'
  | 'durationMinutes'
  | 'typoTolerance'
  | 'infoBox'
  | 'learnMode'
  | 'revealAfterErrors'
  | 'hoverHighlight'
  | 'showNames'
  | 'trailLevel'
  | 'trailForbidden'
  | 'silhouetteMode'
  | 'mapBorders'
  | 'proximityClues'
>;

export const PRESETS: Record<Preset, PresetValues> = {
  easy: {
    timerEnabled: false,
    durationMinutes: { typing: { world: 15, brazil: 5 }, others: { world: 15, brazil: 5 } },
    typoTolerance: 2,
    infoBox: true,
    learnMode: true,
    revealAfterErrors: 3,
    hoverHighlight: true,
    showNames: true,
    trailLevel: 'easy',
    trailForbidden: 'none',
    silhouetteMode: 'choices',
    mapBorders: 'all',
    proximityClues: 'distance-direction',
  },
  normal: {
    timerEnabled: true,
    durationMinutes: { typing: { world: 15, brazil: 5 }, others: { world: 15, brazil: 5 } },
    typoTolerance: 1,
    infoBox: true,
    learnMode: true,
    revealAfterErrors: 3,
    hoverHighlight: true,
    showNames: false,
    trailLevel: 'normal',
    trailForbidden: 'sometimes',
    silhouetteMode: 'hints',
    mapBorders: 'all',
    proximityClues: 'distance',
  },
  hard: {
    timerEnabled: true,
    // Typing is harder because of the map and the exact spelling, not of the time.
    durationMinutes: { typing: { world: 15, brazil: 5 }, others: { world: 10, brazil: 3 } },
    typoTolerance: 0,
    infoBox: false,
    learnMode: false,
    revealAfterErrors: 1,
    hoverHighlight: false,
    showNames: false,
    trailLevel: 'hard',
    trailForbidden: 'always',
    silhouetteMode: 'typing',
    mapBorders: 'coast',
    proximityClues: 'color',
  },
};

const KEY = 'settings';

/** Settings kept only in this browser. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly value = signal<Settings>(load());

  update(patch: Partial<Settings>): void {
    this.value.update((current) => ({ ...current, ...patch }));
    writeStore(KEY, this.value());
  }

  applyPreset(preset: Preset): void {
    this.update(structuredClone(PRESETS[preset]));
  }
}

function load(): Settings {
  const stored = readStore<Partial<Settings>>(KEY) ?? {};
  const { typing, others } = DEFAULT_SETTINGS.durationMinutes;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    // The old "never" (0) no longer exists.
    revealAfterErrors: stored.revealAfterErrors || DEFAULT_SETTINGS.revealAfterErrors,
    durationMinutes: {
      typing: { ...typing, ...stored.durationMinutes?.typing },
      others: { ...others, ...stored.durationMinutes?.others },
    },
  };
}
