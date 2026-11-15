// Regression tests for places with similar names in the typing games. The bug: typing "gui"
// scored Guiné (a Wikidata sports code) and then Guiana could not be typed any more.
import { matchAnswer, buildIndex } from './answers';
import { worldTargets } from './test-targets';
import { TypingGame } from './typing-game';

function newGame(includeTerritories = false) {
  return new TypingGame({
    gameId: 'digitar-paises',
    mode: 'countries',
    targets: worldTargets(includeTerritories),
    tolerance: 1,
    territories: includeTerritories,
    durationMs: null,
  });
}

/**
 * Types `text` one letter at a time, like the page does (the box is cleared after a hit or a
 * repeated answer), then presses Enter if anything is left. Returns every place scored.
 */
function typeLikeAPlayer(game: TypingGame, text: string): string[] {
  const scored: string[] = [];
  let box = '';
  for (const letter of text) {
    box += letter;
    const result = game.submit(box, false);
    if (result.kind === 'hit' || result.kind === 'duplicate') {
      if (result.kind === 'hit') scored.push(...result.targets.map((t) => t.id));
      box = '';
    }
  }
  if (box.trim()) {
    const result = game.submit(box, true);
    if (result.kind === 'hit') scored.push(...result.targets.map((t) => t.id));
  }
  return scored;
}

const name = (id: string, lang: 'pt' | 'en' = 'pt') => {
  const target = worldTargets(true).find((t) => t.id === id);
  if (!target) throw new Error(`no target ${id}`);
  return target.place.name[lang];
};

const GROUPS: string[][] = [
  ['GIN', 'GNB', 'GNQ', 'GUY', 'PNG'],
  ['NER', 'NGA'],
  ['SDN', 'SSD'],
  ['COG', 'COD'],
  ['DMA', 'DOM'],
  ['AUT', 'AUS'],
  ['SVK', 'SVN'],
  ['IRN', 'IRQ'],
  ['MLI', 'MWI'],
  ['GMB', 'ZMB'],
  ['PRK', 'KOR'],
];

describe('typing places with similar names', () => {
  it('scores nothing for a partial name like "gui"', () => {
    const game = newGame();
    for (const box of ['g', 'gu', 'gui']) expect(game.submit(box, false).kind).not.toBe('hit');
    expect(game.submit('gui', true).kind).toBe('miss');
    expect(game.foundCount()).toBe(0);
  });

  for (const group of GROUPS) {
    for (const lang of ['pt', 'en'] as const) {
      it(`scores exactly the place typed: ${group.join(' / ')} (${lang})`, () => {
        for (const id of group) {
          expect(typeLikeAPlayer(newGame(), name(id, lang)), name(id, lang)).toEqual([id]);
        }
      });

      it(`still works whatever was found before: ${group.join(' / ')} (${lang})`, () => {
        // Type the whole group in order and in reverse order.
        for (const order of [group, [...group].reverse()]) {
          const game = newGame();
          for (const id of order) {
            expect(typeLikeAPlayer(game, name(id, lang)), name(id, lang)).toEqual([id]);
          }
          expect(game.foundCount()).toBe(group.length);
        }
      });
    }
  }

  it('handles Guiana and Guiana Francesa when territories are on', () => {
    const game = newGame(true);
    expect(typeLikeAPlayer(game, 'Guiana')).toEqual(['GUY']);
    expect(typeLikeAPlayer(game, 'Guiana Francesa')).toEqual(['GUF']);
    const reverse = newGame(true);
    expect(typeLikeAPlayer(reverse, 'Guiana Francesa')).toEqual(['GUF']);
    expect(typeLikeAPlayer(reverse, 'Guiana')).toEqual(['GUY']);
  });

  it('waits for Enter when a whole name is also the start of another one', () => {
    const game = newGame();
    expect(game.submit('Irã', false).kind).toBe('pending');
    expect(game.submit('Niger', false).kind).toBe('pending');
    expect(game.submit('Guiné', false).kind).toBe('pending');
    expect(game.foundCount()).toBe(0);
    expect(game.submit('Irã', true).kind).toBe('hit');
    // Once Iraque is found, "Irã" no longer needs Enter (nothing left to confuse it with).
    const other = newGame();
    typeLikeAPlayer(other, 'Iraque');
    expect(other.submit('Irã', false).kind).toBe('hit');
  });

  it('does not wait when the longer name is only an alias of another place', () => {
    const game = newGame();
    // Suriname's old name "Guiana Holandesa" and "Estados Unidos Mexicanos" are aliases.
    expect(game.submit('Guiana', false).kind).toBe('hit');
    expect(game.submit('Estados Unidos', false).kind).toBe('hit');
    // With territories on, "Guiana Francesa" is a main name, so "Guiana" waits for Enter.
    expect(newGame(true).submit('Guiana', false).kind).toBe('pending');
  });

  it('lets "Congo" mean the Republic of the Congo, but only with Enter', () => {
    // While typing it waits (it is the start of "Congo-Kinshasa"); Enter confirms it.
    expect(newGame().submit('Congo', false).kind).toBe('pending');
    expect(typeLikeAPlayer(newGame(), 'Congo')).toEqual(['COG']);
    expect(typeLikeAPlayer(newGame(), 'Congo-Kinshasa')).toEqual(['COD']);
    // (Typed letter by letter, "RD C" is already the alias RDC, so this one is pasted whole.)
    const pasted = newGame().submit('RD Congo', true);
    expect(pasted.kind === 'hit' && pasted.targets.map((target) => target.id)).toEqual(['COD']);
  });
});

describe('typo forgiveness on Enter never picks between similar places', () => {
  const index = buildIndex(worldTargets(false), 'countries');
  const none = new Set<string>();
  const enter = (text: string, tolerance: 1 | 2 = 1) => {
    const result = matchAnswer(text, index, none, { fuzzy: true, tolerance });
    return result.kind === 'miss' ? 'miss' : result.targets.map((t) => t.id).join(',');
  };

  it('accepts a typo that only fits one place', () => {
    expect(enter('Zambya')).toBe('ZMB');
    expect(enter('Gambya')).toBe('GMB');
    expect(enter('Eslovenya')).toBe('SVN');
    expect(enter('Malawy')).toBe('MWI');
    expect(enter('Iraqe')).toBe('IRQ');
  });

  it('refuses a typo that fits two places, even if one is closer', () => {
    expect(enter('Ambia')).toBe('miss'); // Gâmbia and Zâmbia
    expect(enter('Austrlia')).toBe('miss'); // Austrália and Áustria
    expect(enter('Nigera')).toBe('miss'); // Níger and Nigéria
    expect(enter('Austrlia', 2)).toBe('miss');
  });

  it('never forgives typos in short names, where a typo is another country', () => {
    expect(enter('Mal')).toBe('miss');
    expect(enter('Irak', 2)).not.toBe('IRN');
  });
});

describe('aliases from the data', () => {
  it('has no short codes left (only the allowed acronyms)', () => {
    const allowed = new Set(['eua', 'usa', 'uae', 'rdc', 'drc']);
    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '');
    for (const target of worldTargets(true)) {
      const place = target.place;
      const aliases = [
        ...place.aliases.pt,
        ...place.aliases.en,
        ...place.capitals.flatMap((c) => [...c.aliases.pt, ...c.aliases.en]),
      ];
      for (const alias of aliases) {
        const key = normalize(alias);
        if (key.length <= 3) expect(allowed.has(key), `${target.id}: ${alias}`).toBe(true);
        expect(/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(alias), `${target.id}: ${alias}`).toBe(false);
      }
    }
  });
});
