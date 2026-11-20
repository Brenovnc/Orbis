import { computed, signal } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { ProximityData, directionSector, distanceKm } from '../data/proximity';
import { TypoTolerance, buildIndex, matchAnswer } from './answers';
import { FinishReason, GameResult, GameStatus, PlayableGame, SavedGame } from './playable-game';
import { Target } from './targets';

export interface ProximityGuess {
  target: Target;
  /** Km between the nearest edges (0 = neighbours, or the secret itself). */
  km: number;
  /** Compass sector (0-15, 0 = north) from the guess towards the secret; null for the secret. */
  sector: number | null;
  /** 0 (neighbour, hot) to 5 (far away, cold): the color on the map. */
  heat: number;
}

export type ProximitySubmit =
  | { kind: 'ignored' | 'miss' }
  /** Guessed before: costs nothing. */
  | { kind: 'repeat'; guess: ProximityGuess }
  /** `closest`: nearer than every guess before it. */
  | { kind: 'guess'; guess: ProximityGuess; closest: boolean; won: boolean };

/**
 * Upper limits (km) of the heat levels 1 to 4; 0 is a neighbour and 5 anything farther. Brazil
 * is much smaller than the world, so its scale is tighter.
 */
const HEAT_KM: Record<Layer, number[]> = {
  world: [500, 1500, 3500, 7000],
  brazil: [250, 600, 1200, 2000],
};

export function heatLevel(km: number, layer: Layer): number {
  if (km === 0) return 0;
  const level = HEAT_KM[layer].findIndex((limit) => km <= limit);
  return level === -1 ? 5 : level + 1;
}

export interface ProximityGameConfig {
  /** Defaults to the world map. */
  layer?: Layer;
  /** Everything that can be guessed: the whole map. */
  pool: Target[];
  /** Places the secret is taken from (the chosen continent). */
  askable: Target[];
  data: ProximityData;
  tolerance: TypoTolerance;
  territories: boolean;
  /** For tests: a deterministic random source. */
  random?: () => number;
  saved?: SavedGame;
}

/**
 * Rules of the Proximity game: find a secret place by guessing; each guess tells how far it is
 * from the secret and in which direction the secret lies. No limit of guesses or time; fewer
 * guesses is better. No UI in here.
 */
export class ProximityGame implements PlayableGame {
  readonly gameId = 'proximidade' as const;
  readonly layer: Layer;
  readonly territories: boolean;
  readonly durationMs = null;
  readonly total = 1;
  /** Null only when there is no data to play with. */
  readonly secret: Target | null;

  readonly status = signal<GameStatus>('playing');
  readonly elapsedMs = signal(0);
  readonly result = signal<GameResult | null>(null);
  /** Ids guessed, in the order they were typed. */
  readonly guessed = signal<readonly string[]>([]);

  readonly remainingMs = computed(() => null);
  readonly guesses = computed(() => this.guessed().map((id) => this.describe(id)));
  /** The guesses from nearest to farthest (the secret first, once found). */
  readonly ranked = computed(() => [...this.guesses()].sort((a, b) => this.rank(a) - this.rank(b)));
  readonly found = computed<ReadonlySet<string>>(() => {
    const id = this.secret?.id;
    return new Set(id && this.guessed().includes(id) ? [id] : []);
  });
  readonly foundCount = computed(() => this.found().size);
  /** Nothing is shown before the end; then the shared page hatches the secret if missed. */
  readonly revealed = computed<ReadonlySet<string>>(() => new Set());

  private readonly byId: Map<string, Target>;
  private readonly data: ProximityData;
  private readonly tolerance: TypoTolerance;
  private readonly index;

  constructor(config: ProximityGameConfig) {
    this.layer = config.layer ?? 'world';
    this.territories = config.territories;
    this.data = config.data;
    this.tolerance = config.tolerance;
    // Only places with distances can be played (the data always cover the whole map).
    const known = new Set(config.data.ids);
    const pool = config.pool.filter((target) => known.has(target.id));
    this.byId = new Map(pool.map((target) => [target.id, target]));
    this.index = buildIndex(pool, 'countries');

    const saved = config.saved;
    const resume = saved && this.valid(saved.secret, saved.guessed);
    if (resume) {
      this.secret = this.byId.get(saved.secret as string) as Target;
      this.guessed.set(saved.guessed as string[]);
      this.elapsedMs.set(Math.max(0, saved.elapsedMs));
      this.status.set('paused');
    } else {
      const candidates = config.askable.filter((target) => this.byId.has(target.id));
      const random = config.random ?? Math.random;
      this.secret = candidates[Math.floor(random() * candidates.length)] ?? null;
    }
  }

  /** A saved game resumes only while its places still exist in the data. */
  private valid(secret: string | undefined, guessed: string[] | undefined): boolean {
    return (
      !!secret &&
      this.byId.has(secret) &&
      Array.isArray(guessed) &&
      !guessed.includes(secret) &&
      guessed.every((id) => this.byId.has(id))
    );
  }

  private describe(id: string): ProximityGuess {
    const target = this.byId.get(id) as Target;
    const secret = this.secret as Target;
    if (id === secret.id) return { target, km: 0, sector: null, heat: 0 };
    const km = distanceKm(this.data, id, secret.id);
    return {
      target,
      km,
      sector: directionSector(this.data, id, secret.id),
      heat: heatLevel(km, this.layer),
    };
  }

  /** The secret comes before its neighbours, which are also 0 km away. */
  private rank(guess: ProximityGuess): number {
    return guess.sector === null ? -1 : guess.km;
  }

  /** The `targets` the shared game page paints on the map: only the secret, at the end. */
  get targets(): Target[] {
    return this.secret ? [this.secret] : [];
  }

  /** Checks a guess (Enter only). A place guessed before, or text that is no place, is free. */
  submit(raw: string): ProximitySubmit {
    const secret = this.secret;
    if (!secret || this.status() !== 'playing') return { kind: 'ignored' };
    const match = matchAnswer(raw, this.index, new Set(), {
      fuzzy: true,
      tolerance: this.tolerance,
    });
    if (match.kind === 'miss') return match;
    const id = match.targets[0].id;
    if (this.guessed().includes(id)) return { kind: 'repeat', guess: this.describe(id) };

    const guess = this.describe(id);
    const closest = this.guesses().every((other) => guess.km < other.km);
    this.guessed.update((guessed) => [...guessed, id]);
    const won = id === secret.id;
    if (won) this.finish('complete');
    return { kind: 'guess', guess, closest, won };
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
    return this.guessed().length > 0;
  }

  snapshot(): SavedGame {
    return {
      v: 1,
      gameId: this.gameId,
      layer: this.layer,
      territories: this.territories,
      found: [...this.found()],
      elapsedMs: this.elapsedMs(),
      durationMs: null,
      tolerance: this.tolerance,
      secret: this.secret?.id,
      guessed: [...this.guessed()],
    };
  }

  private finish(reason: FinishReason): void {
    this.status.set('finished');
    this.result.set({
      found: this.found().size,
      total: 1,
      elapsedMs: this.elapsedMs(),
      reason,
      guesses: this.guessed().length,
    });
  }
}
