import { ClickGame, ClickGameConfig, ClickOutcome } from './click-game';
import { TypoTolerance, buildIndex, matchAnswer } from './answers';
import { Target } from './targets';

export type SilhouetteSubmit =
  /** Nothing to say: not a place, or a wrong place while still typing (only Enter judges it). */
  | { kind: 'ignored' | 'miss' }
  /** The right name, but also the start of another place's name: Enter confirms it. */
  | { kind: 'pending'; target: Target }
  | ClickOutcome;

export interface SilhouetteGameConfig extends Omit<ClickGameConfig, 'gameId' | 'clue'> {
  /** Everything that can be typed: the whole map, not only the chosen continent. */
  pool: Target[];
  tolerance: TypoTolerance;
}

/**
 * Rules of the Silhouettes game: the same questions, errors, skipping and revealing as the click
 * games, but the answer is typed. A right answer is the name of the place asked; any other real
 * place is an error (only on Enter, so a half-typed name never counts against the player).
 */
export class SilhouetteGame extends ClickGame {
  private readonly index;
  private readonly tolerance: TypoTolerance;

  constructor(config: SilhouetteGameConfig) {
    super({ ...config, gameId: 'silhuetas', clue: 'silhouette' });
    this.index = buildIndex(config.pool, 'countries');
    this.tolerance = config.tolerance;
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
}
