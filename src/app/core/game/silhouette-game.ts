import { computed, signal } from '@angular/core';
import { ProximityData } from '../data/proximity';
import type { SilhouetteMode } from '../settings.service';
import { ClickGame, ClickGameConfig, ClickOutcome } from './click-game';
import { TypoTolerance, buildIndex, matchAnswer } from './answers';
import { ChoiceSet, GameResult, SavedGame } from './playable-game';
import { pickChoices } from './silhouette-choices';
import { SILHOUETTE_HINTS, SilhouetteHint } from './silhouette-hints';
import { Target } from './targets';

export type SilhouetteSubmit =
  /** Nothing to say: not a place, or a wrong place while still typing (only Enter judges it). */
  | { kind: 'ignored' | 'miss' }
  /** The right name, but also the start of another place's name: Enter confirms it. */
  | { kind: 'pending'; target: Target }
  | ClickOutcome;

export interface SilhouetteGameConfig extends Omit<ClickGameConfig, 'gameId' | 'clue'> {
  mode: SilhouetteMode;
  /** Everything that can be typed: the whole map, not only the chosen continent. */
  pool: Target[];
  tolerance: TypoTolerance;
  /** Places that can be wrong options (mode with choices); the whole pool by default. */
  candidates?: Target[];
  /** Distances, to complete the options of a small group (mode with choices). */
  distances?: ProximityData;
}

/**
 * Rules of the Silhouettes game: the same questions, errors, skipping and revealing as the click
 * games, but the answer is typed or picked among 4 choices. A right typed answer is the name of
 * the place asked; any other real place is an error (only on Enter, so a half-typed name never
 * counts against the player).
 */
export class SilhouetteGame extends ClickGame {
  readonly mode: SilhouetteMode;
  /** Choices drawn so far, by question: a question skipped comes back with the same ones. */
  private readonly drawn = signal<Readonly<Record<string, ChoiceSet>>>({});
  /** Hints used, by question. */
  private readonly hintsUsed = signal<Readonly<Record<string, number>>>({});

  /** The choices of the question being asked (mode with choices). */
  readonly choices = computed<ChoiceSet | null>(
    () => this.drawn()[this.current()?.id ?? ''] ?? null,
  );
  /** The hints already given on the question being asked. */
  readonly hints = computed<readonly SilhouetteHint[]>(() =>
    SILHOUETTE_HINTS.slice(0, this.hintsUsed()[this.current()?.id ?? ''] ?? 0),
  );
  /** The hint the player would get now; null when there is none left. */
  readonly nextHint = computed<SilhouetteHint | null>(() =>
    this.mode === 'hints' && this.current()
      ? (SILHOUETTE_HINTS[this.hints().length] ?? null)
      : null,
  );
  /** Questions in which a hint was used. */
  readonly hintedQuestions = computed(() => Object.keys(this.hintsUsed()).length);

  private readonly index;
  private readonly tolerance: TypoTolerance;
  private readonly poolById: Map<string, Target>;
  private readonly candidates: Target[];
  private readonly distances: ProximityData | undefined;
  private readonly random: () => number;

  constructor(config: SilhouetteGameConfig) {
    super({ ...config, gameId: 'silhuetas', clue: 'silhouette' });
    this.mode = config.mode;
    this.index = buildIndex(config.pool, 'countries');
    this.tolerance = config.tolerance;
    this.poolById = new Map(config.pool.map((target) => [target.id, target]));
    this.candidates = config.candidates ?? config.pool;
    this.distances = config.distances;
    this.random = config.random ?? Math.random;

    if (config.saved) {
      this.hintsUsed.set(config.saved.hintsUsed ?? {});
      // Choices of places that no longer exist are drawn again.
      const saved = Object.entries(config.saved.choices ?? {}).filter(([id, { options }]) =>
        [id, ...options].every((option) => this.poolById.has(option)),
      );
      this.drawn.set(Object.fromEntries(saved));
    }
    this.drawChoices();
  }

  /** Checks a typed answer. `fuzzy` (Enter) also forgives typos and judges wrong places. */
  submit(raw: string, fuzzy: boolean): SilhouetteSubmit {
    const asked = this.current();
    if (!asked || this.status() !== 'playing') return { kind: 'ignored' };
    const match = matchAnswer(raw, this.index, new Set(), { fuzzy, tolerance: this.tolerance });
    if (match.kind === 'miss') return match;

    if (match.targets.some((target) => target.id === asked.id)) {
      if (match.kind === 'pending') return { kind: 'pending', target: asked };
      return this.click(asked.id);
    }
    if (!fuzzy) return { kind: 'ignored' };
    const guess = match.targets[0];
    // A place answered before costs nothing; any other (even outside the continent) is an error.
    if (this.found().has(guess.id) || this.revealed().has(guess.id)) {
      return { kind: 'known', target: guess };
    }
    return this.wrong(asked, guess);
  }

  /** Picks one of the choices. A wrong one is an error, even a place already answered before. */
  choose(id: string): ClickOutcome {
    const asked = this.current();
    const set = this.choices();
    const picked = this.poolById.get(id);
    const open = set?.options.includes(id) && !set.wrong.includes(id);
    if (!asked || !set || !picked || !open || this.status() !== 'playing') {
      return { kind: 'ignored' };
    }
    let outcome: ClickOutcome;
    if (id === asked.id) {
      outcome = this.click(id);
    } else {
      this.drawn.update((drawn) => ({
        ...drawn,
        [asked.id]: { ...set, wrong: [...set.wrong, id] },
      }));
      outcome = this.wrong(asked, picked);
    }
    this.drawChoices();
    return outcome;
  }

  /** Gives the next hint of the question being asked. */
  useHint(): SilhouetteHint | null {
    const hint = this.nextHint();
    const asked = this.current();
    if (!hint || !asked || this.status() !== 'playing') return null;
    this.hintsUsed.update((used) => ({ ...used, [asked.id]: (used[asked.id] ?? 0) + 1 }));
    return hint;
  }

  override skip(): void {
    super.skip();
    this.drawChoices();
  }

  override hasProgress(): boolean {
    return super.hasProgress() || this.hintedQuestions() > 0;
  }

  override snapshot(): SavedGame {
    const open = new Set(this.queue());
    return {
      ...super.snapshot(),
      tolerance: this.tolerance,
      silhouetteMode: this.mode,
      choices: Object.fromEntries(Object.entries(this.drawn()).filter(([id]) => open.has(id))),
      hintsUsed: this.hintsUsed(),
    };
  }

  protected override resultExtras(): Partial<GameResult> {
    return this.mode === 'hints' ? { hintedQuestions: this.hintedQuestions() } : {};
  }

  /** Draws the choices of the question being asked, once. */
  private drawChoices(): void {
    const asked = this.current();
    if (this.mode !== 'choices' || !asked || this.drawn()[asked.id]) return;
    const options = pickChoices(asked, this.candidates, this.distances, this.random);
    this.drawn.update((drawn) => ({ ...drawn, [asked.id]: { options, wrong: [] } }));
  }
}
