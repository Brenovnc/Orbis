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
import { borderGraph, playableTrailLevel } from '../../core/game/availability';
import { trailRecordId } from '../../core/game/records.service';
import { Target } from '../../core/game/targets';
import { TrailGame, TrailGuess } from '../../core/game/trail-game';
import { TrailColor } from '../../core/game/trail-graph';
import { StringKey } from '../../core/i18n/strings';
import { GameFrameComponent, MoreAction } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { MapLabel, MapMarker, TrailPaint } from '../../shared/map/map-state.service';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

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
 * places that link them by land borders, within a limited number of guesses. Each guess is
 * painted by how useful it is. Easy shows the map; normal and hard hide it.
 */
@Component({
  selector: 'app-trail-game-page',
  imports: [GameFrameComponent, InfoBoxComponent, NgTemplateOutlet],
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
        [hasList]="true"
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

        <div end class="flex flex-col gap-3 text-sm">
          @if (g.puzzle; as puzzle) {
            <ul class="flex flex-col gap-1 text-xs" [attr.aria-label]="i18n.t('trail.guesses')">
              <li class="flex items-center gap-2">
                <span
                  class="size-3.5 shrink-0 rounded-sm bg-found ring-1 ring-found-edge"
                  aria-hidden="true"
                ></span>
                {{ i18n.t('trail.legend.yours') }}
              </li>
              <li class="flex items-center gap-2">
                <span
                  class="size-3.5 shrink-0 rounded-sm border-2 border-dashed border-ink"
                  aria-hidden="true"
                ></span>
                {{ i18n.t('trail.legend.best') }}
              </li>
              <li class="flex items-center gap-2">
                <span
                  class="size-3.5 shrink-0 rounded-sm bg-(--trail) ring-2 ring-(--trail-edge)"
                  data-trail="end"
                  aria-hidden="true"
                ></span>
                {{ i18n.t('trail.legend.ends') }}
              </li>
              @if (puzzle.forbidden) {
                <li class="flex items-center gap-2">
                  <span
                    class="forbidden-swatch size-3.5 shrink-0 rounded-sm"
                    aria-hidden="true"
                  ></span>
                  {{ i18n.t('trail.legend.forbidden') }}
                </li>
              }
            </ul>
            <p>
              <span class="text-ink-muted">{{ i18n.t('trail.best') }}</span>
              <strong class="font-semibold"> {{ pathText(puzzle.path) }}</strong>
            </p>
            @if (g.link(); as link) {
              <p>
                <span class="text-ink-muted">{{ i18n.t('trail.yours') }}</span>
                <strong class="font-semibold"> {{ pathText(link) }}</strong>
              </p>
            }
            <section>
              <h3 class="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                {{ i18n.t('trail.guesses') }}
              </h3>
              <ng-container
                [ngTemplateOutlet]="guessList"
                [ngTemplateOutletContext]="{ $implicit: g }"
              />
            </section>
          }
        </div>
      </app-game-frame>

      @if (g.status() === 'playing' && listOpen()) {
        <aside
          data-map-cover
          class="fixed inset-x-0 bottom-0 z-10 h-[40dvh] animate-panel-in overflow-y-auto rounded-t-2xl bg-panel p-3 shadow-panel backdrop-blur-md md:inset-x-auto md:top-36 md:right-3 md:bottom-36 md:h-auto md:w-72 md:rounded-2xl"
          [attr.aria-label]="i18n.t('trail.guesses')"
        >
          <h2 class="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {{ i18n.t('trail.guesses') }}
          </h2>
          <ng-container
            [ngTemplateOutlet]="guessList"
            [ngTemplateOutletContext]="{ $implicit: g }"
          />
        </aside>
      }

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" (closed)="closeInfo()" />
      }
    }

    <!-- The guesses in the order typed: color, sign and name; a click shows the place. -->
    <ng-template #guessList let-g>
      <p class="mb-1.5 flex flex-wrap gap-x-3 text-xs text-ink-muted">
        @for (color of colors; track color) {
          <span>{{ colorIcon[color] }} {{ i18n.t(colorText[color]) }}</span>
        }
      </p>
      <ol class="flex flex-col">
        @for (guess of guessesOf(g); track guess.target.id) {
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-accent-soft"
              (click)="pick(guess.target)"
            >
              @if (guess.target.id === g.puzzle?.forbidden) {
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
    /* The forbidden place: solid terracotta with a cross, as on the map. */
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
  protected readonly listOpen = signal(window.matchMedia('(min-width: 768px)').matches);
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

  constructor() {
    super();

    // A new game: the camera frames the origin and the destination.
    effect(() => {
      const puzzle = this.game()?.puzzle;
      if (!puzzle) return;
      untracked(() => this.focusOn(this.targetsOf([puzzle.origin, puzzle.destination])));
    });

    // When the game is over, the camera shows the trail built and a shortest path.
    effect(() => {
      const game = this.game();
      const puzzle = game?.puzzle;
      if (!game || !puzzle || game.status() !== 'finished') return;
      untracked(() => this.focusOn(this.targetsOf([...game.playerTrail(), ...puzzle.path])));
    });

    // The map mirrors the game: what is painted, the shortest path at the end, the hidden map.
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
      const route = finished ? this.targetsOf(puzzle.path).flatMap((t) => t.unitIds) : [];
      this.mapState.route.set(new Set(route));
      this.mapState.hidden.set(game.level !== 'easy' && !finished && !game.mapShown());
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

  protected override recordId(): string {
    return trailRecordId(this.game()?.level ?? this.settings.value().trailLevel);
  }

  protected createGame(options: NewGameOptions): TrailGame {
    this.pool = new Map(options.pool.map((target) => [target.id, target]));
    this.byUnit = new Map(
      options.pool.flatMap((target) => target.unitIds.map((unitId) => [unitId, target] as const)),
    );
    this.nonTargets = this.buildNonTargets(options.pool);
    const data = this.geo.neighbors();
    const graph = data ? borderGraph(data, this.layer, options.territories, 'trilha') : {};
    const wanted = this.settings.value().trailLevel;
    const level = playableTrailLevel(
      wanted,
      options.targets.map((target) => target.id),
      graph,
    );
    if (!options.saved && level !== wanted && this.continent) {
      this.say(
        'info',
        this.i18n.t('trail.hardFallback', { continent: this.i18n.continent(this.continent) }),
        8000,
      );
    }
    return new TrailGame({
      level,
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
  }

  /**
   * How each place is painted: origin and destination always; while playing, the outlines shown
   * and the guesses by color (the forbidden place keeps the look of a missed place).
   */
  private painted(game: TrailGame): Map<string, TrailPaint> {
    const puzzle = game.puzzle;
    const paint = new Map<string, TrailPaint>();
    if (!puzzle) return paint;
    if (game.status() !== 'finished') {
      for (const id of game.outlines()) paint.set(id, 'hint');
      for (const { target, color } of game.guesses()) {
        if (target.id !== puzzle.forbidden) paint.set(target.id, color);
      }
    }
    paint.set(puzzle.origin, 'end');
    paint.set(puzzle.destination, 'end');
    return paint;
  }

  /** Places whose name the player knows: origin, destination, guesses and the forbidden place. */
  private revealedIds(game: TrailGame): Set<string> {
    const puzzle = game.puzzle;
    if (!puzzle) return new Set();
    const ids = new Set([puzzle.origin, puzzle.destination, ...game.chosen()]);
    if (puzzle.forbidden) ids.add(puzzle.forbidden);
    return ids;
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
    // The forbidden place gets a cross over its terracotta fill, so it is not told by color alone.
    const forbidden = game.puzzle?.forbidden;
    const target = forbidden ? this.pool.get(forbidden) : undefined;
    if (forbidden && target) {
      markers.push({ id: `${forbidden}-x`, point: target.place.labelPoint, kind: 'forbidden' });
    }
    return markers;
  }

  /**
   * Every place shown has its name on the map; origin and destination always, the others by the
   * same area rule as "names on the map" (small ones only when zoomed in). At the end, the trail
   * built and the shortest path are named too.
   */
  protected override mapLabels(game: TrailGame): MapLabel[] {
    const puzzle = game.puzzle;
    if (!puzzle) return [];
    const finished = game.status() === 'finished';
    const ids = finished
      ? new Set([...game.playerTrail(), ...puzzle.path, puzzle.forbidden ?? ''])
      : this.revealedIds(game);
    const always = new Set([puzzle.origin, puzzle.destination]);
    return this.targetsOf([...ids]).map((target) => {
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

  protected pathText(ids: readonly string[]): string {
    return ids.map((id) => this.nameOf(id)).join(' → ');
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
    if (target.id === game.puzzle?.forbidden) {
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

  /** Explains a border that exists only through a territory (Spain–United Kingdom: Gibraltar). */
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

  /** Hints are free and unlimited; using one marks the game as "with hints". */
  protected useHint(game: TrailGame, id: string): void {
    if (id === 'outline') {
      const target = game.revealOutline();
      if (target) {
        this.say('info', this.i18n.t('trail.hint.outline.shown'));
        this.pulseUnits([target]);
      }
    } else if (id === 'map') {
      game.revealMap();
    }
    this.save();
    this.input()?.nativeElement.focus();
  }
}
