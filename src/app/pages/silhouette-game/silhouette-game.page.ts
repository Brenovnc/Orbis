import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Continent } from '../../core/data/geo-data.models';
import { proximityFile } from '../../core/data/geo-data.service';
import { ProximityData, nearestIds } from '../../core/data/proximity';
import { borderGraph } from '../../core/game/availability';
import { ClickOutcome } from '../../core/game/click-game';
import { SilhouetteGame, SilhouetteSubmit } from '../../core/game/silhouette-game';
import {
  SILHOUETTE_HINTS,
  SilhouetteHint,
  lettersHint,
  neighborsHint,
} from '../../core/game/silhouette-hints';
import { Target } from '../../core/game/targets';
import { Graph } from '../../core/game/trail-graph';
import { SilhouetteMode } from '../../core/settings.service';
import { StringKey } from '../../core/i18n/strings';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { GameIconComponent, GameIconName } from '../../shared/ui/game-icon.component';
import { OutOfPlayCardComponent } from '../../shared/out-of-play/out-of-play-card.component';
import { OutOfPlayKeyComponent } from '../../shared/out-of-play/out-of-play-key.component';
import { MapMarker } from '../../shared/map/map-state.service';
import { SilhouetteComponent } from '../../shared/silhouette/silhouette.component';
import { TargetListComponent } from '../../shared/target-list/target-list.component';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

/**
 * How many of the nearest places the surroundings may reach. Not just one: it may be an atoll of
 * one pixel, or near a far island that is not the part drawn (Kiribati, New Zealand).
 */
const NEAR_PLACES = 10;

/** Room (px) for the hint cards: at least this much, up to this far from the edge or keyboard. */
const MIN_HINTS_HEIGHT = 96;
const HINTS_MARGIN = 8;

/** A hint already given, as its card shows it. */
interface HintCard {
  hint: SilhouetteHint;
  icon: GameIconName;
  title: string;
  /** The answer under the title: names of places, or the letter and the number of letters. */
  value: string;
  /** The same hint as a sentence for the message under the bar. */
  said: string;
}

/**
 * Silhouettes game: the outline of a place is shown and the player names it: picking one of 4
 * choices with the surroundings drawn, typing with optional hints, or typing from the outline
 * alone. When it is right (or shown), the place lights up on the map and its info card opens.
 */
@Component({
  selector: 'app-silhouette-game-page',
  imports: [
    GameFrameComponent,
    GameIconComponent,
    TargetListComponent,
    InfoBoxComponent,
    OutOfPlayCardComponent,
    OutOfPlayKeyComponent,
    SilhouetteComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pagehide)': 'save()',
    '(window:resize)': 'updateVisibleHeight()',
    '(document:keydown.escape)': 'onEscape()',
    '(document:keydown)': 'onKey($event)',
  },
  template: `
    @if (game(); as g) {
      <app-game-frame
        [time]="clock()"
        [progress]="g.foundCount() + '/' + g.total"
        [errors]="g.errors()"
        [typed]="true"
        [status]="g.status()"
        [result]="g.result()"
        [record]="record()"
        [skippable]="true"
        [canSkip]="g.queue().length > 1"
        [tallBar]="g.mode === 'choices' && g.status() !== 'finished'"
        (menu)="goToMenu()"
        (togglePause)="togglePause()"
        (restart)="restart()"
        (replay)="replay()"
        (giveUp)="giveUp()"
        (skip)="skip(g)"
        (settings)="openSettings()"
      >
        <!-- Without the field, the lines stay on the strips the side columns leave free on phones. -->
        <div
          class="mx-auto flex w-full max-w-xl flex-col items-center gap-0.5"
          [class]="g.mode === 'choices' ? 'min-h-[5.25rem] justify-between md:min-h-0' : ''"
        >
          <p class="bar-line truncate font-sans text-sm leading-snug md:text-lg">
            {{ i18n.t(layer === 'brazil' ? 'silhouette.which.states' : 'silhouette.which') }}
            @if (g.mode === 'hints' && g.current(); as asked) {
              <span class="text-ink-muted">· {{ placeText(asked) }}</span>
            }
          </p>
          @if (g.mode !== 'choices') {
            <label class="sr-only" for="answer">{{ prompt() }}</label>
            <input
              #answer
              id="answer"
              type="text"
              class="w-full rounded-lg border border-line bg-white/85 px-3 py-1.5 font-sans text-base shadow-inner disabled:opacity-60 md:text-xl"
              [class.animate-shake]="shaking()"
              [placeholder]="prompt()"
              [disabled]="g.status() !== 'playing' || !g.current()"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
              (animationend)="shaking.set(false)"
              (input)="submit(answer, false)"
              (keydown.enter)="submit(answer, true)"
            />
          }
          <p class="bar-line bar-feedback truncate font-sans" aria-live="polite">
            @if (feedback(); as f) {
              <span class="font-medium">{{ icon[f.kind] }} {{ f.text }}</span>
            }
          </p>
        </div>

        @if (g.status() !== 'finished' && g.choices(); as set) {
          <div
            answers
            class="mx-auto grid w-full max-w-xl grid-cols-2 gap-1.5 px-3 pt-1 pb-0.5"
            role="group"
            [attr.aria-label]="i18n.t('silhouette.choices')"
            [class.animate-shake]="shaking()"
            (animationend)="shaking.set(false)"
          >
            <!-- By position, so the focus stays put from one question to the next. -->
            @for (id of set.options; track $index) {
              @let wrong = set.wrong.includes(id);
              <button
                type="button"
                class="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-center leading-tight font-medium"
                [class]="
                  (wrong
                    ? 'cursor-default border-missed-edge bg-missed/40 line-through'
                    : 'border-line bg-white/85 hover:bg-accent-soft disabled:opacity-60') +
                  (nameOf(id).length > 26 ? ' text-xs' : ' text-sm')
                "
                [disabled]="g.status() !== 'playing'"
                [attr.aria-disabled]="wrong"
                [attr.aria-keyshortcuts]="$index + 1"
                (click)="choose(id)"
              >
                @if (wrong) {
                  <span aria-hidden="true">✗</span>
                  <span class="sr-only">{{ i18n.t('silhouette.wrongChoice') }}</span>
                } @else {
                  <span
                    class="grid size-5 shrink-0 place-items-center rounded bg-black/5 text-xs text-ink-muted tabular-nums pointer-coarse:hidden"
                    aria-hidden="true"
                    >{{ $index + 1 }}</span
                  >
                }
                <span class="line-clamp-3 min-w-0">{{ nameOf(id) }}</span>
              </button>
            }
          </div>
        }

        @if (g.mode === 'hints') {
          <button
            gameAction
            type="button"
            class="action-btn justify-center px-3 tabular-nums hover:bg-black/5 disabled:opacity-40 md:text-[0.8125rem]"
            [disabled]="g.status() !== 'playing' || !g.nextHint()"
            [title]="hintTitle(g)"
            (click)="useHint(g)"
          >
            <svg
              viewBox="0 0 20 20"
              class="size-4 fill-none stroke-current stroke-2"
              aria-hidden="true"
            >
              <path [attr.d]="bulb" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ i18n.t('silhouette.hint') }} {{ g.hints().length }}/{{ hintCount }}
          </button>
        }

        <div end>
          <app-target-list
            [targets]="g.targets"
            [found]="g.found()"
            mode="countries"
            [layer]="layer"
            [reveal]="true"
            (picked)="pick($event)"
          />
          <app-out-of-play-key />
        </div>
      </app-game-frame>

      @if (g.status() !== 'finished' && g.current(); as asked) {
        <!--
          The hints stand next to the silhouette and scroll above the phone's keyboard. Under the
          taller bar of the choices, the silhouette is smaller and to the side, so the place just
          answered shows.
        -->
        <div
          class="fixed z-10 flex items-start gap-2 md:left-4"
          [class]="
            g.mode === 'choices'
              ? 'top-[16rem] left-3 md:top-[16.5rem]'
              : 'top-36 left-1/2 -translate-x-1/2 md:top-44 md:translate-x-0'
          "
        >
          <app-silhouette
            class="w-[min(11rem,42vw)] shrink-0"
            [class]="g.mode === 'choices' ? 'md:w-60' : 'md:w-80'"
            [target]="asked"
            [layer]="layer"
            [near]="near()"
            [surroundings]="g.mode === 'choices' || g.hints().includes('surroundings')"
          />
          @if (g.hints().length > 0) {
            <!-- The padding leaves room for the shadows, which the scroll would cut. -->
            <section
              #hintColumn
              class="-m-2 flex w-[calc(min(12rem,48vw)+1rem)] flex-col gap-2 overflow-y-auto p-2 text-xs md:w-68 md:text-sm"
              [style.max-height.px]="hintsMaxHeight()"
              [attr.aria-label]="i18n.t('silhouette.hints')"
            >
              <h2
                class="flex w-max shrink-0 items-center gap-1.5 rounded-full bg-panel px-3 py-1 text-sm font-bold tracking-wide uppercase shadow-md backdrop-blur-md md:text-base"
              >
                <app-game-icon name="lightbulb" class="shrink-0" />
                {{ i18n.t('silhouette.hints.title') }}
              </h2>
              <ul class="flex flex-col gap-2">
                @for (card of hintCards(g, asked); track card.hint) {
                  <li
                    class="animate-panel-in rounded-2xl bg-panel px-3 py-2 shadow-md backdrop-blur-md"
                  >
                    <p class="flex items-center gap-1.5 font-bold">
                      <app-game-icon [name]="card.icon" class="shrink-0" />
                      {{ card.title }}
                    </p>
                    @if (card.value) {
                      <p class="mt-0.5">{{ card.value }}</p>
                    }
                  </li>
                }
              </ul>
            </section>
          }
        </div>
      }

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" [note]="infoNote()" (closed)="closeInfo()" />
      }
      @if (outOfPlayCard(); as card) {
        <app-out-of-play-card [name]="card.name" [kind]="card.kind" (closed)="closeInfo()" />
      }
    }
  `,
})
export class SilhouetteGamePage extends GamePage<SilhouetteGame> {
  protected readonly icon = FEEDBACK_ICON;
  protected readonly bulb =
    'M7.5 13.5c-.2-1.2-1-1.9-1.6-2.6a5 5 0 1 1 8.2 0c-.6.7-1.4 1.4-1.6 2.6zM8 17h4';
  protected readonly hintCount = SILHOUETTE_HINTS.length;
  protected readonly prompt = () =>
    this.i18n.t(
      this.layer === 'brazil' ? 'silhouette.placeholder.states' : 'silhouette.placeholder',
    );

  /** The place just answered (or shown): it stands out on the map, to see where it is. */
  private readonly lastShown = signal<Target | null>(null);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('answer');
  private readonly hintColumn = viewChild<ElementRef<HTMLElement>>('hintColumn');
  /** Height of the part of the screen the phone's keyboard leaves free. */
  private readonly visibleHeight = signal(0);
  /** The hints never go under the keyboard, where they could not be scrolled into view. */
  protected readonly hintsMaxHeight = signal(MIN_HINTS_HEIGHT);
  private pool = new Map<string, Target>();
  private graph: Graph = {};
  private distances: ProximityData | undefined;

  /** Shapes of the places nearest to the one asked, for its surroundings. */
  protected readonly near = computed(() => {
    const asked = this.game()?.current();
    if (!asked || !this.distances) return [];
    return nearestIds(this.distances, asked.id)
      .slice(0, NEAR_PLACES)
      .flatMap((id) => this.pool.get(id)?.unitIds ?? []);
  });

  constructor() {
    super();

    effect(() => {
      this.mapState.focus.set(new Set(this.lastShown()?.unitIds ?? []));
    });

    // Clicking a place already answered (or shown) reopens its info card; never gives answers away.
    effect(() => {
      const id = this.mapState.selectedId();
      const game = this.game();
      if (!id || !game) return;
      const target = this.targetByUnit().get(id);
      const known =
        target &&
        (game.found().has(target.id) ||
          game.revealed().has(target.id) ||
          game.status() === 'finished');
      untracked(() => {
        if (known) this.infoTarget.set(target);
        else this.mapState.select(null);
      });
    });

    // The keyboard changes the visible part of the screen only, not the size of the window.
    const viewport = window.visualViewport;
    const onResize = () => this.updateVisibleHeight();
    viewport?.addEventListener('resize', onResize);
    inject(DestroyRef).onDestroy(() => viewport?.removeEventListener('resize', onResize));
    this.updateVisibleHeight();

    afterRenderEffect(() => {
      const column = this.hintColumn()?.nativeElement;
      if (!column) return;
      const room = this.visibleHeight() - column.getBoundingClientRect().top - HINTS_MARGIN;
      this.hintsMaxHeight.set(Math.max(MIN_HINTS_HEIGHT, room));
    });
    // A new hint comes into view, if the cards do not all fit.
    afterRenderEffect(() => {
      const hints = this.game()?.hints().length;
      const column = this.hintColumn()?.nativeElement;
      this.hintsMaxHeight();
      if (hints && column) column.scrollTop = column.scrollHeight;
    });

    effect(() => {
      const element = this.input();
      if (element && this.game()?.status() === 'playing') element.nativeElement.focus();
    });
  }

  protected override async loadExtra(): Promise<void> {
    const saved = this.saved.get(this.gameId, this.layer, this.continent);
    const { silhouetteMode, includeTerritories } = this.settings.value();
    await Promise.all([
      this.geo.loadSilhouetteExclusions(),
      this.loadMode(
        saved?.silhouetteMode ?? silhouetteMode,
        saved?.territories ?? includeTerritories,
      ),
    ]);
  }

  /** The distances complete the choices; the hints also use the borders. */
  private async loadMode(mode: SilhouetteMode, territories: boolean): Promise<void> {
    if (mode === 'typing') return;
    await Promise.all([
      this.geo.loadProximity(proximityFile(this.layer, territories)),
      mode === 'hints' ? this.geo.loadNeighbors() : null,
    ]);
  }

  /** A new game follows the current settings, which may need other files. */
  protected override replay(): void {
    const { silhouetteMode, includeTerritories } = this.settings.value();
    void this.loadMode(silhouetteMode, includeTerritories).then(() => super.replay());
  }

  /** Places whose outline is a dot or a square are never asked (but can still be typed). */
  protected override askable(targets: Target[]): Target[] {
    const data = this.geo.silhouetteExcluded();
    if (!data) return targets;
    const excluded = new Set((this.layer === 'brazil' ? data.brazil : data.world).map((x) => x.id));
    return targets.filter((target) => !excluded.has(target.id));
  }

  protected override notAskedReason(): StringKey {
    return 'info.notAsked.outline';
  }

  protected createGame(options: NewGameOptions): SilhouetteGame {
    this.lastShown.set(null);
    this.nonTargets = this.buildNonTargets(options.pool);
    this.pool = new Map(options.pool.map((target) => [target.id, target]));
    const data = this.geo.neighbors();
    this.graph = data ? borderGraph(data, this.layer, options.territories, 'silhuetas') : {};
    this.distances = this.geo.proximity()[proximityFile(this.layer, options.territories)];
    return new SilhouetteGame({
      mode: options.saved?.silhouetteMode ?? this.settings.value().silhouetteMode,
      candidates: this.askable(options.pool),
      distances: this.distances,
      layer: this.layer,
      pool: options.pool,
      targets: options.targets,
      tolerance: options.saved?.tolerance ?? this.settings.value().typoTolerance,
      territories: options.territories,
      durationMs: options.durationMs,
      // A saved game keeps the rules it started with.
      revealAfterErrors:
        options.saved?.revealAfterErrors ?? this.settings.value().revealAfterErrors,
      learnMode: options.saved?.learnMode ?? this.settings.value().learnMode,
      saved: options.saved ?? undefined,
    });
  }

  /** A tiny place has no shape to see on the map: a ring marks it. */
  protected override extraMarkers(): MapMarker[] {
    const target = this.lastShown();
    return target?.tiny ? [{ id: target.id, point: target.place.labelPoint, kind: 'focus' }] : [];
  }

  protected skip(game: SilhouetteGame): void {
    game.skip();
    this.feedback.set(null);
    this.save();
  }

  protected nameOf(id: string): string {
    const target = this.pool.get(id);
    return target ? this.i18n.name(target.place.name) : id;
  }

  /** "Na Europa", or "Na região Norte" in Brazil. */
  protected placeText(target: Target): string {
    if (this.layer === 'brazil') {
      const region = this.geo.region(target.group);
      return region
        ? this.i18n.t('silhouette.in.region', { place: this.i18n.name(region.name) })
        : '';
    }
    return this.i18n.t('silhouette.in', {
      place: this.i18n.continent(target.group as Continent),
    });
  }

  protected hintTitle(game: SilhouetteGame): string {
    const next = game.nextHint();
    return this.i18n.t(next ? `silhouette.hint.next.${next}` : 'silhouette.hint.none');
  }

  protected updateVisibleHeight(): void {
    this.visibleHeight.set(window.visualViewport?.height ?? window.innerHeight);
  }

  protected hintCards(game: SilhouetteGame, asked: Target): HintCard[] {
    return game.hints().map((hint) => this.hintCard(hint, asked));
  }

  private hintCard(hint: SilhouetteHint, asked: Target): HintCard {
    switch (hint) {
      case 'surroundings': {
        // The picture itself is the hint.
        const title = this.i18n.t('silhouette.hint.surroundings');
        return { hint, icon: 'eye', title, value: '', said: title };
      }
      case 'neighbors': {
        const { kind, ids } = neighborsHint(asked.id, this.graph, this.distances);
        const names = ids.map((id) => this.nameOf(id));
        if (kind === 'borders') names.sort((a, b) => this.i18n.compare(a, b));
        // Without a land border the answer says so, and then names the closest places.
        const list = names.join(', ');
        const value =
          kind === 'borders' ? list : `${this.i18n.t('silhouette.hint.nearest')}: ${list}`;
        const title = this.i18n.t('silhouette.hint.borders');
        return { hint, icon: 'grid', title, value, said: `${title}: ${value}` };
      }
      case 'letters': {
        const { letter, n } = lettersHint(this.nameOf(asked.id));
        const title = this.i18n.t('silhouette.hint.letters');
        const value = this.i18n.t('silhouette.hint.lettersValue', { letter, n });
        return { hint, icon: 'a-large-small', title, value, said: `${title}: ${value}` };
      }
    }
  }

  protected useHint(game: SilhouetteGame): void {
    const asked = game.current();
    const hint = game.useHint();
    if (hint && asked) this.say('info', this.hintCard(hint, asked).said, 6000);
    this.save();
    this.input()?.nativeElement.focus();
  }

  /** Keys 1 to 4 pick a choice. */
  protected onKey(event: KeyboardEvent): void {
    if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
    const id = this.game()?.choices()?.options[Number(event.key) - 1];
    if (id) this.choose(id);
  }

  protected choose(id: string): void {
    const game = this.game();
    const outcome = game?.choose(id);
    if (!game || !outcome || outcome.kind === 'ignored') return;
    if (outcome.kind === 'wrong') {
      // The name picked is written on the button, so "that is X" would say nothing new.
      this.say('miss', this.i18n.t('click.notThat'));
      this.onWrong(game, outcome.clicked);
    } else {
      this.onAnswer(outcome);
    }
    this.save();
    this.afterChange(game);
  }

  /** A question answered or shown, or a place answered before. */
  private onAnswer(result: ClickOutcome): void {
    const name = (target: Target) => this.i18n.name(target.place.name);
    switch (result.kind) {
      case 'hit':
        this.say('hit', this.i18n.t('click.correct', { name: name(result.target) }));
        this.sound.play('hit');
        this.reveal(result.target, this.settings.value().infoBox);
        break;
      case 'revealed':
        this.say('info', this.i18n.t('click.itWas', { name: name(result.asked) }), 6000);
        this.sound.play('wrong');
        this.reveal(result.asked, true);
        break;
      case 'known':
        this.say('duplicate', this.i18n.t('typing.dup', { name: name(result.target) }));
        break;
    }
  }

  private onWrong(game: SilhouetteGame, guess: Target): void {
    this.sound.play('wrong');
    this.shaking.set(true);
    this.flashWrong(guess);
    if (game.learnMode) this.infoTarget.set(guess);
  }

  protected submit(element: HTMLInputElement, fuzzy: boolean): void {
    const game = this.game();
    if (!game || !element.value.trim()) return;
    const result: SilhouetteSubmit = game.submit(element.value, fuzzy);

    switch (result.kind) {
      case 'hit':
      case 'revealed':
      case 'known':
        element.value = '';
        this.onAnswer(result);
        break;
      case 'wrong':
        this.say(
          'miss',
          game.learnMode
            ? this.i18n.t('click.thatIs', { name: this.nameOf(result.clicked.id) })
            : this.i18n.t('click.notThat'),
        );
        element.select();
        this.onWrong(game, result.clicked);
        break;
      case 'pending':
        // "Guiné" may still become "Guiné-Bissau": only Enter confirms it.
        this.say(
          'info',
          this.i18n.t('typing.confirm', { name: this.nameOf(result.target.id) }),
          6000,
        );
        break;
      case 'miss':
        // A real place that is not an answer (Greenland...): it teaches, and costs nothing.
        if (this.explainTyped(element.value, [], false)) {
          element.value = '';
        } else if (fuzzy) {
          this.say('miss', this.i18n.t('typing.miss'));
          this.sound.play('wrong');
          this.shaking.set(true);
          element.select();
        }
        break;
      case 'ignored':
        if (this.feedback()?.kind === 'info') this.feedback.set(null);
        return;
    }
    this.save();
    this.afterChange(game);
  }

  /** Lights the place up on the map and (optionally) opens its card. */
  private reveal(target: Target, card: boolean): void {
    this.lastShown.set(target);
    this.pulseUnits([target]);
    this.focusOn([target]);
    if (card) this.infoTarget.set(target);
  }
}
