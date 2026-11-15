import { Injectable, computed, signal } from '@angular/core';
import { Lang } from './data/geo-data.models';
import { readStore, writeStore } from './storage';

/** continuous = rectangular map that repeats sideways; natural-earth = classic rounded map. */
export type MapProjection = 'continuous' | 'natural-earth';

export interface Settings {
  language: Lang;
  mapProjection: MapProjection;
  sounds: boolean;
  timerEnabled: boolean;
  /** Time limit per layer, in minutes. */
  durationMinutes: { world: number; brazil: number };
  includeTerritories: boolean;
  /** Typo tolerance when pressing Enter: 0 = off, 1 = normal, 2 = generous. */
  typoTolerance: 0 | 1 | 2;
  infoBox: boolean;
  /** After a wrong click, show the name and facts of the place that was clicked. */
  learnMode: boolean;
  /** In click games, show the answer after this many wrong clicks on one question (0 = never). */
  revealAfterErrors: number;
  /** Highlight the place under the mouse. */
  hoverHighlight: boolean;
  /** Write the name of found places on the map. */
  showNames: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'pt',
  mapProjection: 'continuous',
  sounds: false,
  timerEnabled: true,
  durationMinutes: { world: 15, brazil: 5 },
  includeTerritories: false,
  typoTolerance: 1,
  infoBox: true,
  learnMode: true,
  revealAfterErrors: 3,
  hoverHighlight: true,
  showNames: false,
};

export type Preset = 'easy' | 'normal' | 'hard';

/** The options a difficulty shortcut sets. Language, map, sounds and territories are left alone. */
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
>;

export const PRESETS: Record<Preset, PresetValues> = {
  easy: {
    timerEnabled: false,
    durationMinutes: { world: 15, brazil: 5 },
    typoTolerance: 2,
    infoBox: true,
    learnMode: true,
    revealAfterErrors: 2,
    hoverHighlight: true,
    showNames: true,
  },
  normal: {
    timerEnabled: true,
    durationMinutes: { world: 15, brazil: 5 },
    typoTolerance: 1,
    infoBox: true,
    learnMode: true,
    revealAfterErrors: 3,
    hoverHighlight: true,
    showNames: false,
  },
  hard: {
    timerEnabled: true,
    durationMinutes: { world: 10, brazil: 3 },
    typoTolerance: 0,
    infoBox: false,
    learnMode: false,
    revealAfterErrors: 0,
    hoverHighlight: false,
    showNames: false,
  },
};

const KEY = 'settings';

function matches(settings: Settings, preset: PresetValues): boolean {
  return (Object.keys(preset) as (keyof PresetValues)[]).every((key) =>
    key === 'durationMinutes'
      ? settings.durationMinutes.world === preset.durationMinutes.world &&
        settings.durationMinutes.brazil === preset.durationMinutes.brazil
      : settings[key] === preset[key],
  );
}

/** Settings kept only in this browser. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly value = signal<Settings>(load());

  /** The difficulty shortcut the options match, or null when customized. */
  readonly preset = computed<Preset | null>(() => {
    const settings = this.value();
    return (Object.keys(PRESETS) as Preset[]).find((p) => matches(settings, PRESETS[p])) ?? null;
  });

  update(patch: Partial<Settings>): void {
    this.value.update((current) => ({ ...current, ...patch }));
    writeStore(KEY, this.value());
  }

  applyPreset(preset: Preset): void {
    const values = PRESETS[preset];
    this.update({ ...values, durationMinutes: { ...values.durationMinutes } });
  }
}

function load(): Settings {
  const stored = readStore<Partial<Settings>>(KEY) ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    durationMinutes: { ...DEFAULT_SETTINGS.durationMinutes, ...stored.durationMinutes },
  };
}
