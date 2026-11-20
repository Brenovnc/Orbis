import { computed, signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { pairKey } from '../data/proximity';
import { TypoTolerance, buildIndex, matchAnswer } from './answers';
import { FinishReason, GameResult, GameStatus, PlayableGame, SavedGame } from './playable-game';
import { Target } from './targets';

export const NEIGHBOR_ROUNDS = 10;

export interface RoundResult {
  /** The place asked in the round. */
  id: string;
  found: number;
  total: number;
}

export type NeighborsSubmit =
  | { kind: 'ignored' | 'miss' | 'subject' }
  /** `notNeighbor`: a real place, but it does not share a border with the one asked. */
  | { kind: 'hit' | 'duplicate' | 'pending' | 'notNeighbor'; targets: Target[] };

export interface NeighborsGameConfig {
  /** Defaults to the world map. */
  layer?: Layer;
  /** Everything that can be typed as an answer: the whole map, not only the chosen continent. */
  pool: Target[];
  /** The places that may be asked (the chosen continent). */
  askable: Target[];
  /** Land borders by id, for the places in `pool`. */
  graph: Record<string, string[]>;
  /** Borders that exist only through a territory: "BRA|FRA" → ["GUF"]. */
  via: Record<string, string[]>;
  tolerance: TypoTolerance;
  territories: boolean;
  /** Time limit; null = no limit (the clock counts up). */
  durationMs: number | null;
  /** Rounds in a game; fewer when there are not enough places with a neighbor. */
  rounds?: number;
  /** For tests: a deterministic random source. */
  random?: () => number;
  saved?: SavedGame;
}

/**
 * Rules of the Neighbors game: a place is asked in each round and the player types its land
 * neighbors. The score is the neighbors found out of all those asked. No UI in here.
 */
export class NeighborsGame implements PlayableGame {
  readonly gameId = 'vizinhos' as const;
  readonly layer: Layer;
  readonly total: number;
  readonly territories: boolean;
  readonly durationMs: number | null;
  /** The places asked, one per round. */
  readonly subjects: string[];

  readonly status = signal<GameStatus>('playing');
  readonly elapsedMs = signal(0);
  readonly result = signal<GameResult | null>(null);
  /** Round being played (0-based). */
  readonly round = signal(0);
  /** Neighbors found in this round. */
  readonly found = signal<ReadonlySet<string>>(new Set());
  /** Neighbors shown after giving up the round (counted as missed). */
  readonly revealed = signal<ReadonlySet<string>>(new Set());
  /** The rounds already played. */
  readonly results = signal<readonly RoundResult[]>([]);
  private readonly hits = signal(0);

  readonly foundCount = this.hits.asReadonly();
  readonly remainingMs = computed(() =>
    this.durationMs === null ? null : Math.max(0, this.durationMs - this.elapsedMs()),
  );
  /** The place whose neighbors are asked now. */
  readonly subject = computed(() => this.byId.get(this.subjects[this.round()]) as Target);
  /** Its neighbors: what the map shows as found or missed. */
  readonly neighbors = computed(() => this.neighborsOf(this.subjects[this.round()]));
  /** Every neighbor found or shown: time to go to the next round. */
  readonly roundOver = computed(
    () => this.found().size + this.revealed().size >= this.neighbors().length,
  );
  readonly isLastRound = computed(() => this.round() === this.subjects.length - 1);

  private readonly byId: Map<string, Target>;
  private readonly graph: Record<string, string[]>;
  private readonly via: Record<string, string[]>;
  private readonly tolerance: TypoTolerance;
  private readonly index;

  constructor(config: NeighborsGameConfig) {
    this.layer = config.layer ?? 'world';
    this.territories = config.territories;
    this.durationMs = config.durationMs;
    this.tolerance = config.tolerance;
    this.graph = config.graph;
    this.via = config.via;
    this.byId = new Map(config.pool.map((target) => [target.id, target]));
    this.index = buildIndex(config.pool, 'countries');

    const saved = config.saved;
    const savedSubjects = saved?.subjects;
    const resume = savedSubjects && this.validSubjects(savedSubjects, saved.round);
    this.subjects = resume
      ? savedSubjects
      : this.pickSubjects(config, config.rounds ?? NEIGHBOR_ROUNDS);
    this.total = this.subjects.reduce((sum, id) => sum + this.neighborsOf(id).length, 0);

    if (resume) {
      this.round.set(saved.round ?? 0);
      this.results.set(saved.results ?? []);
      const mine = new Set(this.neighbors().map((target) => target.id));
      this.found.set(new Set(saved.found.filter((id) => mine.has(id))));
      this.revealed.set(new Set((saved.revealed ?? []).filter((id) => mine.has(id))));
      this.hits.set(
        this.results().reduce((sum, round) => sum + round.found, 0) + this.found().size,
      );
      this.elapsedMs.set(Math.max(0, saved.elapsedMs));
      this.status.set('paused');
    }
  }

  /** The places of this map with a neighbor, in a random order, a round each. */
  private pickSubjects(config: NeighborsGameConfig, rounds: number): string[] {
    const random = config.random ?? Math.random;
    const candidates = config.askable
      .map((target) => target.id)
      .filter((id) => this.neighborsOf(id).length > 0);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, rounds);
  }

  /** A saved game only resumes when its places still exist and still have neighbors. */
  private validSubjects(subjects: string[], round = 0): boolean {
    return (
      subjects.length > 0 &&
      round >= 0 &&
      round < subjects.length &&
      subjects.every((id) => this.neighborsOf(id).length > 0)
    );
  }

  private neighborsOf(id: string | undefined): Target[] {
    return (this.graph[id ?? ''] ?? []).flatMap((other) => this.byId.get(other) ?? []);
  }

  /** The `targets` the shared game page paints on the map: the neighbors of this round. */
  get targets(): Target[] {
    return this.neighbors();
  }

  /** Territories that make the border between the place asked and a neighbor (may be none). */
  viaTerritories(neighborId: string): string[] {
    return this.via[pairKey(this.subject().id, neighborId)] ?? [];
  }

  /**
   * Checks a typed answer. `fuzzy` (Enter) also forgives typos and explains places that are not
   * neighbors; typing only accepts exact neighbors, without a word about anything else.
   */
  submit(raw: string, fuzzy: boolean): NeighborsSubmit {
    if (this.status() !== 'playing' || this.roundOver()) return { kind: 'ignored' };
    const match = matchAnswer(raw, this.index, this.found(), {
      fuzzy,
      tolerance: this.tolerance,
    });
    if (match.kind === 'miss') return match;

    const mine = new Set(this.neighbors().map((target) => target.id));
    const neighbors = match.targets.filter((target) => mine.has(target.id));
    if (neighbors.length > 0) {
      if (match.kind !== 'hit') return { kind: match.kind, targets: neighbors };
      this.found.update((found) => new Set([...found, ...neighbors.map((target) => target.id)]));
      this.hits.update((hits) => hits + neighbors.length);
      return { kind: 'hit', targets: neighbors };
    }
    if (!fuzzy) return { kind: 'ignored' };
    if (match.targets.some((target) => target.id === this.subject().id)) return { kind: 'subject' };
    return { kind: 'notNeighbor', targets: match.targets };
  }

  /** Gives up the round: the neighbors still missing are shown. */
  giveUpRound(): void {
    if (this.status() !== 'playing' || this.roundOver()) return;
    const found = this.found();
    this.revealed.set(
      new Set(
        this.neighbors()
          .map((target) => target.id)
          .filter((id) => !found.has(id)),
      ),
    );
  }

  /** Moves on after a finished round; after the last one the game is over. */
  nextRound(): void {
    if (this.status() !== 'playing' || !this.roundOver()) return;
    this.recordRound();
    if (this.isLastRound()) {
      this.finish('complete');
      return;
    }
    this.round.update((round) => round + 1);
    this.found.set(new Set());
    this.revealed.set(new Set());
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
    return this.results().length > 0 || this.found().size > 0 || this.revealed().size > 0;
  }

  snapshot(): SavedGame {
    return {
      v: 1,
      gameId: this.gameId,
      layer: this.layer,
      territories: this.territories,
      found: [...this.found()],
      revealed: [...this.revealed()],
      elapsedMs: this.elapsedMs(),
      durationMs: this.durationMs,
      tolerance: this.tolerance,
      subjects: this.subjects,
      round: this.round(),
      results: [...this.results()],
    };
  }

  /** Adds the round in progress to the results, once. */
  private recordRound(): void {
    if (this.results().length > this.round()) return;
    const round: RoundResult = {
      id: this.subject().id,
      found: this.found().size,
      total: this.neighbors().length,
    };
    this.results.update((results) => [...results, round]);
  }

  private finish(reason: FinishReason): void {
    this.recordRound();
    this.status.set('finished');
    this.result.set({
      found: this.hits(),
      total: this.total,
      elapsedMs: this.elapsedMs(),
      reason,
    });
  }
}
