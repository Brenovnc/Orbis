import { computed, signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { pairKey } from '../data/proximity';
import type { TrailLevel } from '../settings.service';
import { TypoTolerance, buildIndex, matchAnswer } from './answers';
import { FinishReason, GameResult, GameStatus, PlayableGame, SavedGame } from './playable-game';
import { Target } from './targets';
import {
  Graph,
  TrailColor,
  TrailDistances,
  TrailPuzzle,
  findPuzzle,
  nextOutline,
  trailColor,
  trailDistances,
  trailLink,
  trailPieces,
} from './trail-graph';

export type TrailSubmit =
  | { kind: 'ignored' | 'miss' }
  /** A new guess: it cost a guess (and may have won the game). */
  | { kind: 'guess'; target: Target; color: TrailColor; won: boolean }
  /** Guessed before: costs nothing. */
  | { kind: 'repeat'; target: Target; color: TrailColor }
  /** The origin or the destination, given from the start: costs nothing. */
  | { kind: 'end'; target: Target };

export interface TrailGuess {
  target: Target;
  color: TrailColor;
}

export interface TrailGameConfig {
  level: TrailLevel;
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
 * Rules of the Trail game: the origin and the destination are given, and the player types places
 * in any order until the guesses contain a chain of borders from one to the other, within a
 * limited number of guesses. No UI in here. There is no time limit.
 */
export class TrailGame implements PlayableGame {
  readonly gameId = 'trilha';
  readonly level: TrailLevel;
  readonly layer: Layer;
  readonly territories: boolean;
  readonly durationMs = null;
  /** Null when the map has no valid pair (the menu does not offer the game then). */
  readonly puzzle: TrailPuzzle | null;

  readonly status = signal<GameStatus>('playing');
  readonly elapsedMs = signal(0);
  readonly result = signal<GameResult | null>(null);
  /** Places guessed, in the order typed (never the origin or the destination). */
  readonly chosen = signal<readonly string[]>([]);
  /** Places whose outline the "next outline" hint showed. */
  readonly outlines = signal<readonly string[]>([]);
  /** The "reveal map" hint was used. */
  readonly mapShown = signal(false);

  readonly guessesUsed = computed(() => this.chosen().length);
  readonly guessesLeft = computed(() => (this.puzzle?.guesses ?? 0) - this.guessesUsed());
  readonly hinted = computed(() => this.outlines().length > 0 || this.mapShown());
  readonly guesses = computed<TrailGuess[]>(() =>
    this.chosen().map((id) => ({ target: this.byId.get(id) as Target, color: this.colorOf(id) })),
  );
  /** The trail the guesses make, origin to destination; null while it is not closed. */
  readonly link = computed(() =>
    this.puzzle ? trailLink(this.graph, this.puzzle, this.chosen()) : null,
  );
  /**
   * What the player built, for the end: the trail that closed, or else the guesses joined to the
   * origin or to the destination.
   */
  readonly playerTrail = computed<readonly string[]>(() => {
    if (!this.puzzle) return [];
    const link = this.link();
    if (link) return link;
    return [
      this.puzzle.origin,
      ...trailPieces(this.graph, this.puzzle, this.chosen()),
      this.puzzle.destination,
    ];
  });
  /** The place the "next outline" hint would show now, or null. */
  readonly nextOutline = computed(() => {
    if (!this.puzzle || !this.distances || this.status() === 'finished') return null;
    const known = new Set([...this.chosen(), ...this.outlines()]);
    return nextOutline(this.graph, this.puzzle, this.distances, known);
  });

  readonly remainingMs = computed(() => null);
  readonly foundCount = this.guessesUsed;
  /** At the end, the trail built is lit as found (the origin and destination have their own look). */
  readonly found = computed<ReadonlySet<string>>(() => {
    if (this.status() !== 'finished' || !this.puzzle) return new Set();
    const { origin, destination } = this.puzzle;
    return new Set(this.playerTrail().filter((id) => id !== origin && id !== destination));
  });
  /** The forbidden place is shown from the start, like a missed place. */
  readonly revealed = computed<ReadonlySet<string>>(
    () => new Set(this.puzzle?.forbidden ? [this.puzzle.forbidden] : []),
  );

  private readonly byId: Map<string, Target>;
  private readonly graph: Graph;
  private readonly via: Record<string, string[]>;
  private readonly tolerance: TypoTolerance;
  private readonly index;
  private readonly distances: TrailDistances | null = null;
  private readonly colors = new Map<string, TrailColor>();

  constructor(config: TrailGameConfig) {
    this.layer = config.layer ?? 'world';
    this.territories = config.territories;
    this.graph = config.graph;
    this.via = config.via;
    this.tolerance = config.tolerance;
    this.byId = new Map(config.pool.map((target) => [target.id, target]));
    this.index = buildIndex(config.pool, 'countries');

    const saved = config.saved;
    // Saves from before the levels have no level: they were the normal Trail.
    this.level = saved ? (saved.trailLevel ?? 'normal') : config.level;
    // Older saves kept the trail in order, origin first.
    const chosen = saved?.chosen ?? saved?.trail?.slice(1) ?? [];
    const resume = saved?.puzzle && this.valid(saved.puzzle, chosen, saved.outlines ?? []);
    this.puzzle = resume
      ? (saved.puzzle as TrailPuzzle)
      : findPuzzle(
          config.askable.map((target) => target.id),
          config.graph,
          this.level === 'hard',
          config.random,
        );
    if (!this.puzzle) return;
    this.distances = trailDistances(this.graph, this.puzzle);
    if (resume) {
      this.chosen.set(chosen);
      this.outlines.set(saved.outlines ?? []);
      this.mapShown.set(!!saved.mapShown && this.level !== 'easy');
      this.elapsedMs.set(Math.max(0, saved.elapsedMs));
      this.status.set('paused');
    }
  }

  /**
   * A saved game resumes only if it still fits the map data and the level: the borders may have
   * changed since it was saved (a new `npm run data`). One already won or out of guesses cannot.
   */
  private valid(puzzle: TrailPuzzle, chosen: string[], outlines: string[]): boolean {
    const known = (id: string | null) => !id || this.byId.has(id);
    const ends = [puzzle.origin, puzzle.destination];
    return (
      !!puzzle.forbidden === (this.level === 'hard') &&
      [...ends, puzzle.forbidden, ...puzzle.path, ...chosen, ...outlines].every(known) &&
      puzzle.path.slice(1).every((id, n) => this.graph[puzzle.path[n]]?.includes(id)) &&
      new Set(chosen).size === chosen.length &&
      !chosen.some((id) => ends.includes(id)) &&
      chosen.length < puzzle.guesses &&
      !trailLink(this.graph, puzzle, chosen)
    );
  }

  /**
   * Places of the base map painting: the forbidden place, and at the end the trail built (the
   * origin and destination are painted by the page, so they are not missed places here).
   */
  get targets(): Target[] {
    if (!this.puzzle) return [];
    const ids = [...this.found()];
    if (this.puzzle.forbidden) ids.push(this.puzzle.forbidden);
    return ids.flatMap((id) => this.byId.get(id) ?? []);
  }

  /** What the score is out of: the guesses the player has. */
  get total(): number {
    return this.puzzle?.guesses ?? 0;
  }

  /** The color of a place; it depends only on the puzzle, so it is worked out once. */
  colorOf(id: string): TrailColor {
    if (!this.puzzle || !this.distances) return 'far';
    let color = this.colors.get(id);
    if (!color) {
      color = trailColor(this.graph, this.puzzle, this.distances, id);
      this.colors.set(id, color);
    }
    return color;
  }

  /** False for a place with no land border at all (an island country). */
  hasBorders(id: string): boolean {
    return (this.graph[id]?.length ?? 0) > 0;
  }

  /** The territories that make the border between two places (may be none). */
  viaTerritories(a: string, b: string): string[] {
    return this.via[pairKey(a, b)] ?? [];
  }

  /**
   * Checks a typed place. Every real place typed for the first time costs a guess, even one with
   * no land border or the forbidden place. Repeats and the origin or destination cost nothing.
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

    if (target.id === puzzle.origin || target.id === puzzle.destination) {
      return { kind: 'end', target };
    }
    const color = this.colorOf(target.id);
    if (this.chosen().includes(target.id)) return { kind: 'repeat', target, color };
    this.chosen.update((chosen) => [...chosen, target.id]);
    const won = this.link() !== null;
    if (won) this.finish('complete');
    else if (this.guessesLeft() <= 0) this.finish('guesses');
    return { kind: 'guess', target, color, won };
  }

  /** The "next outline" hint: shows one more place of a shortest path. Free, no limit. */
  revealOutline(): Target | null {
    const id = this.nextOutline();
    if (!id || this.status() !== 'playing') return null;
    this.outlines.update((outlines) => [...outlines, id]);
    return this.byId.get(id) ?? null;
  }

  /** The "reveal map" hint: the whole map, with borders, for the rest of the game (not on easy). */
  revealMap(): boolean {
    if (this.level === 'easy' || this.mapShown() || this.status() !== 'playing') return false;
    this.mapShown.set(true);
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
    return this.guessesUsed() > 0 || this.hinted();
  }

  snapshot(): SavedGame {
    return {
      v: 1,
      gameId: this.gameId,
      layer: this.layer,
      territories: this.territories,
      found: [...this.chosen()],
      elapsedMs: this.elapsedMs(),
      durationMs: null,
      tolerance: this.tolerance,
      trailLevel: this.level,
      puzzle: this.puzzle ?? undefined,
      chosen: [...this.chosen()],
      outlines: [...this.outlines()],
      mapShown: this.mapShown(),
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
      hinted: this.hinted(),
    });
  }
}
