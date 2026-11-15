// The Brazil map reuses the same games; these tests cover what is specific to it.
import brazilTopo from '../../../../public/data/brazil.topo.json';
import regionsJson from '../../../../public/data/regions-br.json';
import statesJson from '../../../../public/data/states.json';
import { BrazilState } from '../data/geo-data.models';
import { AnswerMode } from './answers';
import { ClickGame } from './click-game';
import { SavedGameStore } from './saved-game.store';
import { buildBrazilTargets, withCapitals } from './targets';
import { TypingGame } from './typing-game';

const states = statesJson as unknown as BrazilState[];
const targets = buildBrazilTargets(states);

function typingGame(mode: AnswerMode) {
  return new TypingGame({
    gameId: mode === 'countries' ? 'digitar-paises' : 'digitar-capitais',
    layer: 'brazil',
    mode,
    targets,
    tolerance: 1,
    territories: false,
    durationMs: null,
  });
}

/** Types letter by letter like the page does, then Enter. Returns the states scored. */
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

describe('Brazil targets', () => {
  it('are the 26 states and the Federal District, each lighting up its own map shape', () => {
    expect(targets.length).toBe(27);
    for (const target of targets) expect(target.unitIds).toEqual([target.id]);
    const shapes = brazilTopo.objects.states.geometries.map((g) => g.properties.id);
    expect(new Set(shapes)).toEqual(new Set(targets.map((t) => t.id)));
  });

  it('are grouped by the five regions', () => {
    const regions = new Set(regionsJson.map((r) => r.id));
    expect(regions.size).toBe(5);
    for (const target of targets) expect(regions.has(target.group), target.id).toBe(true);
  });

  it('give only the Federal District the bigger click area', () => {
    expect(targets.filter((t) => t.tiny).map((t) => t.id)).toEqual(['DF']);
  });

  it('every state has a capital, so the capital games ask about all 27', () => {
    expect(withCapitals(targets).length).toBe(27);
  });
});

describe('typing states and capitals', () => {
  for (const lang of ['pt', 'en'] as const) {
    it(`scores exactly the state typed, whatever similar names exist (${lang})`, () => {
      for (const state of states) {
        expect(typeLikeAPlayer(typingGame('countries'), state.name[lang]), state.id).toEqual([
          state.id,
        ]);
      }
    });

    it(`scores exactly the state of the capital typed (${lang})`, () => {
      for (const state of states) {
        const capital = state.capitals[0].name[lang];
        expect(typeLikeAPlayer(typingGame('capitals'), capital), capital).toEqual([state.id]);
      }
    });
  }

  it('finds all 27 in any order and then finishes', () => {
    const game = typingGame('countries');
    for (const state of [...states].reverse()) typeLikeAPlayer(game, state.name.pt);
    expect(game.foundCount()).toBe(27);
    expect(game.result()?.reason).toBe('complete');
  });

  it('saves the Brazil layer, so a reload does not mix it up with the world game', () => {
    const game = typingGame('countries');
    typeLikeAPlayer(game, 'Acre');
    expect(game.snapshot().layer).toBe('brazil');
  });
});

describe('click games on the Brazil map', () => {
  it('ask every state once and count a wrong click as an error', () => {
    const game = new ClickGame({
      gameId: 'clicar-nome',
      layer: 'brazil',
      clue: 'name',
      targets,
      territories: false,
      durationMs: null,
      revealAfterErrors: 0,
      learnMode: true,
    });
    expect(game.queue().length).toBe(27);
    const asked = game.current()!;
    const other = targets.find((t) => t.id !== asked.id)!;
    expect(game.click(other.id).kind).toBe('wrong');
    expect(game.errors()).toBe(1);
    expect(game.click(asked.id).kind).toBe('hit');
    expect(game.snapshot().layer).toBe('brazil');
  });
});

describe('saved games per map', () => {
  it('keeps a slot for the world and another for Brazil', () => {
    const store = new SavedGameStore();
    const game = typingGame('countries');
    typeLikeAPlayer(game, 'Acre');
    store.save(game.snapshot());
    expect(store.has('digitar-paises', 'brazil')).toBe(true);
    expect(store.has('digitar-paises', 'world')).toBe(false);
    store.clear('digitar-paises', 'brazil');
    expect(store.has('digitar-paises', 'brazil')).toBe(false);
  });
});
