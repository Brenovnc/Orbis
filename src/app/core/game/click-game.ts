import { computed, signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { ClickGameId } from '../games';
import { normalizeAnswer } from './answers';
import { FinishReason, GameResult, GameStatus, PlayableGame, SavedGame } from './playable-game';
import { Target } from './targets';

export type ClueKind = 'name' | 'capital' | 'flag';

export type ClickOutcome =
  | { kind: 'ignored' }
  /** Clicked a place already answered (or shown): no penalty. */
  | { kind: 'known'; target: Target }
  | { kind: 'hit'; target: Target }
  | { kind: 'wrong'; clicked: Target; asked: Target; errorsOnQuestion: number }
  /** Too many wrong clicks: the answer is shown and the game moves on. */
  | { kind: 'revealed'; clicked: Target; asked: Target };

export interface ClickGameConfig {
  gameId: ClickGameId;
  /** Defaults to the world map. */
  layer?: Layer;
  clue: ClueKind;
  targets: Target[];
  territories: boolean;
  durationMs: number | null;
  /** Wrong clicks on one question before the answer is shown; 0 = never. */
  revealAfterErrors: number;
  /** After a wrong click, tell the player which place was clicked. */
  learnMode: boolean;
  /** For tests: a deterministic random source. */
  random?: () => number;
  saved?: SavedGame;
}

/** Rules of the three click games: a question queue, score, errors, skip and reveal. */
export class ClickGame implements PlayableGame {
  readonly gameId: ClickGameId;
  readonly layer: Layer;
  readonly clue: ClueKind;
  readonly targets: Target[];
  readonly total: number;
  readonly territories: boolean;
  readonly durationMs: number | null;
  readonly learnMode: boolean;

  readonly status = signal<GameStatus>('playing');
  readonly found = signal<ReadonlySet<string>>(new Set());
  readonly revealed = signal<ReadonlySet<string>>(new Set());
  readonly elapsedMs = signal(0);
  readonly result = signal<GameResult | null>(null);
  readonly errors = signal(0);
  /** Ids still to ask, next one first. */
  readonly queue = signal<readonly string[]>([]);
  private readonly currentErrors = signal(0);

  readonly foundCount = computed(() => this.found().size);
  readonly remainingMs = computed(() =>
    this.durationMs === null ? null : Math.max(0, this.durationMs - this.elapsedMs()),
  );
  /** The place the player has to find now. */
  readonly current = computed(() => {
    const id = this.queue()[0];
    return id === undefined ? null : (this.byId.get(id) ?? null);
  });

  private readonly byId: Map<string, Target>;
  private readonly revealAfterErrors: number;

  constructor(config: ClickGameConfig) {
    this.gameId = config.gameId;
    this.layer = config.layer ?? 'world';
    this.clue = config.clue;
    this.targets = config.targets;
    this.total = config.targets.length;
    this.territories = config.territories;
    this.durationMs = config.durationMs;
    this.revealAfterErrors = config.revealAfterErrors;
    this.learnMode = config.learnMode;
    this.byId = new Map(config.targets.map((target) => [target.id, target]));

    const random = config.random ?? Math.random;
    const saved = config.saved;
    if (!saved) {
      this.queue.set(
        shuffle(
          config.targets.map((target) => target.id),
          random,
        ),
      );
      return;
    }

    const known = (ids: string[] | undefined) => (ids ?? []).filter((id) => this.byId.has(id));
    this.found.set(new Set(known(saved.found)));
    this.revealed.set(new Set(known(saved.revealed)));
    this.errors.set(Math.max(0, saved.errors ?? 0));
    this.currentErrors.set(Math.max(0, saved.currentErrors ?? 0));
    this.elapsedMs.set(Math.max(0, saved.elapsedMs));
    this.status.set('paused');

    // Keep the saved order; anything unanswered that the order forgot goes to the end.
    const answered = new Set([...this.found(), ...this.revealed()]);
    const queue = known(saved.queue).filter((id) => !answered.has(id));
    const missing = config.targets
      .map((t) => t.id)
      .filter((id) => !answered.has(id) && !queue.includes(id));
    this.queue.set([...queue, ...shuffle(missing, random)]);
    if (this.queue().length === 0) this.finish('complete');
  }

  /** Every target that counts as a right answer for the question being asked. */
  acceptedIds(asked: Target): Set<string> {
    if (this.clue !== 'capital') return new Set([asked.id]);
    // Several places can share a capital name (Kingston): any of them is right.
    const shown = capitalKeys(asked);
    return new Set(
      this.targets
        .filter((t) => [...capitalKeys(t)].some((key) => shown.has(key)))
        .map((t) => t.id),
    );
  }

  /** The player clicked a target (the map already turned the click into a target id). */
  click(targetId: string): ClickOutcome {
    const asked = this.current();
    const clicked = this.byId.get(targetId);
    if (this.status() !== 'playing' || !asked || !clicked) return { kind: 'ignored' };
    if (this.found().has(clicked.id) || this.revealed().has(clicked.id)) {
      return { kind: 'known', target: clicked };
    }

    if (this.acceptedIds(asked).has(clicked.id)) {
      this.found.update((found) => new Set([...found, clicked.id]));
      this.removeFromQueue(clicked.id);
      return { kind: 'hit', target: clicked };
    }

    this.errors.update((count) => count + 1);
    this.currentErrors.update((count) => count + 1);
    if (this.revealAfterErrors > 0 && this.currentErrors() >= this.revealAfterErrors) {
      this.revealed.update((revealed) => new Set([...revealed, asked.id]));
      this.removeFromQueue(asked.id);
      return { kind: 'revealed', clicked, asked };
    }
    return { kind: 'wrong', clicked, asked, errorsOnQuestion: this.currentErrors() };
  }

  /** Puts the current question at the end of the queue. */
  skip(): void {
    const queue = this.queue();
    if (this.status() !== 'playing' || queue.length < 2) return;
    this.queue.set([...queue.slice(1), queue[0]]);
    this.currentErrors.set(0);
  }

  tick(deltaMs: number): void {
    if (this.status() !== 'playing') return;
    const limit = this.durationMs ?? Infinity;
    this.elapsedMs.update((elapsed) => Math.min(limit, elapsed + deltaMs));
    if (this.elapsedMs() >= limit) this.finish('timeout');
  }

  pause(): void {
    if (this.status() === 'playing') this.status.set('paused');
  }

  resume(): void {
    if (this.status() === 'paused') this.status.set('playing');
  }

  giveUp(): void {
    if (this.status() !== 'finished') this.finish('gaveup');
  }

  hasProgress(): boolean {
    return this.foundCount() > 0 || this.revealed().size > 0 || this.errors() > 0;
  }

  /** Targets not answered correctly: shown answers and those never asked. */
  missed(): Target[] {
    const found = this.found();
    return this.targets.filter((target) => !found.has(target.id));
  }

  snapshot(): SavedGame {
    return {
      v: 1,
      gameId: this.gameId,
      layer: this.layer,
      territories: this.territories,
      found: [...this.found()],
      revealed: [...this.revealed()],
      queue: [...this.queue()],
      errors: this.errors(),
      currentErrors: this.currentErrors(),
      elapsedMs: this.elapsedMs(),
      durationMs: this.durationMs,
      revealAfterErrors: this.revealAfterErrors,
      learnMode: this.learnMode,
    };
  }

  private removeFromQueue(id: string): void {
    this.queue.update((queue) => queue.filter((queued) => queued !== id));
    this.currentErrors.set(0);
    if (this.queue().length === 0) this.finish('complete');
  }

  private finish(reason: FinishReason): void {
    this.status.set('finished');
    this.result.set({
      found: this.foundCount(),
      total: this.total,
      elapsedMs: this.elapsedMs(),
      reason,
      errors: this.errors(),
    });
  }
}

/** Normalized capital names (both languages) of a target. */
function capitalKeys(target: Target): Set<string> {
  return new Set(
    target.place.capitals
      .flatMap((capital) => [capital.name.pt, capital.name.en])
      .map(normalizeAnswer),
  );
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
