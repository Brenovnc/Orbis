import { CHALLENGES, GAMES } from '../games';
import { DEFAULT_SETTINGS, PRESETS, Preset, PresetValues } from '../settings.service';
import { gameOptions, matchingPreset, presetDuration } from './game-options';
import { recordKey, recordLevel } from './records.service';

const IDS = [...GAMES, ...CHALLENGES].map(({ id }) => id);
const LEVELS: Preset[] = ['easy', 'normal', 'hard'];
const normal = (patch: Partial<PresetValues>): PresetValues => ({ ...PRESETS.normal, ...patch });

describe('gameOptions', () => {
  it('only lists what each game reads', () => {
    expect(gameOptions('proximidade', PRESETS.normal)).toEqual([
      'proximityClues',
      'typoTolerance',
      'showNames',
      'infoBox',
    ]);
    expect(gameOptions('trilha', PRESETS.normal)).toEqual([
      'trailLevel',
      'trailForbidden',
      'typoTolerance',
      'infoBox',
    ]);
    const silhouettes = gameOptions('silhuetas', PRESETS.easy);
    expect(silhouettes).toContain('silhouetteMode');
    for (const other of ['trailLevel', 'mapBorders', 'proximityClues', 'typoTolerance'] as const) {
      expect(silhouettes).not.toContain(other);
    }
    expect(gameOptions('clicar-nome', PRESETS.normal)).not.toContain('typoTolerance');
  });

  it('offers the borders of the map only to the typing games and Neighbors', () => {
    const having = IDS.filter((id) => gameOptions(id, PRESETS.normal).includes('mapBorders'));
    expect(having).toEqual(['digitar-paises', 'digitar-capitais', 'vizinhos']);
  });
});

describe('the time of each level', () => {
  it('is the same on medium and hard in the typing games, and shorter on hard in the others', () => {
    for (const id of ['digitar-paises', 'digitar-capitais'] as const) {
      for (const level of ['normal', 'hard'] as const) {
        expect(presetDuration(id, 'world', level)).toBe(15);
        expect(presetDuration(id, 'brazil', level)).toBe(5);
      }
    }
    for (const id of ['clicar-nome', 'silhuetas', 'vizinhos'] as const) {
      expect(presetDuration(id, 'world', 'normal')).toBe(15);
      expect(presetDuration(id, 'world', 'hard')).toBe(10);
      expect(presetDuration(id, 'brazil', 'hard')).toBe(3);
    }
  });
});

describe('matchingPreset', () => {
  it('finds each level in every game, and medium by default', () => {
    for (const id of IDS) {
      for (const level of LEVELS) expect(matchingPreset(id, 'world', PRESETS[level])).toBe(level);
      expect(matchingPreset(id, 'world', DEFAULT_SETTINGS), id).toBe('normal');
    }
  });

  it('is customized only in the games that read the option changed', () => {
    const values = normal({ proximityClues: 'color' });
    expect(matchingPreset('proximidade', 'world', values)).toBeNull();
    expect(matchingPreset('digitar-paises', 'world', values)).toBe('normal');
  });

  it('looks at the time of the game and the map, and not at all when the clock is off', () => {
    const { typing, others } = PRESETS.normal.durationMinutes;
    const values = normal({ durationMinutes: { typing: { ...typing, world: 7 }, others } });
    expect(matchingPreset('digitar-paises', 'world', values)).toBeNull();
    expect(matchingPreset('digitar-paises', 'brazil', values)).toBe('normal');
    expect(matchingPreset('clicar-nome', 'world', values)).toBe('normal');
    const easy = { ...PRESETS.easy, durationMinutes: values.durationMinutes };
    expect(matchingPreset('digitar-paises', 'world', easy)).toBe('easy');
  });
});

describe('custom records', () => {
  const base = { layer: 'world', territories: false, durationMs: null };

  it('never mix games with different options', () => {
    // A different value for each option.
    const other: PresetValues = {
      timerEnabled: false,
      durationMinutes: { typing: { world: 7, brazil: 2 }, others: { world: 7, brazil: 2 } },
      typoTolerance: 2,
      infoBox: false,
      learnMode: false,
      revealAfterErrors: 5,
      hoverHighlight: false,
      showNames: true,
      trailLevel: 'easy',
      trailForbidden: 'none',
      silhouetteMode: 'typing',
      mapBorders: 'coast',
      proximityClues: 'color',
    };
    for (const id of IDS) {
      // The time goes in the key through durationMs.
      const options = gameOptions(id, PRESETS.normal).filter(
        (option) => option !== 'timerEnabled' && option !== 'durationMinutes',
      );
      const keys = options.map((option) => {
        const played = recordLevel(id, 'world', normal({ [option]: other[option] }));
        expect(played.level, `${id} ${option}`).toBe('custom');
        return recordKey({ gameId: id, ...base, ...played });
      });
      expect(new Set(keys).size, id).toBe(keys.length);
    }
  });

  it('do not depend on options the game does not read', () => {
    const key = (values: PresetValues) =>
      recordKey({ gameId: 'proximidade', ...base, ...recordLevel('proximidade', 'world', values) });
    expect(key(normal({ showNames: true, trailLevel: 'hard' }))).toBe(
      key(normal({ showNames: true })),
    );
  });

  it('a level needs no options in its key', () => {
    expect(recordLevel('vizinhos', 'world', PRESETS.hard)).toEqual({ level: 'hard' });
  });
});
