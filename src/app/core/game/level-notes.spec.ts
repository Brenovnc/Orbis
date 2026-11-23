import { GAMES, CHALLENGES, GameId, hasTimeLimit } from '../games';
import { PRESETS, Preset } from '../settings.service';
import { MatchInfo, levelNotes } from './level-notes';

const LEVELS: Preset[] = ['easy', 'normal', 'hard'];

const match = (extra: Partial<MatchInfo> = {}): MatchInfo => ({
  layer: 'world',
  minutes: 15,
  canForbid: true,
  ...extra,
});

const notes = (id: GameId, level: Preset, extra: Partial<MatchInfo> = {}) =>
  levelNotes(id, PRESETS[level], match(extra));
const keys = (id: GameId, level: Preset, extra: Partial<MatchInfo> = {}) =>
  notes(id, level, extra).map((note) => note.key);

describe('levelNotes', () => {
  it('gives 3 or 4 items, as many in every level of a game', () => {
    for (const { id } of [...GAMES, ...CHALLENGES]) {
      const counts = LEVELS.map((level) => notes(id, level).length);
      expect(new Set(counts).size, id).toBe(1);
      expect(counts[0], id).toBeGreaterThanOrEqual(3);
      expect(counts[0], id).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the order in every level: time, attempts, answer, helps, map', () => {
    const order = ['time', 'attempts', 'answer', 'help', 'map'];
    const kindOf = (key: string) => {
      if (/^level\.(noTime|time)/.test(key)) return 'time';
      if (/^level\.(attempt|spareGuesses)/.test(key)) return 'attempts';
      if (/^level\.(typo|choices)/.test(key)) return 'answer';
      return /^level\.(borders|map)/.test(key) ? 'map' : 'help';
    };
    for (const { id } of [...GAMES, ...CHALLENGES]) {
      const kinds = LEVELS.map((level) => keys(id, level).map(kindOf));
      for (const list of kinds) {
        expect(list, id).toEqual(kinds[0]);
        const places = list.map((kind) => order.indexOf(kind));
        expect(places, id).toEqual([...places].sort());
      }
    }
  });

  it('tells the time only in games with a limit, as the real time of the match', () => {
    for (const { id } of [...GAMES, ...CHALLENGES]) {
      const first = notes(id, 'hard', { minutes: 4 })[0];
      if (hasTimeLimit(id)) {
        expect(first, id).toEqual({ icon: 'clock', key: 'level.time', params: { n: 4 } });
      } else {
        expect(first.icon, id).not.toBe('clock');
      }
    }
    expect(keys('digitar-paises', 'easy', { minutes: null })[0]).toBe('level.noTime');
  });

  it('describes the typing games and Neighbors with the borders of the map', () => {
    for (const id of ['digitar-paises', 'digitar-capitais', 'vizinhos'] as const) {
      expect(keys(id, 'normal')).toEqual([
        'level.time',
        'level.typo.1',
        'level.noNames',
        'level.borders.all',
      ]);
      expect(keys(id, 'hard').at(-1)).toBe('level.borders.coast');
    }
  });

  it('describes the click games with no typing', () => {
    expect(keys('clicar-nome', 'hard')).toEqual([
      'level.time',
      'level.attempt1',
      'level.noLearn',
      'level.noNames',
    ]);
  });

  it('describes the Trail, with the forbidden places only where they are possible', () => {
    expect(keys('trilha', 'hard')).toEqual([
      'level.spareGuesses',
      'level.typo.0',
      'level.forbidden.always',
      'level.mapHidden',
    ]);
    expect(notes('trilha', 'hard')[0].params).toEqual({ n: 2 });
    expect(notes('trilha', 'easy')[0].params).toEqual({ n: 4 });
    expect(keys('trilha', 'hard', { canForbid: false })).toContain('level.forbidden.none');
    expect(keys('trilha', 'easy')).toContain('level.mapShown');
  });

  it('says how the Silhouettes are answered and helped', () => {
    expect(keys('silhuetas', 'easy')).toEqual([
      'level.time',
      'level.attemptsN',
      'level.choices',
      'level.surroundings',
    ]);
    expect(keys('silhuetas', 'normal').slice(2)).toEqual(['level.typo.1', 'level.hints']);
    expect(keys('silhuetas', 'normal', { layer: 'brazil' }).at(-1)).toBe('level.hints.states');
    expect(keys('silhuetas', 'hard').slice(2)).toEqual(['level.typo.0', 'level.noHints']);
  });

  it('tells the clues of the Proximity game', () => {
    expect(LEVELS.map((level) => keys('proximidade', level)[1])).toEqual([
      'level.clues.distance-direction',
      'level.clues.distance',
      'level.clues.color',
    ]);
  });
});
