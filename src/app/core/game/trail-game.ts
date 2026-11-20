import { computed, signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { pairKey } from '../data/proximity';
import { TypoTolerance, buildIndex, matchAnswer } from './answers';
import { FinishReason, GameResult, GameStatus, PlayableGame, SavedGame } from './playable-game';
import { Target } from './targets';
import { Graph, TrailPuzzle, findPuzzle } from './trail-graph';

export type TrailSubmit =
  | { kind: 'ignored' | 'miss' }
  /** A step on the trail (it may have won the game). */
  | { kind: 'step'; target: Target; won: boolean }
  /** The place does not border the last one of the trail. */
  | { kind: 'notBorder'; target: Target; last: Target }
  /** The place the hard level forbids. */
  | { kind: 'forbidden'; target: Target }
  /** Already on the trail: costs nothing. */
  | { kind: 'inTrail'; target: Target };

export interface TrailGameConfig {
  gameId: 'trilha' | 'trilha-dificil';
  /** Defaults to the world map. */
  layer?: Layer;
  /** Everything that can be typed: the whole map. */
  pool: Target[];
  /** Places the origin and the destination are taken from (the chosen continent). */
  askable: Target[];
  graph: Graph;
  /** Borders that exist only through a territory: "ESP|GBR" → ["GIB"]. */
  via: Record<string, string[]>;
  tolerance: TypoTolerance;
  territories: boolean;
  /** For tests: a deterministic random source. */
  random?: () => number;
  saved?: SavedGame;
}

/**
 * Rules of the Trail game: build a trail of places that border one another, from the origin to
 * the destination, within a limited number of guesses. No UI in here. There is no time limit.
 */
export class TrailGame implements PlayableGame {
  readonly gameId: 'trilha' | 'trilha-dificil';
  readonly layer: Layer;
  readonly territories: boolean;
  readonly durationMs = null;
  readonly hard: boolean;
  /** Null when the map has no valid pair (the menu does not offer the game then). */
  readonly puzzle: TrailPuzzle | null;

  readonly status = signal<GameStatus>('playing');
  readonly elapsedMs = signal(0);
  readonly result = signal<GameResult | null>(null);
  /** The trail so far, origin first. */
  readonly trail = signal<readonly string[]>([]);
  readonly guessesUsed = signal(0);

  readonly remainingMs = computed(() => null);
  readonly foundCount = computed(() => Math.max(0, this.trail().length - 1));
  readonly found = computed<ReadonlySet<string>>(() => new Set(this.trail()));
  readonly guessesLeft = computed(() => (this.puzzle?.guesses ?? 0) - this.guessesUsed());
  readonly last = computed(() => this.byId.get(this.trail().at(-1) ?? '') as Target);
  /** Only the forbidden place is shown as "missed" while playing (hatched on the map). */
  readonly revealed = computed<ReadonlySet<string>>(
    () => new Set(this.puzzle?.forbidden ? [this.puzzle.forbidden] : []),
  );

  private readonly byId: Map<string, Target>;
  private readonly graph: Graph;
  private readonly via: Record<string, string[]>;
  private readonly tolerance: TypoTolerance;
  private readonly index;

  constructor(config: TrailGameConfig) {
    this.gameId = config.gameId;
    this.layer = config.layer ?? 'world';
    this.territories = config.territories;
    this.hard = config.gameId === 'trilha-dificil';
    this.graph = config.graph;
    this.via = config.via;
    this.tolerance = config.tolerance;
    this.byId = new Map(config.pool.map((target) => [target.id, target]));
    this.index = buildIndex(config.pool, 'countries');

    const saved = config.saved;
    const puzzle = saved?.puzzle;
    const resume = puzzle && this.valid(puzzle, saved.trail, saved.guesses);
    this.puzzle = resume
      ? puzzle
      : findPuzzle(
          config.askable.map((target) => target.id),
          config.graph,
          this.hard,
          config.random,
        );
    if (!this.puzzle) return;
    this.trail.set(resume ? (saved.trail as string[]) : [this.puzzle.origin]);
    if (resume) {
      this.guessesUsed.set(Math.max(0, saved.guesses ?? 0));
      this.elapsedMs.set(Math.max(0, saved.elapsedMs));
      this.status.set('paused');
    }
  }

  /**
   * A saved game resumes only if it still fits the map data and the level: the borders may have
   * changed since it was saved (a new `npm run data`).
   */
  private valid(puzzle: TrailPuzzle, trail: string[] | undefined, guesses = 0): boolean {
    const known = (id: string | null) => !id || this.byId.has(id);
    const chain = (ids: string[]) =>
      ids.slice(1).every((id, n) => this.graph[ids[n]]?.includes(id));
    return (
      !!trail?.length &&
      trail[0] === puzzle.origin &&
      !!puzzle.forbidden === this.hard &&
      trail.every(known) &&
      [puzzle.origin, puzzle.destination, puzzle.forbidden, ...puzzle.path].every(known) &&
      chain(trail) &&
      chain(puzzle.path) &&
      guesses < puzzle.guesses
    );
  }

  /** Places painted on the map: the trail, the forbidden place, and at the end the best trail. */
  get targets(): Target[] {
    if (!this.puzzle) return [];
    const ids = new Set([...this.trail(), this.puzzle.destination, ...this.puzzle.path]);
    if (this.puzzle.forbidden) ids.add(this.puzzle.forbidden);
    return [...ids].flatMap((id) => this.byId.get(id) ?? []);
  }

  /** What the score is out of: the guesses the player has. */
  get total(): number {
    return this.puzzle?.guesses ?? 0;
  }

  /** The territories that make the border between two places (may be none). */
  viaTerritories(a: string, b: string): string[] {
    return this.via[pairKey(a, b)] ?? [];
  }

  /**
   * Checks a typed place. Every place that is a real answer costs a guess, even one that does
   * not border the last place of the trail; one already on the trail costs nothing.
   */
  submit(raw: string): TrailSubmit {
    const puzzle = this.puzzle;
    if (!puzzle || this.status() !== 'playing') return { kind: 'ignored' };
    const match = matchAnswer(raw, this.index, new Set(), {
      fuzzy: true,
      tolerance: this.tolerance,
    });
    if (match.kind === 'miss') return match;
    const target = match.targets[0];

    if (this.trail().includes(target.id)) return { kind: 'inTrail', target };
    this.guessesUsed.update((used) => used + 1);
    let outcome: TrailSubmit;
    if (target.id === puzzle.forbidden) {
      outcome = { kind: 'forbidden', target };
    } else if (!this.graph[this.last().id]?.includes(target.id)) {
      outcome = { kind: 'notBorder', target, last: this.last() };
    } else {
      this.trail.update((trail) => [...trail, target.id]);
      outcome = { kind: 'step', target, won: target.id === puzzle.destination };
    }
    if (outcome.kind === 'step' && outcome.won) this.finish('complete');
    else if (this.guessesLeft() <= 0) this.finish('guesses');
    return outcome;
  }

  /** Takes the last place off the trail. The guess it cost is not given back. */
  undo(): boolean {
    if (this.status() !== 'playing' || this.trail().length < 2) return false;
    this.trail.update((trail) => trail.slice(0, -1));
    return true;
  }

  tick(deltaMs: number): void {
    if (this.status() === 'playing') this.elapsedMs.update((elapsed) => elapsed + deltaMs);
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
    return this.guessesUsed() > 0;
  }

  snapshot(): SavedGame {
    return {
      v: 1,
      gameId: this.gameId,
      layer: this.layer,
      territories: this.territories,
      found: [...this.trail()],
      elapsedMs: this.elapsedMs(),
      durationMs: null,
      tolerance: this.tolerance,
      puzzle: this.puzzle ?? undefined,
      trail: [...this.trail()],
      guesses: this.guessesUsed(),
    };
  }

  private finish(reason: FinishReason): void {
    this.status.set('finished');
    this.result.set({
      found: reason === 'complete' ? 1 : 0,
      total: 1,
      elapsedMs: this.elapsedMs(),
      reason,
      guesses: this.guessesUsed(),
    });
  }
}
