import { RecordEntry, isBetter, recordKey } from './records.service';
import { worldTargets } from './test-targets';
import { TypingGame, TypingGameConfig } from './typing-game';

function newGame(overrides: Partial<TypingGameConfig> = {}) {
  return new TypingGame({
    gameId: 'digitar-paises',
    mode: 'countries',
    targets: worldTargets(false),
    tolerance: 1,
    territories: false,
    durationMs: 15 * 60 * 1000,
    ...overrides,
  });
}

describe('TypingGame score and progress', () => {
  it('starts at 0 of 195', () => {
    const game = newGame();
    expect(game.foundCount()).toBe(0);
    expect(game.total).toBe(195);
    expect(game.status()).toBe('playing');
  });

  it('scores a right answer once, even if typed again', () => {
    const game = newGame();
    expect(game.submit('Brasil', false).kind).toBe('hit');
    expect(game.foundCount()).toBe(1);
    expect(game.submit('brasil', false).kind).toBe('duplicate');
    expect(game.foundCount()).toBe(1);
  });

  it('does not score wrong answers', () => {
    const game = newGame();
    expect(game.submit('Atlântida', true).kind).toBe('miss');
    expect(game.foundCount()).toBe(0);
  });

  it('with territories on, the total passes 195 and capitals can score several places', () => {
    const game = newGame({
      mode: 'capitals',
      gameId: 'digitar-capitais',
      targets: worldTargets(true),
      territories: true,
    });
    expect(game.total).toBeGreaterThan(195);
    game.submit('Kingston', false);
    expect(game.foundCount()).toBe(2);
  });

  it('finishes as complete when everything is found, and lists nothing as missed', () => {
    const targets = worldTargets(false);
    const game = newGame({ targets: targets.slice(0, 2) });
    game.submit(targets[0].place.name.en, false);
    expect(game.status()).toBe('playing');
    game.submit(targets[1].place.name.en, false);
    expect(game.status()).toBe('finished');
    expect(game.result()?.reason).toBe('complete');
    expect(game.missed()).toEqual([]);
  });
});

describe('TypingGame clock and states', () => {
  it('counts down only while playing', () => {
    const game = newGame({ durationMs: 10_000 });
    game.tick(3000);
    expect(game.remainingMs()).toBe(7000);
    game.pause();
    game.tick(5000);
    expect(game.remainingMs()).toBe(7000);
    game.resume();
    game.tick(1000);
    expect(game.remainingMs()).toBe(6000);
  });

  it('ends by timeout and keeps the score', () => {
    const game = newGame({ durationMs: 10_000 });
    game.submit('Chile', false);
    game.tick(10_500);
    expect(game.status()).toBe('finished');
    expect(game.result()).toEqual({ found: 1, total: 195, elapsedMs: 10_000, reason: 'timeout' });
    expect(game.submit('Peru', false).kind).toBe('ignored');
  });

  it('counts up without a limit', () => {
    const game = newGame({ durationMs: null });
    game.tick(60_000);
    expect(game.remainingMs()).toBeNull();
    expect(game.elapsedMs()).toBe(60_000);
    expect(game.status()).toBe('playing');
  });

  it('ignores answers while paused', () => {
    const game = newGame();
    game.pause();
    expect(game.submit('Brasil', false).kind).toBe('ignored');
    expect(game.foundCount()).toBe(0);
  });

  it('gives up with the missed places listed', () => {
    const game = newGame();
    game.submit('Brasil', false);
    game.giveUp();
    expect(game.result()?.reason).toBe('gaveup');
    expect(game.missed().length).toBe(194);
    expect(game.missed().some((t) => t.id === 'BRA')).toBe(false);
  });
});

describe('TypingGame saving', () => {
  it('resumes from a snapshot, paused, with progress and time', () => {
    const first = newGame();
    first.submit('Brasil', false);
    first.submit('Chile', false);
    first.tick(42_000);
    const resumed = newGame({ saved: first.snapshot() });
    expect(resumed.status()).toBe('paused');
    expect(resumed.foundCount()).toBe(2);
    expect(resumed.elapsedMs()).toBe(42_000);
    resumed.resume();
    expect(resumed.submit('Brasil', false).kind).toBe('duplicate');
  });

  it('saves the typo tolerance it started with', () => {
    expect(newGame({ tolerance: 2 }).snapshot().tolerance).toBe(2);
  });

  it('drops saved ids that no longer exist', () => {
    const game = newGame({ saved: { found: ['BRA', 'NOPE'], elapsedMs: 0 } });
    expect(game.foundCount()).toBe(1);
  });
});

describe('records', () => {
  const entry = (found: number, elapsedMs: number): RecordEntry => ({
    found,
    total: 195,
    elapsedMs,
    date: '2026-01-01',
  });

  it('prefers more found, then less time', () => {
    expect(isBetter(entry(50, 900_000), null)).toBe(true);
    expect(isBetter(entry(0, 1000), null)).toBe(false);
    expect(isBetter(entry(51, 900_000), entry(50, 100_000))).toBe(true);
    expect(isBetter(entry(50, 100_000), entry(50, 200_000))).toBe(true);
    expect(isBetter(entry(50, 200_000), entry(50, 200_000))).toBe(false);
    expect(isBetter(entry(49, 1), entry(50, 900_000))).toBe(false);
  });

  it('ranks click games by found, then fewer errors, then time', () => {
    const click = (found: number, errors: number, elapsedMs: number) => ({
      ...entry(found, elapsedMs),
      errors,
    });
    expect(isBetter(click(50, 9, 900_000), click(49, 0, 1))).toBe(true);
    expect(isBetter(click(50, 2, 900_000), click(50, 5, 100_000))).toBe(true);
    expect(isBetter(click(50, 5, 100_000), click(50, 2, 900_000))).toBe(false);
    expect(isBetter(click(50, 2, 100_000), click(50, 2, 200_000))).toBe(true);
    // A record saved before errors were counted loses to the same score with any count.
    expect(isBetter(click(50, 9, 900_000), entry(50, 100_000))).toBe(true);
  });

  it('keeps separate records for different rules', () => {
    const base = {
      gameId: 'digitar-paises',
      layer: 'world',
      territories: false,
      durationMs: 900_000,
      level: 'normal' as const,
    };
    expect(recordKey(base)).not.toBe(recordKey({ ...base, territories: true }));
    expect(recordKey(base)).not.toBe(recordKey({ ...base, gameId: 'digitar-capitais' }));
    expect(recordKey(base)).not.toBe(recordKey({ ...base, level: 'hard' }));
    expect(recordKey(base)).not.toBe(recordKey({ ...base, level: 'custom' }));
  });

  it('keys on the time limit only for custom games', () => {
    const base = {
      gameId: 'digitar-paises',
      layer: 'world',
      territories: false,
      durationMs: 900_000,
    };
    const normal = { ...base, level: 'normal' as const };
    expect(recordKey(normal)).toBe(recordKey({ ...normal, durationMs: null }));
    const custom = { ...base, level: 'custom' as const };
    expect(recordKey(custom)).not.toBe(recordKey({ ...custom, durationMs: null }));
    expect(recordKey(custom)).not.toBe(recordKey({ ...custom, durationMs: 600_000 }));
  });
});
