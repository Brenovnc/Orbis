import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  untracked,
  viewChild,
} from '@angular/core';
import { borderGraph } from '../../core/game/availability';
import { Target } from '../../core/game/targets';
import { TrailGame } from '../../core/game/trail-game';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { MapMarker } from '../../shared/map/map-state.service';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

/**
 * Trail game: build a trail of places that border one another, from the origin to the
 * destination, within a limited number of guesses. The hard level adds a forbidden place and
 * draws no borders on the map.
 */
@Component({
  selector: 'app-trail-game-page',
  imports: [GameFrameComponent, InfoBoxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pagehide)': 'save()',
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    @if (game(); as g) {
      <app-game-frame
        [time]="clock()"
        [progress]="g.guessesUsed() + '/' + g.total"
        [progressLabel]="i18n.t('bar.guesses')"
        [status]="g.status()"
        [result]="g.result()"
        [record]="record()"
        (menu)="goToMenu()"
        (togglePause)="togglePause()"
        (restart)="restart()"
        (replay)="replay()"
        (giveUp)="giveUp()"
        (settings)="openSettings()"
      >
        @if (g.puzzle; as puzzle) {
          <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-0.5">
            <p class="bar-line truncate font-sans text-sm leading-snug md:text-lg">
              @if (puzzle.forbidden; as forbidden) {
                {{
                  i18n.t('trail.goalHard', {
                    a: nameOf(puzzle.origin),
                    b: nameOf(puzzle.destination),
                    x: nameOf(forbidden),
                  })
                }}
              } @else {
                {{
                  i18n.t('trail.goal', {
                    a: nameOf(puzzle.origin),
                    b: nameOf(puzzle.destination),
                  })
                }}
              }
            </p>
            <label class="sr-only" for="answer">{{ prompt() }}</label>
            <input
              #answer
              id="answer"
              type="text"
              class="w-full rounded-lg border border-line bg-white/85 px-3 py-1.5 font-sans text-base shadow-inner disabled:opacity-60 md:text-xl"
              [class.animate-shake]="shaking()"
              [placeholder]="prompt()"
              [disabled]="g.status() !== 'playing'"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
              (animationend)="shaking.set(false)"
              (keydown.enter)="submit(answer)"
            />
            <p class="bar-line h-5 truncate font-sans text-xs md:text-sm" aria-live="polite">
              @if (feedback(); as f) {
                <span class="font-medium">{{ icon[f.kind] }} {{ f.text }}</span>
              } @else {
                <!-- The step count comes first so it still shows when a phone cuts the line. -->
                <span class="text-ink-muted"
                  >{{ i18n.t('trail.minSteps', { n: puzzle.steps }) }} ·
                  {{ i18n.t('trail.yours', { path: trailText(g) }) }}</span
                >
              }
            </p>
          </div>
        }

        <button
          gameAction
          type="button"
          class="action-btn w-[5.25rem] justify-center hover:bg-black/5 disabled:opacity-40 md:w-[7rem] md:text-[0.8125rem]"
          [disabled]="g.status() !== 'playing' || g.trail().length < 2"
          (click)="undo(g)"
        >
          <svg
            viewBox="0 0 20 20"
            class="size-4 fill-none stroke-current stroke-2"
            aria-hidden="true"
          >
            <path
              d="M7.5 4.5 4 8l3.5 3.5M4 8h7.5a4.5 4.5 0 0 1 0 9H9"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ i18n.t('trail.undo') }}
        </button>

        <div end class="flex flex-col gap-3 text-sm">
          @if (g.puzzle; as puzzle) {
            <p>
              <span class="text-ink-muted">{{ i18n.t('trail.best') }}</span>
              <strong class="font-semibold"> {{ pathText(puzzle.path) }}</strong>
            </p>
            <p class="text-ink-muted">{{ i18n.t('trail.yours', { path: trailText(g) }) }}</p>
          }
        </div>
      </app-game-frame>

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" (closed)="closeInfo()" />
      }
    }
  `,
})
export class TrailGamePage extends GamePage<TrailGame> {
  protected readonly icon = FEEDBACK_ICON;
  protected readonly prompt = () =>
    this.i18n.t(this.layer === 'brazil' ? 'trail.placeholder.states' : 'trail.placeholder');

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('answer');
  private pool = new Map<string, Target>();

  constructor() {
    super();

    // Origin and destination stand out on the map (all of their shapes).
    effect(() => {
      const puzzle = this.game()?.puzzle;
      if (!puzzle) return;
      const units = [puzzle.origin, puzzle.destination].flatMap(
        (id) => this.pool.get(id)?.unitIds ?? [],
      );
      this.mapState.focus.set(new Set(units));
    });

    // Clicking a place of the trail (or anything, once the game is over) opens its info card.
    effect(() => {
      const id = this.mapState.selectedId();
      const game = this.game();
      if (!id || !game) return;
      const target = this.targetByUnit().get(id);
      const known = target && (game.found().has(target.id) || game.status() === 'finished');
      untracked(() => {
        if (known) this.infoTarget.set(target);
        else this.mapState.select(null);
      });
    });

    effect(() => {
      const element = this.input();
      if (element && this.game()?.status() === 'playing') element.nativeElement.focus();
    });
  }

  protected override usesTimer(): boolean {
    return false;
  }

  protected override loadExtra(): Promise<void> {
    return this.geo.loadNeighbors();
  }

  protected createGame(options: NewGameOptions): TrailGame {
    this.pool = new Map(options.pool.map((target) => [target.id, target]));
    this.nonTargets = this.buildNonTargets(options.pool);
    const id = this.gameId as 'trilha' | 'trilha-dificil';
    const data = this.geo.neighbors();
    const game = new TrailGame({
      gameId: id,
      layer: this.layer,
      pool: options.pool,
      askable: options.targets,
      graph: data ? borderGraph(data, this.layer, options.territories, id) : {},
      // The border-through-a-territory notes only exist with territories off.
      via: this.layer === 'world' && !options.territories ? (data?.world.via ?? {}) : {},
      tolerance: options.saved?.tolerance ?? this.settings.value().typoTolerance,
      territories: options.territories,
      saved: options.saved ?? undefined,
    });
    // The hard level shows the coast only: no border lines and no highlight under the mouse.
    this.mapState.coastOnly.set(game.hard);
    return game;
  }

  /** A tiny origin or destination has no shape to see: a ring marks it. */
  protected override extraMarkers(): MapMarker[] {
    const puzzle = this.game()?.puzzle;
    if (!puzzle) return [];
    return [puzzle.origin, puzzle.destination].flatMap((id) => {
      const target = this.pool.get(id);
      return target?.tiny ? [{ id, point: target.place.labelPoint, kind: 'focus' as const }] : [];
    });
  }

  protected nameOf(id: string): string {
    const target = this.pool.get(id);
    return target ? this.i18n.name(target.place.name) : id;
  }

  protected pathText(ids: readonly string[]): string {
    return ids.map((id) => this.nameOf(id)).join(' → ');
  }

  protected trailText(game: TrailGame): string {
    return this.pathText(game.trail());
  }

  protected submit(element: HTMLInputElement): void {
    const game = this.game();
    if (!game || !element.value.trim()) return;
    const result = game.submit(element.value);
    const name = (target: Target) => this.i18n.name(target.place.name);

    switch (result.kind) {
      case 'step': {
        element.value = '';
        const last = game.trail().at(-2) as string;
        const via = game
          .viaTerritories(last, result.target.id)
          .map((id) => this.geo.place(id))
          .flatMap((place) => (place ? [this.i18n.name(place.name)] : []));
        this.say(
          'hit',
          via.length
            ? this.i18n.t('neighbors.via', {
                a: this.nameOf(last),
                b: name(result.target),
                territory: via.join(', '),
              })
            : name(result.target),
          via.length ? 7000 : undefined,
        );
        this.sound.play('hit');
        this.pulseUnits([result.target]);
        if (this.settings.value().infoBox) this.infoTarget.set(result.target);
        break;
      }
      case 'notBorder':
        this.wrongGuess(
          element,
          this.i18n.t('trail.notBorder', { name: name(result.target), last: name(result.last) }),
        );
        this.flashWrong(result.target);
        break;
      case 'forbidden':
        this.wrongGuess(element, this.i18n.t('trail.forbidden', { name: name(result.target) }));
        this.flashWrong(result.target);
        break;
      case 'inTrail':
        element.value = '';
        this.say('duplicate', this.i18n.t('trail.inTrail', { name: name(result.target) }));
        break;
      case 'miss':
        // A real place that is not an answer teaches instead, and costs nothing.
        if (this.explainTyped(element.value, [...this.pool.values()], true)) {
          element.value = '';
          break;
        }
        this.say('miss', this.i18n.t('typing.miss'));
        this.shaking.set(true);
        element.select();
        break;
      case 'ignored':
        return;
    }
    this.save();
    this.afterChange(game);
  }

  private wrongGuess(element: HTMLInputElement, text: string): void {
    this.say('miss', text, 5000);
    this.sound.play('wrong');
    this.shaking.set(true);
    element.select();
  }

  protected undo(game: TrailGame): void {
    if (game.undo()) {
      this.feedback.set(null);
      this.save();
    }
    this.input()?.nativeElement.focus();
  }
}
