import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Crossing, pairKey } from '../../core/data/proximity';
import { borderGraph, canForbid, withCrossings } from '../../core/game/availability';
import { PlayedLevel, recordLevel } from '../../core/game/records.service';
import { Target } from '../../core/game/targets';
import { crossingsAlong, crossingsAmong, crossingsIn } from '../../core/game/trail-crossings';
import { TrailGame, TrailGuess } from '../../core/game/trail-game';
import { TrailColor, TrailPuzzle, nextHistory } from '../../core/game/trail-graph';
import { readTrailHistory, saveTrailHistory } from '../../core/game/trail-history';
import { StringKey } from '../../core/i18n/strings';
import { GameFrameComponent, MoreAction } from '../../shared/game-frame/game-frame.component';
import { HelpPopoverComponent } from '../../shared/ui/help-popover.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { ListPanelComponent } from '../../shared/list-panel/list-panel.component';
import { OutOfPlayCardComponent } from '../../shared/out-of-play/out-of-play-card.component';
import { OutOfPlayKeyComponent } from '../../shared/out-of-play/out-of-play-key.component';
import {
  MapLabel,
  MapMarker,
  SeaTrail,
  StepMark,
  TrailPaint,
} from '../../shared/map/map-state.service';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';
import { TrailStep, TrailTimelineComponent } from './trail-timeline.component';

/** The sign of each guess color, so the color is never the only cue. */
const COLOR_ICON: Record<TrailColor, string> = { near: '✓', detour: '~', far: '✗' };
const COLOR_TEXT: Record<TrailColor, StringKey> = {
  near: 'trail.color.near',
  detour: 'trail.color.detour',
  far: 'trail.color.far',
};
const HINT_ICON = {
  outline: 'M6 3.5h6.5l4 5-2.5 8H5.5l-2.5-7z',
  map: 'M3 5.5 7.5 4l5 2L17 4.5v10L12.5 16l-5-2L3 15.5zM7.5 4v10M12.5 6v10',
};

/**
 * Trail game: the origin and the destination are given, and the player types, in any order, the
 * places that link them by land borders (and sea crossings, if on), within a limited number of
 * guesses. Each guess is painted by how useful it is. Easy shows the map; normal and hard hide it.
 */
@Component({
  selector: 'app-trail-game-page',
  imports: [
    GameFrameComponent,
    HelpPopoverComponent,
    InfoBoxComponent,
    ListPanelComponent,
    NgTemplateOutlet,
    OutOfPlayCardComponent,
    OutOfPlayKeyComponent,
    TrailTimelineComponent,
  ],
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
        [hasScore]="g.result()?.reason !== 'gaveup'"
        [record]="record()"
        [hasList]="true"
        [listLabel]="i18n.t('bar.guesses')"
        [tallBar]="!!g.puzzle?.forbidden?.length"
        [listOpen]="listOpen()"
        [moreActions]="hints()"
        (menu)="goToMenu()"
        (togglePause)="togglePause()"
        (restart)="restart()"
        (replay)="replay()"
        (giveUp)="giveUp()"
        (toggleList)="listOpen.set(!listOpen())"
        (moreAction)="useHint(g, $event)"
        (settings)="openSettings()"
      >
        @if (g.puzzle; as puzzle) {
          <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-0.5">
            <p class="bar-line truncate font-sans text-sm leading-snug md:text-lg">
              {{
                i18n.t('trail.goal', {
                  a: nameOf(puzzle.origin),
                  b: nameOf(puzzle.destination),
                })
              }}
              @if (puzzle.forbidden.length > 0) {
                <span class="sr-only">, {{ withoutText(puzzle) }}</span>
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
            <p class="bar-line bar-feedback truncate font-sans" aria-live="polite">
              @if (feedback(); as f) {
                <span class="font-medium">{{ f.icon ?? icon[f.kind] }} {{ f.text }}</span>
              } @else {
                <span class="text-ink-muted"
                  >{{ i18n.t('trail.minSteps', { n: puzzle.steps }) }}
                  @if (g.hinted()) {
                    · {{ i18n.t('frame.hinted') }}
                  }
                </span>
              }
            </p>
          </div>
        }

        <!-- On phones these go to the "⋯" menu instead (moreActions), as they do not fit. -->
        <div gameAction class="hidden md:contents">
          <button
            type="button"
            class="action-btn justify-center px-3 hover:bg-black/5 disabled:opacity-40 md:text-[0.8125rem]"
            [disabled]="g.status() !== 'playing' || !g.nextOutline()"
            [title]="
              i18n.t(g.nextOutline() ? 'trail.hint.outline.title' : 'trail.hint.outline.none')
            "
            (click)="useHint(g, 'outline')"
          >
            <svg
              viewBox="0 0 20 20"
              class="size-4 fill-none stroke-current stroke-2"
              aria-hidden="true"
            >
              <path [attr.d]="hintIcon.outline" stroke-linejoin="round" />
            </svg>
            {{ i18n.t('trail.hint.outline') }}
          </button>
          @if (g.level !== 'easy') {
            <button
              type="button"
              class="action-btn justify-center px-3 hover:bg-black/5 disabled:opacity-40 md:text-[0.8125rem]"
              [disabled]="g.status() !== 'playing' || g.mapShown()"
              [title]="i18n.t('trail.hint.map.title')"
              (click)="useHint(g, 'map')"
            >
              <svg
                viewBox="0 0 20 20"
                class="size-4 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path [attr.d]="hintIcon.map" stroke-linejoin="round" />
              </svg>
              {{ i18n.t('trail.hint.map') }}
            </button>
          }
        </div>

        <app-help-popover endHelp [label]="i18n.t('trail.help')">
          <ng-container [ngTemplateOutlet]="legend" [ngTemplateOutletContext]="{ $implicit: g }" />
        </app-help-popover>

        <div end class="flex flex-col gap-3 text-sm">
          @if (g.puzzle; as puzzle) {
            @if (g.link(); as link) {
              <p class="font-medium">
                @if (g.madeShortest()) {
                  {{ i18n.t('trail.madeShortest') }} <span aria-hidden="true">✓</span>
                } @else {
                  {{ i18n.t('trail.stepsCompared', { n: puzzle.steps, m: link.length - 1 }) }}
                }
              </p>
            }
            <section>
              <h3 [class]="headingClass">{{ i18n.t(mainHeading(g)) }}</h3>
              <app-trail-timeline
                [steps]="stepsOf(g, g.link() ?? puzzle.path)"
                (picked)="pick($event)"
                (hovered)="hover($event)"
              />
            </section>
            @if (g.link() && !g.madeShortest()) {
              <section>
                <h3>
                  <button
                    type="button"
                    [class]="toggleClass"
                    [attr.aria-expanded]="bestOpen()"
                    (click)="toggleBest()"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      class="size-4 shrink-0 fill-none stroke-current stroke-2 text-ink-muted transition-transform"
                      [class.-rotate-90]="!bestOpen()"
                      aria-hidden="true"
                    >
                      <path d="m5 8 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    {{ i18n.t('trail.seeBest') }}
                  </button>
                </h3>
                @if (bestOpen()) {
                  <app-trail-timeline
                    [steps]="stepsOf(g, puzzle.path)"
                    (picked)="pick($event)"
                    (hovered)="hover($event)"
                  />
                }
              </section>
            }
            <section>
              <h3>
                <button
                  type="button"
                  [class]="toggleClass"
                  [attr.aria-expanded]="guessesOpen()"
                  (click)="guessesOpen.set(!guessesOpen())"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="size-4 shrink-0 fill-none stroke-current stroke-2 text-ink-muted transition-transform"
                    [class.-rotate-90]="!guessesOpen()"
                    aria-hidden="true"
                  >
                    <path d="m5 8 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  {{ i18n.t('trail.guessesN', { n: g.guessesUsed() }) }}
                </button>
              </h3>
              @if (guessesOpen()) {
                <ng-container
                  [ngTemplateOutlet]="guessList"
                  [ngTemplateOutletContext]="{ $implicit: g }"
                />
              }
            </section>
          }
        </div>
      </app-game-frame>

      <!-- The forbidden places: up to three names, too long for the bar's line on phones. -->
      @if (g.status() !== 'finished' && g.puzzle; as puzzle) {
        @if (puzzle.forbidden.length > 0) {
          <p
            class="pointer-events-none fixed top-36 left-1/2 z-10 flex w-max max-w-[min(94vw,36rem)] -translate-x-1/2 items-center gap-2 rounded-lg bg-panel px-3 py-1.5 text-xs font-medium shadow-panel backdrop-blur-md md:top-40 md:text-sm"
            aria-hidden="true"
          >
            <span class="forbidden-swatch size-3.5 shrink-0 rounded-sm"></span>
            {{ withoutText(puzzle) }}
          </p>
        }
      }

      @if (g.status() === 'playing' && listOpen()) {
        <app-list-panel
          [heading]="i18n.t('trail.guesses')"
          [lower]="true"
          (closed)="listOpen.set(false)"
        >
          <app-help-popover help [label]="i18n.t('trail.help')">
            <ng-container
              [ngTemplateOutlet]="legend"
              [ngTemplateOutletContext]="{ $implicit: g }"
            />
          </app-help-popover>
          <ng-container
            [ngTemplateOutlet]="guessList"
            [ngTemplateOutletContext]="{ $implicit: g }"
          />
        </app-list-panel>
      }

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" [note]="infoNote()" (closed)="closeInfo()" />
      }
      @if (outOfPlayCard(); as card) {
        <app-out-of-play-card [name]="card.name" [kind]="card.kind" (closed)="closeInfo()" />
      }
    }

    <!-- What the colors and signs mean, in the help of the list and of the end screen. -->
    <ng-template #legend let-g>
      <ul class="flex flex-col gap-1.5">
        @for (color of colors; track color) {
          <li class="flex items-center gap-2">
            <span
              class="size-3.5 shrink-0 rounded-sm bg-(--trail) ring-1 ring-(--trail-edge)"
              [attr.data-trail]="color"
              aria-hidden="true"
            ></span>
            <span class="w-3 shrink-0 text-center font-semibold" aria-hidden="true">{{
              colorIcon[color]
            }}</span>
            {{ i18n.t(colorText[color]) }}
          </li>
        }
        <li class="flex items-center gap-2">
          <span
            class="size-3.5 shrink-0 rounded-sm bg-(--trail) ring-1 ring-(--trail-edge)"
            data-trail="end"
            aria-hidden="true"
          ></span>
          {{ i18n.t('trail.legend.ends') }}
        </li>
        @if (g.puzzle?.forbidden.length) {
          <li class="flex items-center gap-2">
            <span class="forbidden-swatch size-3.5 shrink-0 rounded-sm" aria-hidden="true"></span>
            {{
              i18n.t(
                g.puzzle.forbidden.length === 1
                  ? 'trail.legend.forbidden'
                  : 'trail.legend.forbiddenMany'
              )
            }}
          </li>
        }
        @if (g.crossings) {
          <li class="flex items-center gap-2">
            <span class="shrink-0" aria-hidden="true">– –</span>
            {{ i18n.t('trail.legend.sea') }}
          </li>
        }
        @if (g.status() === 'finished') {
          <li class="flex items-center gap-2">
            <span
              class="size-3.5 shrink-0 rounded-sm bg-found ring-1 ring-found-edge"
              aria-hidden="true"
            ></span>
            {{ i18n.t('trail.legend.yours') }}
          </li>
          @if (g.crossings) {
            <li class="flex items-center gap-2">
              <svg
                viewBox="0 0 12 20"
                class="h-5 w-3.5 shrink-0 fill-none stroke-ink-muted stroke-2"
                aria-hidden="true"
              >
                <path d="M6 0q8 5 0 10t0 10" />
              </svg>
              {{ i18n.t('trail.legend.wave') }}
            </li>
          }
          <li class="flex items-center gap-2">
            <span
              class="grid size-3.5 shrink-0 place-items-center rounded-full bg-(--trail) text-[0.5rem] leading-none font-bold text-white ring-1 ring-(--trail-edge)"
              data-trail="end"
              aria-hidden="true"
              >1</span
            >
            {{ i18n.t('trail.legend.numbers') }}
          </li>
          @if (g.link() && !g.madeShortest()) {
            <li class="flex items-center gap-2">
              <span
                class="size-3.5 shrink-0 rounded-sm bg-[color-mix(in_srgb,var(--color-found)_22%,var(--color-land))] ring-1 ring-found-edge/25"
                aria-hidden="true"
              ></span>
              {{ i18n.t('trail.legend.faded') }}
            </li>
          }
        }
      </ul>
      @if (g.status() === 'finished') {
        <p class="mt-1.5 text-ink-muted">{{ i18n.t('trail.legend.timeline') }}</p>
      }
      @if (g.status() === 'finished') {
        <app-out-of-play-key class="mt-1.5 block" />
      }
    </ng-template>

    <!-- The guesses in the order typed: color, sign and name; a click shows the place. -->
    <ng-template #guessList let-g>
      <ol class="flex flex-col">
        @for (guess of guessesOf(g); track guess.target.id) {
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-accent-soft"
              (click)="pick(guess.target)"
            >
              @if (g.puzzle?.forbidden.includes(guess.target.id)) {
                <span
                  class="forbidden-swatch size-3.5 shrink-0 rounded-sm"
                  aria-hidden="true"
                ></span>
              } @else {
                <span
                  class="size-3.5 shrink-0 rounded-sm bg-(--trail) ring-1 ring-(--trail-edge)"
                  [attr.data-trail]="guess.color"
                  aria-hidden="true"
                ></span>
              }
              <span class="min-w-0 flex-1 truncate font-medium">{{ nameOf(guess.target.id) }}</span>
              <span class="w-4 shrink-0 text-center font-semibold" aria-hidden="true">{{
                colorIcon[guess.color]
              }}</span>
              <span class="sr-only">{{ i18n.t(colorText[guess.color]) }}</span>
            </button>
          </li>
        } @empty {
          <li class="text-sm text-ink-muted">{{ i18n.t('trail.none') }}</li>
        }
      </ol>
    </ng-template>
  `,
  styles: `
    /* A forbidden place: solid terracotta with a cross, as on the map. */
    .forbidden-swatch {
      display: grid;
      place-items: center;
      background: var(--color-missed);
      box-shadow: 0 0 0 1px var(--color-missed-edge);
      color: var(--color-missed-edge);
      font-size: 0.7rem;
      font-weight: 700;
      line-height: 1;
    }
    .forbidden-swatch::before {
      content: '✗';
    }
  `,
})
export class TrailGamePage extends GamePage<TrailGame> {
  protected readonly icon = FEEDBACK_ICON;
  protected readonly colorIcon = COLOR_ICON;
  protected readonly colorText = COLOR_TEXT;
  protected readonly colors: TrailColor[] = ['near', 'detour', 'far'];
  protected readonly hintIcon = HINT_ICON;
  protected readonly headingClass =
    'mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase';
  protected readonly toggleClass =
    'flex min-h-9 w-full items-center gap-1.5 rounded-md text-left text-sm font-semibold hover:bg-accent-soft';
  protected readonly listOpen = signal(window.matchMedia('(min-width: 768px)').matches);
  /** The list of guesses of the end screen. */
  protected readonly guessesOpen = signal(false);
  /** The shortest path of the end screen, next to the player's detour. */
  protected readonly bestOpen = signal(false);
  protected readonly prompt = () =>
    this.i18n.t(this.layer === 'brazil' ? 'trail.placeholder.states' : 'trail.placeholder');

  /** The hints as items of the phone "⋯" menu. */
  protected readonly hints = computed<MoreAction[]>(() => {
    const game = this.game();
    if (!game) return [];
    const playing = game.status() === 'playing';
    const outline: MoreAction = {
      id: 'outline',
      label: this.i18n.t('trail.hint.outline'),
      icon: HINT_ICON.outline,
      title: this.i18n.t('trail.hint.outline.title'),
      disabled: !playing || !game.nextOutline(),
    };
    if (game.level === 'easy') return [outline];
    const map: MoreAction = {
      id: 'map',
      label: this.i18n.t('trail.hint.map'),
      icon: HINT_ICON.map,
      title: this.i18n.t('trail.hint.map.title'),
      disabled: !playing || game.mapShown(),
    };
    return [outline, map];
  });

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('answer');
  private pool = new Map<string, Target>();
  private byUnit = new Map<string, Target>();
  /** Some place of this region can be forbidden. */
  private canForbid = true;
  /** The sea crossings of this game; none without the option. */
  private crossings: Crossing[] = [];

  constructor() {
    super();

    // A new game: the camera frames the origin and the destination.
    effect(() => {
      const puzzle = this.game()?.puzzle;
      if (!puzzle) return;
      untracked(() => this.focusOn(this.targetsOf([puzzle.origin, puzzle.destination])));
    });

    // When the game is over, the camera shows the trail built (and the shortest path, if shown).
    effect(() => {
      const game = this.game();
      const puzzle = game?.puzzle;
      if (!game || !puzzle || game.status() !== 'finished') return;
      untracked(() => this.focusOn(this.targetsOf(this.endIds(game))));
    });

    // The map mirrors the game: what is painted, the numbered trail at the end, the hidden map.
    effect(() => {
      const game = this.game();
      const puzzle = game?.puzzle;
      if (!game || !puzzle) return;
      const finished = game.status() === 'finished';
      const paint = new Map<string, TrailPaint>();
      for (const [id, kind] of this.painted(game)) {
        for (const unitId of this.pool.get(id)?.unitIds ?? []) paint.set(unitId, kind);
      }
      this.mapState.trailPaint.set(paint);
      const trail = this.shownTrail(game);
      this.mapState.steps.set(this.stepMarks(game, trail));
      this.mapState.yoursOnly.set(this.yoursOnly(game));
      this.mapState.yoursOnlyFaded.set(this.bestOpen());
      const hidden = game.level !== 'easy' && !finished && !game.mapShown();
      this.mapState.hidden.set(hidden);
      // On a hidden map, only the crossings between places already on the board.
      const taken = this.takenCrossings(game, trail);
      const board = new Set([puzzle.origin, puzzle.destination, ...game.chosen()]);
      const shown = new Set(hidden ? crossingsAmong(this.crossings, board) : this.crossings);
      for (const { crossing } of taken) shown.delete(crossing);
      this.mapState.seaTrail.set(taken);
      this.mapState.seaLines.set([...shown]);
    });

    // Clicking a place already shown (or anything, once the game is over) opens its info card.
    effect(() => {
      const id = this.mapState.selectedId();
      const game = this.game();
      if (!id || !game) return;
      untracked(() => {
        const target = this.byUnit.get(id);
        const known =
          target && (game.status() === 'finished' || this.revealedIds(game).has(target.id));
        if (known) this.infoTarget.set(target);
        else this.mapState.select(null);
      });
    });

    effect(() => {
      const element = this.input();
      if (element && this.game()?.status() === 'playing') element.nativeElement.focus();
    });
  }

  protected override loadExtra(): Promise<void> {
    return this.geo.loadNeighbors();
  }

  protected override newPlayedLevel(): PlayedLevel {
    return recordLevel(this.gameId, this.layer, this.settings.value(), {
      canForbid: this.canForbid,
      crossings: this.game()?.crossings ?? false,
    });
  }

  protected createGame(options: NewGameOptions): TrailGame {
    this.guessesOpen.set(false);
    this.bestOpen.set(false);
    this.mapState.stepHover.set(null);
    this.pool = new Map(options.pool.map((target) => [target.id, target]));
    this.byUnit = new Map(
      options.pool.flatMap((target) => target.unitIds.map((unitId) => [unitId, target] as const)),
    );
    this.nonTargets = this.buildNonTargets(options.pool);
    const { trailLevel, trailForbidden, trailCrossings } = this.settings.value();
    const ids = options.targets.map((target) => target.id);
    const data = this.geo.neighbors();
    const borders = data ? borderGraph(data, this.layer, options.territories, 'trilha') : {};
    // A saved game keeps the graph it started with; the crossings only exist on the world map.
    const sea = this.geo.crossings();
    const crossings =
      this.layer === 'world' && (options.saved ? !!options.saved.trailCrossings : trailCrossings);
    const region = this.continent && ids;
    this.crossings = crossings && sea ? crossingsIn(sea, options.territories, region) : [];
    const graph =
      crossings && sea ? withCrossings(borders, sea, options.territories, region) : borders;
    this.canForbid = canForbid(ids, graph);
    if (!options.saved && trailForbidden !== 'none' && !this.canForbid && this.continent) {
      this.say(
        'info',
        this.i18n.t('trail.noForbidden', { continent: this.i18n.continent(this.continent) }),
        8000,
      );
    }
    const history = readTrailHistory(this.layer);
    const game = new TrailGame({
      level: trailLevel,
      forbidden: trailForbidden,
      canForbid: this.canForbid,
      crossings,
      history,
      layer: this.layer,
      pool: options.pool,
      askable: options.targets,
      graph,
      // The border-through-a-territory notes only exist with territories off.
      via: this.layer === 'world' && !options.territories ? (data?.world.via ?? {}) : {},
      tolerance: options.saved?.tolerance ?? this.settings.value().typoTolerance,
      territories: options.territories,
      saved: options.saved ?? undefined,
    });
    if (game.puzzle && !game.resumed) {
      saveTrailHistory(this.layer, nextHistory(history, graph, game.puzzle));
    }
    return game;
  }

  /**
   * How each place is painted: origin and destination always; while playing, the outlines shown
   * and the guesses by color (a forbidden place keeps the look of a missed place); at the end,
   * with a shortest path shown, every place of it in the color of "on a shortest path".
   */
  private painted(game: TrailGame): Map<string, TrailPaint> {
    const puzzle = game.puzzle;
    const paint = new Map<string, TrailPaint>();
    if (!puzzle) return paint;
    if (game.status() !== 'finished') {
      for (const id of game.outlines()) paint.set(id, 'hint');
      for (const { target, color } of game.guesses()) {
        if (!puzzle.forbidden.includes(target.id)) paint.set(target.id, color);
      }
    } else if (this.shownTrail(game) === puzzle.path) {
      for (const id of puzzle.path) paint.set(id, 'near');
    }
    paint.set(puzzle.origin, 'end');
    paint.set(puzzle.destination, 'end');
    return paint;
  }

  /**
   * The sea crossings painted as part of a trail, in the color of the link: while playing, those
   * between places of the trail (origin, destination, guesses); at the end, those the numbered
   * trail takes and, if the guesses did not close a trail, those between the guesses.
   */
  private takenCrossings(game: TrailGame, shown: readonly string[]): SeaTrail[] {
    if (!game.puzzle) return [];
    const finished = game.status() === 'finished';
    const places = new Set(finished ? game.playerTrail() : this.trailIds(game));
    const among = game.link() ? [] : crossingsAmong(this.crossings, places);
    return [...new Set([...crossingsAlong(this.crossings, shown), ...among])].map((crossing) => ({
      crossing,
      paint: game.linkColorOf(crossing.a, crossing.b),
    }));
  }

  /**
   * The trail the map numbers at the end: the player's, or a shortest one when it was not closed,
   * or when the player made a detour and opened "see a shortest path". None while playing.
   */
  private shownTrail(game: TrailGame): readonly string[] {
    if (game.status() !== 'finished' || !game.puzzle) return [];
    const { path } = game.puzzle;
    const link = game.link();
    if (!link) return path;
    return !game.madeShortest() && this.bestOpen() ? path : link;
  }

  /** The numbered dots of a trail: the dot of each place in the timeline, with its order. */
  private stepMarks(game: TrailGame, trail: readonly string[]): StepMark[] {
    const kind = trail === game.puzzle?.path ? 'best' : 'yours';
    return this.stepsOf(game, trail).map((step, n) => {
      const { target } = step;
      const what = this.i18n.t(step.text);
      return {
        key: `${kind}-${n}-${target.id}`,
        id: target.id,
        n: n + 1,
        point: target.place.labelPoint,
        unitIds: target.unitIds,
        area: target.place.areaKm2,
        name: this.nameOf(target.id),
        paint: step.paint,
        label: `${n + 1}. ${this.nameOf(target.id)} (${step.sign ? `${step.sign} ` : ''}${what})`,
      };
    });
  }

  /**
   * The places only in the player's trail, not in a shortest path (target and shape ids): they
   * fade while a shortest path is shown. None when the player made a shortest path or no trail.
   */
  private yoursOnly(game: TrailGame): Set<string> {
    const link = game.link();
    if (!link || game.madeShortest() || !game.puzzle) return new Set();
    const best = new Set(game.puzzle.path);
    return new Set(
      this.targetsOf(link.filter((id) => !best.has(id))).flatMap((t) => [t.id, ...t.unitIds]),
    );
  }

  /** The places the end is about: the trail built and the numbered one. */
  private endIds(game: TrailGame): string[] {
    return [...game.playerTrail(), ...this.shownTrail(game)];
  }

  /** The pointer on a place of a timeline: the map highlights it, with no camera move. */
  protected hover(target: Target | null): void {
    this.mapState.stepHover.set(target && { id: target.id, unitIds: target.unitIds });
  }

  /** Opens or closes "see a shortest path": the map follows with the numbers of one trail. */
  protected toggleBest(): void {
    this.bestOpen.update((open) => !open);
    // The timeline of the place that was under the pointer is gone.
    this.hover(null);
  }

  /** The name of the main timeline of the end screen. */
  protected mainHeading(game: TrailGame): StringKey {
    return game.link() ? 'trail.yours' : 'trail.solution';
  }

  /** Origin, destination and the guesses a trail may use. */
  private trailIds(game: TrailGame): string[] {
    const puzzle = game.puzzle;
    if (!puzzle) return [];
    const guesses = game.chosen().filter((id) => !puzzle.forbidden.includes(id));
    return [puzzle.origin, puzzle.destination, ...guesses];
  }

  /** Places whose name the player knows: origin, destination, guesses and the forbidden places. */
  private revealedIds(game: TrailGame): Set<string> {
    const puzzle = game.puzzle;
    if (!puzzle) return new Set();
    return new Set([puzzle.origin, puzzle.destination, ...game.chosen(), ...puzzle.forbidden]);
  }

  /** A tiny place painted has no shape to see: a ring in its paint marks it. */
  protected override extraMarkers(): MapMarker[] {
    const game = this.game();
    if (!game) return [];
    const markers = [...this.painted(game)].flatMap<MapMarker>(([id, kind]) => {
      const target = this.pool.get(id);
      return target?.tiny
        ? [{ id, point: target.place.labelPoint, kind: 'trail', trail: kind }]
        : [];
    });
    // A forbidden place gets a cross over its terracotta fill, so it is not told by color alone.
    for (const target of this.targetsOf(game.puzzle?.forbidden ?? [])) {
      markers.push({ id: `${target.id}-x`, point: target.place.labelPoint, kind: 'forbidden' });
    }
    return markers;
  }

  /**
   * Every place shown has its name on the map; origin and destination always, the others by the
   * same area rule as "names on the map" (small ones only when zoomed in). At the end, the trail
   * built and the routes drawn are named too.
   */
  protected override mapLabels(game: TrailGame): MapLabel[] {
    const puzzle = game.puzzle;
    if (!puzzle) return [];
    const finished = game.status() === 'finished';
    const ids = finished
      ? new Set([...this.endIds(game), ...puzzle.forbidden])
      : this.revealedIds(game);
    const always = new Set([puzzle.origin, puzzle.destination]);
    // The places of the numbered trail are named by their own tag ("1 Zâmbia"), not here.
    const numbered = new Set(this.shownTrail(game));
    return this.targetsOf([...ids].filter((id) => !numbered.has(id))).map((target) => {
      const label = this.mapLabel(target, this.i18n.name(target.place.name));
      return always.has(target.id) ? { ...label, minZoom: 1 } : label;
    });
  }

  private targetsOf(ids: readonly string[]): Target[] {
    return ids.flatMap((id) => this.pool.get(id) ?? []);
  }

  protected guessesOf(game: TrailGame): TrailGuess[] {
    return game.guesses();
  }

  protected nameOf(id: string): string {
    const target = this.pool.get(id);
    return target ? this.i18n.name(target.place.name) : id;
  }

  /** "Sem passar por Alemanha, Polônia ou Itália". */
  protected withoutText(puzzle: TrailPuzzle): string {
    const names = new Intl.ListFormat(this.i18n.lang(), { type: 'disjunction' });
    const x = names.format(puzzle.forbidden.map((id) => this.nameOf(id)));
    return this.i18n.t('trail.without', { x });
  }

  /** The places of a trail, for its timeline. */
  protected stepsOf(game: TrailGame, trail: readonly string[]): TrailStep[] {
    return trail.flatMap((id, n): TrailStep[] => {
      const target = this.pool.get(id);
      if (!target) return [];
      const next = trail[n + 1];
      const step: Pick<TrailStep, 'target' | 'next'> = {
        target,
        next: !next ? null : crossingsAlong(this.crossings, [id, next]).length ? 'sea' : 'land',
      };
      if (n === 0 || !next) {
        const text = n === 0 ? 'trail.end.origin' : 'trail.end.destination';
        return [{ ...step, paint: 'end', sign: '', text }];
      }
      const color = game.colorOf(id);
      return [{ ...step, paint: color, sign: COLOR_ICON[color], text: COLOR_TEXT[color] }];
    });
  }

  protected submit(element: HTMLInputElement): void {
    const game = this.game();
    if (!game || !element.value.trim()) return;
    const result = game.submit(element.value);

    switch (result.kind) {
      case 'guess': {
        element.value = '';
        this.onGuess(game, result.target, result.color);
        break;
      }
      case 'repeat':
        element.value = '';
        this.say('duplicate', this.i18n.t('trail.repeat', { name: this.nameOf(result.target.id) }));
        break;
      case 'end': {
        element.value = '';
        const origin = result.target.id === game.puzzle?.origin;
        const key = origin ? 'trail.isOrigin' : 'trail.isDestination';
        this.say('info', this.i18n.t(key, { name: this.nameOf(result.target.id) }));
        break;
      }
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

  private onGuess(game: TrailGame, target: Target, color: TrailColor): void {
    const name = this.nameOf(target.id);
    const icon = COLOR_ICON[color];
    if (game.puzzle?.forbidden.includes(target.id)) {
      this.say('miss', this.i18n.t('trail.forbidden', { name }), 5000, icon);
      this.sound.play('wrong');
      this.flashWrong(target);
      return;
    }
    if (color === 'far') {
      const key = game.hasBorders(target.id) ? 'trail.far' : 'trail.island';
      this.say('miss', this.i18n.t(key, { name }), 5000, icon);
      this.sound.play('wrong');
    } else {
      const key = color === 'near' ? 'trail.near' : 'trail.detour';
      const text = this.i18n.t(key, { name }) + this.viaNote(game, target.id);
      this.say(color === 'near' ? 'hit' : 'info', text, 5000, icon);
      if (color === 'near') this.sound.play('hit');
    }
    this.pulseUnits([target]);
    if (this.settings.value().infoBox) this.infoTarget.set(target);
  }

  /** Explains a border that exists only through a territory (Gibraltar...). */
  private viaNote(game: TrailGame, id: string): string {
    for (const other of this.revealedIds(game)) {
      const territories = game.viaTerritories(id, other);
      if (other === id || territories.length === 0) continue;
      const names = territories.flatMap((t) => {
        const place = this.geo.place(t);
        return place ? [this.i18n.name(place.name)] : [];
      });
      return this.i18n.t('trail.via', { a: this.nameOf(other), territory: names.join(', ') });
    }
    return '';
  }

  /** What the outline hint says: if there is a sea crossing to a place of the trail, which one. */
  private outlineText(game: TrailGame, target: Target): string {
    const places = this.trailIds(game);
    const crossing = this.crossings.find(({ a, b }) =>
      places.some((id) => pairKey(id, target.id) === pairKey(a, b)),
    );
    if (!crossing) return this.i18n.t('trail.hint.outline.shown');
    const a = this.nameOf(crossing.a === target.id ? crossing.b : crossing.a);
    return this.i18n.t('trail.hint.outline.sea', { a });
  }

  /** Hints are free and unlimited; using one marks the game as "with hints". */
  protected useHint(game: TrailGame, id: string): void {
    if (id === 'outline') {
      const target = game.revealOutline();
      if (target) {
        this.say('info', this.outlineText(game, target));
        this.pulseUnits([target]);
      }
    } else if (id === 'map') {
      game.revealMap();
    }
    this.save();
    this.input()?.nativeElement.focus();
  }
}
