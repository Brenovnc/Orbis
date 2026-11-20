import { ClickGame, ClickGameConfig } from './click-game';
import { withCapitals } from './targets';
import { seededRandom, worldTargets } from './test-targets';

function newGame(overrides: Partial<ClickGameConfig> = {}) {
  return new ClickGame({
    gameId: 'clicar-nome',
    clue: 'name',
    targets: worldTargets(false),
    territories: false,
    durationMs: 15 * 60_000,
    random: seededRandom(),
    revealAfterErrors: 3,
    learnMode: true,
    ...overrides,
  });
}

/** Puts the wanted questions first, in order. */
function ask(game: ClickGame, ...ids: string[]) {
  game.queue.set([...ids, ...game.queue().filter((id) => !ids.includes(id))]);
}

describe('ClickGame score and questions', () => {
  it('asks every target once, in random order', () => {
    const game = newGame();
    expect(game.total).toBe(195);
    expect(game.queue().length).toBe(195);
    expect(new Set(game.queue()).size).toBe(195);
    expect(game.current()).not.toBeNull();
  });

  it('scores a right click and moves to the next question', () => {
    const game = newGame();
    ask(game, 'BRA', 'CHL');
    expect(game.click('BRA').kind).toBe('hit');
    expect(game.foundCount()).toBe(1);
    expect(game.current()?.id).toBe('CHL');
    expect(game.errors()).toBe(0);
  });

  it('counts a wrong click as an error and keeps the question', () => {
    const game = newGame();
    ask(game, 'BRA');
    const outcome = game.click('ARG');
    expect(outcome.kind).toBe('wrong');
    expect(game.errors()).toBe(1);
    expect(game.current()?.id).toBe('BRA');
    expect(game.foundCount()).toBe(0);
  });

  it('does not punish clicking a place that is already answered', () => {
    const game = newGame();
    ask(game, 'BRA', 'CHL');
    game.click('BRA');
    expect(game.click('BRA').kind).toBe('known');
    expect(game.errors()).toBe(0);
  });

  it('ignores clicks on things that are not targets', () => {
    const game = newGame();
    expect(game.click('ATA').kind).toBe('ignored');
    expect(game.errors()).toBe(0);
  });

  it('finishes as complete after the last question', () => {
    const game = newGame({ targets: worldTargets(false).slice(0, 2) });
    const [first, second] = game.queue();
    game.click(first);
    expect(game.status()).toBe('playing');
    game.click(second);
    expect(game.status()).toBe('finished');
    expect(game.result()).toMatchObject({ found: 2, total: 2, reason: 'complete', errors: 0 });
  });
});

describe('ClickGame skip and reveal', () => {
  it('skips to the end of the queue without penalty', () => {
    const game = newGame();
    ask(game, 'BRA', 'CHL');
    game.skip();
    expect(game.current()?.id).toBe('CHL');
    expect(game.queue().at(-1)).toBe('BRA');
    expect(game.errors()).toBe(0);
  });

  it('cannot skip when only one question is left', () => {
    const game = newGame({ targets: worldTargets(false).slice(0, 1) });
    const only = game.current()?.id;
    game.skip();
    expect(game.current()?.id).toBe(only);
  });

  it('shows the answer after N wrong clicks on the same question and moves on', () => {
    const game = newGame({ revealAfterErrors: 3 });
    ask(game, 'BRA', 'CHL');
    expect(game.click('ARG').kind).toBe('wrong');
    expect(game.click('PER').kind).toBe('wrong');
    const outcome = game.click('URY');
    expect(outcome.kind).toBe('revealed');
    expect(game.revealed().has('BRA')).toBe(true);
    expect(game.foundCount()).toBe(0);
    expect(game.errors()).toBe(3);
    expect(game.current()?.id).toBe('CHL');
  });

  it('restarts the error count on a new question', () => {
    const game = newGame({ revealAfterErrors: 2 });
    ask(game, 'BRA', 'CHL');
    game.click('ARG');
    game.skip();
    expect(game.click('PER').kind).toBe('wrong');
  });

  it('reveals on the first mistake with 1 attempt', () => {
    const game = newGame({ revealAfterErrors: 1 });
    ask(game, 'BRA');
    expect(game.click('ARG').kind).toBe('revealed');
    expect(game.errors()).toBe(1);
  });

  it('keeps the rule of an old save that never reveals (0)', () => {
    const game = newGame({ revealAfterErrors: 0 });
    ask(game, 'BRA');
    for (let i = 0; i < 10; i++) expect(game.click('ARG').kind).toBe('wrong');
    expect(game.revealed().size).toBe(0);
  });

  it('lists revealed and never-asked places as missed', () => {
    const game = newGame({ revealAfterErrors: 1 });
    ask(game, 'BRA', 'CHL');
    game.click('ARG'); // reveals BRA
    game.click('CHL');
    game.giveUp();
    const missed = game.missed().map((t) => t.id);
    expect(missed).toContain('BRA');
    expect(missed).not.toContain('CHL');
    expect(missed.length).toBe(194);
  });
});

describe('ClickGame with capitals', () => {
  it('only asks about places that have a capital', () => {
    const targets = withCapitals(worldTargets(true));
    expect(targets.length).toBeLessThan(worldTargets(true).length);
    expect(targets.every((t) => t.place.capitals.length > 0)).toBe(true);
  });

  it('accepts any place that has the shown capital name (Kingston)', () => {
    const game = newGame({
      gameId: 'clicar-capital',
      clue: 'capital',
      targets: withCapitals(worldTargets(true)),
      territories: true,
    });
    ask(game, 'JAM');
    expect([...game.acceptedIds(game.current()!)].sort()).toEqual(['JAM', 'NFK']);
    // Clicking the other Kingston also counts, and the question for Jamaica stays.
    expect(game.click('NFK').kind).toBe('hit');
    expect(game.found().has('NFK')).toBe(true);
    expect(game.current()?.id).toBe('JAM');
  });
});

describe('ClickGame clock and saving', () => {
  it('counts down only while playing and ends by timeout', () => {
    const game = newGame({ durationMs: 10_000 });
    game.tick(4000);
    game.pause();
    game.tick(4000);
    expect(game.remainingMs()).toBe(6000);
    game.resume();
    game.tick(7000);
    expect(game.status()).toBe('finished');
    expect(game.result()?.reason).toBe('timeout');
  });

  it('resumes from a snapshot, paused, with the same questions and errors', () => {
    const first = newGame();
    ask(first, 'BRA', 'CHL', 'PER');
    first.click('BRA');
    first.click('ARG');
    first.tick(5000);
    const resumed = newGame({ saved: first.snapshot() });
    expect(resumed.status()).toBe('paused');
    expect(resumed.foundCount()).toBe(1);
    expect(resumed.errors()).toBe(1);
    expect(resumed.elapsedMs()).toBe(5000);
    expect(resumed.queue().slice(0, 2)).toEqual(['CHL', 'PER']);
    expect(resumed.queue().length).toBe(194);
  });

  it('saves the rules it started with, so a reload does not pick up newer settings', () => {
    const saved = newGame({ revealAfterErrors: 2, learnMode: false }).snapshot();
    expect(saved.revealAfterErrors).toBe(2);
    expect(saved.learnMode).toBe(false);
  });

  it('ignores saved ids that no longer exist', () => {
    const game = newGame({
      saved: {
        v: 1,
        gameId: 'clicar-nome',
        layer: 'world',
        territories: false,
        found: ['BRA', 'NOPE'],
        queue: ['NOPE', 'CHL'],
        elapsedMs: 0,
        durationMs: null,
      },
    });
    expect(game.foundCount()).toBe(1);
    expect(game.queue()[0]).toBe('CHL');
    expect(game.queue().length).toBe(194);
  });
});
