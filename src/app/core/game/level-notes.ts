import type { GameIconName } from '../../shared/ui/game-icon.component';
import { Layer } from '../data/geo-data.models';
import { GameId, hasTimeLimit, isClickGame } from '../games';
import { StringKey } from '../i18n/strings';
import { PresetValues } from '../settings.service';
import { gameOptions } from './game-options';
import { trailGuesses } from './trail-graph';

/** One short item of a level: an icon and a few words. */
export interface LevelNote {
  icon: GameIconName;
  key: StringKey;
  params?: Record<string, number>;
}

/** The match that would start. */
export interface MatchInfo {
  layer: Layer;
  /** Time limit; null without one. */
  minutes: number | null;
  /** Trail: some place can be forbidden here. */
  canForbid: boolean;
}

/**
 * What a difficulty level is in one game: 3 or 4 items, only about options the game reads. Every
 * level of a game has the same items in the same order (time, attempts, answer, helps, map), so
 * the levels can be compared at a glance.
 */
export function levelNotes(id: GameId, values: PresetValues, match: MatchInfo): LevelNote[] {
  const uses = new Set(gameOptions(id, values));
  const notes: LevelNote[] = [];
  if (hasTimeLimit(id)) {
    notes.push(
      match.minutes === null
        ? { icon: 'clock', key: 'level.noTime' }
        : { icon: 'clock', key: 'level.time', params: { n: match.minutes } },
    );
  }
  if (uses.has('revealAfterErrors')) {
    const n = values.revealAfterErrors;
    notes.push(
      n === 1
        ? { icon: 'target', key: 'level.attempt1' }
        : { icon: 'target', key: 'level.attemptsN', params: { n } },
    );
  }
  if (id === 'trilha') {
    const n = trailGuesses(0, values.trailLevel);
    notes.push({ icon: 'target', key: 'level.spareGuesses', params: { n } });
  }
  if (uses.has('typoTolerance')) {
    notes.push({ icon: 'keyboard', key: `level.typo.${values.typoTolerance}` });
  } else if (id === 'silhuetas') {
    notes.push({ icon: 'list-checks', key: 'level.choices' });
  }
  notes.push(...helpNotes(id, values, match));
  if (uses.has('mapBorders')) {
    notes.push({ icon: 'map', key: `level.borders.${values.mapBorders}` });
  }
  if (id === 'trilha') {
    notes.push(
      values.trailLevel === 'easy'
        ? { icon: 'map', key: 'level.mapShown' }
        : { icon: 'eye-off', key: 'level.mapHidden' },
    );
  }
  return notes;
}

function helpNotes(id: GameId, values: PresetValues, match: MatchInfo): LevelNote[] {
  const names: LevelNote = { icon: 'tag', key: values.showNames ? 'level.names' : 'level.noNames' };
  if (id === 'trilha') {
    const forbidden = match.canForbid ? values.trailForbidden : 'none';
    return [{ icon: 'ban', key: `level.forbidden.${forbidden}` }];
  }
  if (id === 'proximidade') {
    const clues = values.proximityClues;
    const icons = { 'distance-direction': 'compass', distance: 'ruler', color: 'palette' } as const;
    return [{ icon: icons[clues], key: `level.clues.${clues}` }, names];
  }
  if (id === 'silhuetas') {
    if (values.silhouetteMode === 'choices') return [{ icon: 'eye', key: 'level.surroundings' }];
    if (values.silhouetteMode === 'typing') return [{ icon: 'eye-off', key: 'level.noHints' }];
    // Brazil is split into regions, not continents.
    const key = match.layer === 'brazil' ? 'level.hints.states' : 'level.hints';
    return [{ icon: 'lightbulb', key }];
  }
  if (isClickGame(id)) {
    const key = values.learnMode ? 'level.learn' : 'level.noLearn';
    return [{ icon: 'graduation-cap', key }, names];
  }
  return [names];
}
