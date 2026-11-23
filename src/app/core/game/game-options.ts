import { Layer } from '../data/geo-data.models';
import { GameId, hasTimeLimit, isClickGame, isTypingGame } from '../games';
import { PRESETS, Preset, PresetValues } from '../settings.service';

export type GameOption = keyof PresetValues;

/**
 * The options of a level that one game really reads (see the game pages). What the start dialog
 * tells and lets customize, the level the settings match and the key of a custom record all come
 * from here.
 */
export function gameOptions(id: GameId, values: PresetValues): GameOption[] {
  const click = isClickGame(id);
  const silhouettes = id === 'silhuetas';
  const used: Record<GameOption, boolean> = {
    silhouetteMode: silhouettes,
    trailLevel: id === 'trilha',
    trailForbidden: id === 'trilha',
    proximityClues: id === 'proximidade',
    timerEnabled: hasTimeLimit(id),
    durationMinutes: hasTimeLimit(id) && values.timerEnabled,
    revealAfterErrors: click || silhouettes,
    typoTolerance: !click && !(silhouettes && values.silhouetteMode === 'choices'),
    mapBorders: isTypingGame(id) || id === 'vizinhos',
    // The Trail names every place it shows, whatever this option says.
    showNames: id !== 'trilha',
    hoverHighlight: click,
    learnMode: click || silhouettes,
    infoBox: true,
  };
  return (Object.keys(used) as GameOption[]).filter((option) => used[option]);
}

/** The time limit of a game, in minutes, on the whole map. */
export function durationOf(id: GameId, layer: Layer, values: PresetValues): number {
  return values.durationMinutes[isTypingGame(id) ? 'typing' : 'others'][layer];
}

/** The time limit a level gives to a game, in minutes, on the whole map. */
export const presetDuration = (id: GameId, layer: Layer, preset: Preset): number =>
  durationOf(id, layer, PRESETS[preset]);

/** The level these options match in one game, or null when they match none. */
export function matchingPreset(id: GameId, layer: Layer, values: PresetValues): Preset | null {
  const matches = (preset: Preset) =>
    gameOptions(id, PRESETS[preset]).every((option) =>
      option === 'durationMinutes'
        ? durationOf(id, layer, values) === presetDuration(id, layer, preset)
        : values[option] === PRESETS[preset][option],
    );
  return (Object.keys(PRESETS) as Preset[]).find(matches) ?? null;
}
