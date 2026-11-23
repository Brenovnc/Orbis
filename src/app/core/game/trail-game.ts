import { computed, signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { pairKey } from '../data/proximity';
import type { TrailForbidden, TrailLevel } from '../settings.service';
import { TypoTolerance, buildIndex, matchAnswer } from './answers';
import { FinishReason, GameResult, GameStatus, PlayableGame, SavedGame } from './playable-game';
import { Target } from './targets';
import {
  Graph,
  TrailColor,
  TrailDistances,
  TrailHistory,
  TrailPuzzle,
  findPuzzle,
  linkColor,
  nextOutline,
  trailColor,
  trailDistances,
  trailGuesses,
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
  forbidden: TrailForbidden;
  /** False where no place can be forbidden: the game then has none, whatever `forbidden` says. */
  canForbid: boolean;
  /** The graph includes the sea crossings. */
  crossings: boolean;
  /** Last games of this map, to draw a different one. */
  history?: TrailHistory;
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
  readonly forbidden: TrailForbidden;
  readonly crossings: boolean;
  /** True when it continues a saved game. */
  readonly resumed: boolean;
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
  /** The trail closed with as few steps as possible. */
  readonly madeShortest = computed(() => {
    const link = this.link();
    return !!link && link.length === this.puzzle?.path.length;
  });
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
  /** The forbidden places are shown from the start, like missed places. */
  readonly revealed = computed<ReadonlySet<string>>(() => new Set(this.puzzle?.forbidden));

  private readonly byId: Map<string, Target>;
  private readonly graph: Graph;
  private readonly via: Record<string, string[]>;
  private readonly tolerance: TypoTolerance;
  private readonly index;
  private readonly distances: TrailDistances | null = null;
  /** By place, or by pair of places (see `pairKey`). */
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
    this.level = saved?.trailLevel ?? config.level;
    this.forbidden = saved?.trailForbidden ?? config.forbidden;
    this.crossings = config.crossings;
    const chosen = saved?.chosen ?? [];
    const resume = saved?.puzzle && this.valid(saved.puzzle, chosen, saved.outlines ?? []);
    this.resumed = !!resume;
    this.puzzle = resume
      ? (saved.puzzle as TrailPuzzle)
      : findPuzzle(
          config.askable.map((target) => target.id),
          config.graph,
          {
            level: this.level,
            forbidden: config.canForbid ? this.forbidden : 'none',
            history: config.history,
            random: config.random,
          },
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
    // Saves from before there could be several forbidden places.
    if (!Array.isArray(puzzle.forbidden)) return false;
    const ends = [puzzle.origin, puzzle.destination];
    const ids = [...ends, ...puzzle.forbidden, ...puzzle.path, ...chosen, ...outlines];
    return (
      puzzle.guesses === trailGuesses(puzzle.steps, this.level) &&
      ids.every((id) => this.byId.has(id)) &&
      !puzzle.path.some((id) => puzzle.forbidden.includes(id)) &&
      puzzle.path.slice(1).every((id, n) => this.graph[puzzle.path[n]]?.includes(id)) &&
      new Set(chosen).size === chosen.length &&
      !chosen.some((id) => ends.includes(id)) &&
      chosen.length < puzzle.guesses &&
      !trailLink(this.graph, puzzle, chosen)
    );
  }

  /**
   * Places of the base map painting: the forbidden places, and at the end the trail built (the
   * origin and destination are painted by the page, so they are not missed places here).
   */
  get targets(): Target[] {
    if (!this.puzzle) return [];
    const ids = [...this.found(), ...this.puzzle.forbidden];
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

  /** The color of a link between two places, also worked out once. */
  linkColorOf(a: string, b: string): TrailColor {
    if (!this.puzzle) return 'far';
    const key = pairKey(a, b);
    const color = this.colors.get(key) ?? linkColor(this.graph, this.puzzle, a, b);
    this.colors.set(key, color);
    return color;
  }

  /** False for a place the graph links to no other (an island, without sea crossings). */
  hasBorders(id: string): boolean {
    return (this.graph[id]?.length ?? 0) > 0;
  }

  /** The territories that make the border between two places (may be none). */
  viaTerritories(a: string, b: string): string[] {
    return this.via[pairKey(a, b)] ?? [];
  }

  /**
   * Checks a typed place. Every real place typed for the first time costs a guess, even one with
   * no border or a forbidden one. Repeats and the origin or destination cost nothing.
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
      trailForbidden: this.forbidden,
      trailCrossings: this.crossings,
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
