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
import { proximityFile } from '../../core/data/geo-data.service';
import { approxKm } from '../../core/data/proximity';
import { ProximityGame, ProximityGuess } from '../../core/game/proximity-game';
import { Target } from '../../core/game/targets';
import { StringKey } from '../../core/i18n/strings';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { HelpPopoverComponent } from '../../shared/ui/help-popover.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { ListPanelComponent } from '../../shared/list-panel/list-panel.component';
import { OutOfPlayCardComponent } from '../../shared/out-of-play/out-of-play-card.component';
import { OutOfPlayKeyComponent } from '../../shared/out-of-play/out-of-play-key.component';
import { MapLabel, MapMarker } from '../../shared/map/map-state.service';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

/**
 * Proximity game: find a secret place by guessing. Each guess gets a hot-to-cold color on the map
 * and, depending on the clues, shows how far it is from the secret and an arrow towards it.
 */
@Component({
  selector: 'app-proximity-game-page',
  imports: [
    GameFrameComponent,
    HelpPopoverComponent,
    InfoBoxComponent,
    ListPanelComponent,
    NgTemplateOutlet,
    OutOfPlayCardComponent,
    OutOfPlayKeyComponent,
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
        [progress]="'' + g.guessed().length"
        [progressLabel]="i18n.t('bar.guesses')"
        [status]="g.status()"
        [result]="g.result()"
        [record]="record()"
        [ownEndTitle]="endTitle(g)"
        [hasList]="true"
        [listLabel]="i18n.t('bar.guesses')"
        [listOpen]="listOpen()"
        (menu)="goToMenu()"
        (togglePause)="togglePause()"
        (restart)="restart()"
        (replay)="replay()"
        (giveUp)="giveUp()"
        (toggleList)="listOpen.set(!listOpen())"
        (settings)="openSettings()"
      >
        @if (g.secret) {
          <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-0.5">
            <p class="bar-line truncate font-sans text-sm leading-snug md:text-lg">
              {{ i18n.t(layer === 'brazil' ? 'proximity.goal.states' : 'proximity.goal') }}
              @if (g.best(); as best) {
                <span class="text-ink-muted">· {{ bestText(g, best) }}</span>
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
                <span class="font-medium">{{ icon[f.kind] }} {{ f.text }}</span>
              }
            </p>
          </div>
        }

        @if (g.clues !== 'color') {
          <app-help-popover endHelp [label]="i18n.t('proximity.help')">
            {{ i18n.t('proximity.note') }}
          </app-help-popover>
        }

        <div end class="flex flex-col gap-3 text-sm">
          @if (g.secret; as secret) {
            <p>
              <span class="text-ink-muted">{{
                i18n.t(layer === 'brazil' ? 'proximity.secret.states' : 'proximity.secret')
              }}</span>
              <button
                type="button"
                class="ml-1 font-semibold underline hover:text-accent"
                (click)="pick(secret)"
              >
                {{ nameOf(secret) }}
              </button>
            </p>
          }
          <ng-container
            [ngTemplateOutlet]="guessList"
            [ngTemplateOutletContext]="{ $implicit: g }"
          />
          <app-out-of-play-key />
        </div>
      </app-game-frame>

      @if (g.status() === 'playing' && listOpen()) {
        <app-list-panel
          [heading]="i18n.t('proximity.guesses')"
          [lower]="true"
          (closed)="listOpen.set(false)"
        >
          @if (g.clues !== 'color') {
            <app-help-popover help [label]="i18n.t('proximity.help')">
              {{ i18n.t('proximity.note') }}
            </app-help-popover>
          }
          <ng-container
            [ngTemplateOutlet]="guessList"
            [ngTemplateOutletContext]="{ $implicit: g }"
          />
        </app-list-panel>
      }

      @if (g.status() === 'playing') {
        <!-- Small legend in the corner; on phones it rides above the guess list when that is open. -->
        <div
          class="pointer-events-none fixed left-3 z-10 flex flex-col gap-0.5 rounded-md bg-panel px-2 py-1 text-xs text-ink-muted shadow-panel"
          [class.bottom-3]="!listOpen()"
          [class.max-md:bottom-[calc(46dvh+0.5rem)]]="listOpen()"
          [class.md:bottom-3]="listOpen()"
          aria-hidden="true"
        >
          <span class="flex">
            @for (level of legendLevels; track level) {
              <span
                class="h-2.5 w-5 bg-(--heat) ring-1 ring-heat-edge"
                [attr.data-heat]="level"
              ></span>
            }
          </span>
          <span>{{ i18n.t('proximity.legend') }}</span>
        </div>
      }

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" [note]="infoNote()" (closed)="closeInfo()" />
      }
      @if (outOfPlayCard(); as card) {
        <app-out-of-play-card [name]="card.name" [kind]="card.kind" (closed)="closeInfo()" />
      }
    }

    <!--
      The guesses: color, distance and an arrow towards the secret, from nearest to farthest. With
      only colors, the heat in words instead, in the same order. The best one stands out on top.
    -->
    <ng-template #guessList let-g>
      <ol class="flex flex-col">
        @for (guess of listOf(g); track guess.target.id) {
          <li>
            <button
              type="button"
              class="flex w-full flex-wrap items-center gap-x-2 rounded-md border-2 px-1.5 py-1 text-left text-sm hover:bg-accent-soft"
              [class]="
                guess === g.best() ? 'mb-1 border-accent bg-accent-soft' : 'border-transparent'
              "
              (click)="pick(guess.target)"
            >
              @if (guess === g.best() && guess.sector !== null) {
                <span class="w-full text-xs font-semibold text-accent">
                  <span aria-hidden="true">★</span>
                  {{ i18n.t(g.clues === 'color' ? 'proximity.warmest' : 'proximity.nearest') }}
                </span>
              }
              @if (guess.sector === null) {
                <span
                  class="size-3.5 shrink-0 rounded-full bg-found ring-1 ring-black/30"
                  aria-hidden="true"
                ></span>
                <span class="min-w-0 flex-1 truncate font-medium">{{ nameOf(guess.target) }}</span>
                <span aria-hidden="true">✓</span>
                <span class="sr-only">{{ i18n.t('list.found') }}</span>
              } @else {
                <span
                  class="size-3.5 shrink-0 rounded-full bg-(--heat) ring-1 ring-black/30"
                  [attr.data-heat]="guess.heat"
                  aria-hidden="true"
                ></span>
                <span class="min-w-0 flex-1 truncate font-medium">{{ nameOf(guess.target) }}</span>
                <span class="text-ink-muted tabular-nums">{{ clueText(g, guess) }}</span>
                @if (g.clues === 'distance-direction') {
                  <span
                    class="flex w-12 shrink-0 items-center gap-1 text-xs text-ink-muted"
                    [title]="i18n.t('proximity.direction', { dir: compass(guess.sector) })"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      class="size-4 shrink-0 fill-none stroke-ink stroke-2"
                      [style.transform]="'rotate(' + guess.sector * 22.5 + 'deg)'"
                      aria-hidden="true"
                    >
                      <path
                        d="M10 16V4M5.5 8.5 10 4l4.5 4.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    {{ compass(guess.sector) }}
                  </span>
                }
              }
            </button>
          </li>
        } @empty {
          <li class="text-sm text-ink-muted">{{ i18n.t('proximity.none') }}</li>
        }
      </ol>
    </ng-template>
  `,
})
export class ProximityGamePage extends GamePage<ProximityGame> {
  protected readonly icon = FEEDBACK_ICON;
  /** Far to near, the order of the legend strip. */
  protected readonly legendLevels = [5, 4, 3, 2, 1, 0];
  protected readonly listOpen = signal(window.matchMedia('(min-width: 768px)').matches);
  protected readonly prompt = () =>
    this.i18n.t(this.layer === 'brazil' ? 'proximity.placeholder.states' : 'proximity.placeholder');

  private pool: Target[] = [];
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('answer');

  /** Places whose info card a click may open: the guesses, and the secret once it is over. */
  private readonly knownByUnit = computed(() => {
    const game = this.game();
    const map = new Map<string, Target>();
    if (!game) return map;
    const known = game.guesses().map((guess) => guess.target);
    if (game.status() === 'finished' && game.secret) known.push(game.secret);
    for (const target of known) {
      for (const unitId of target.unitIds) map.set(unitId, target);
    }
    return map;
  });

  constructor() {
    super();

    // When the game is over, the camera shows where the secret was.
    effect(() => {
      const game = this.game();
      if (game?.status() !== 'finished' || !game.secret) return;
      const secret = game.secret;
      untracked(() => this.focusOn([secret]));
    });

    // Each guess is painted from hot (neighbour) to cold (far away); the secret is lit as found.
    effect(() => {
      const heat = new Map<string, number>();
      for (const guess of this.game()?.guesses() ?? []) {
        if (guess.sector === null) continue;
        for (const unitId of guess.target.unitIds) heat.set(unitId, guess.heat);
      }
      this.mapState.heat.set(heat);
    });

    effect(() => {
      const id = this.mapState.selectedId();
      if (!id) return;
      const target = this.knownByUnit().get(id);
      untracked(() => {
        if (target) this.infoTarget.set(target);
        else this.mapState.select(null);
      });
    });

    effect(() => {
      const element = this.input();
      if (element && this.game()?.status() === 'playing') element.nativeElement.focus();
    });
  }

  protected override loadExtra(): Promise<void> {
    const saved = this.saved.get(this.gameId, this.layer, this.continent);
    return this.geo.loadProximity(
      proximityFile(this.layer, saved?.territories ?? this.settings.value().includeTerritories),
    );
  }

  /** A new game follows the current settings, which may need the other distances file. */
  protected override replay(): void {
    const file = proximityFile(this.layer, this.settings.value().includeTerritories);
    void this.geo.loadProximity(file).then(() => super.replay());
  }

  protected createGame(options: NewGameOptions): ProximityGame {
    this.pool = options.pool;
    this.nonTargets = this.buildNonTargets(options.pool);
    const data = this.geo.proximity()[proximityFile(this.layer, options.territories)];
    return new ProximityGame({
      layer: this.layer,
      pool: options.pool,
      askable: options.targets,
      data: data ?? { ids: [], km: [], dir: [] },
      clues: this.settings.value().proximityClues,
      tolerance: options.saved?.tolerance ?? this.settings.value().typoTolerance,
      territories: options.territories,
      saved: options.saved ?? undefined,
    });
  }

  /** A tiny place guessed has no shape to color: a ring in its color marks it. */
  protected override extraMarkers(): MapMarker[] {
    return (this.game()?.guesses() ?? []).flatMap((guess) =>
      guess.target.tiny && guess.sector !== null
        ? [
            {
              id: guess.target.id,
              point: guess.target.place.labelPoint,
              kind: 'heat',
              heat: guess.heat,
            },
          ]
        : [],
    );
  }

  /** With names on, each guess also shows its distance on the map (with only colors, its heat). */
  protected override extraLabels(): MapLabel[] {
    const game = this.game();
    if (!game) return [];
    return game
      .guesses()
      .filter((guess) => guess.sector !== null)
      .map((guess) =>
        this.mapLabel(guess.target, `${this.nameOf(guess.target)} · ${this.clueText(game, guess)}`),
      );
  }

  protected endTitle(game: ProximityGame): string {
    const reason = game.result()?.reason;
    return reason === 'complete'
      ? this.i18n.t('frame.end.proximity.complete')
      : this.i18n.t('frame.end.proximity.gaveup');
  }

  /** The guesses, nearest first. */
  protected listOf(game: ProximityGame): ProximityGuess[] {
    return game.ranked();
  }

  /** What the bar says of the best guess so far. */
  protected bestText(game: ProximityGame, best: ProximityGuess): string {
    const name = this.nameOf(best.target);
    return game.clues === 'color'
      ? this.i18n.t('proximity.hottest', { name })
      : this.i18n.t('proximity.closest', { name, distance: this.distanceText(best.km) });
  }

  /** The distance of a guess or, with only colors, its heat in words ("quente"). */
  protected clueText(game: ProximityGame, guess: ProximityGuess): string {
    return game.clues === 'color'
      ? this.i18n.t(`proximity.heat.${guess.heat}` as StringKey)
      : this.distanceText(guess.km);
  }

  /** "Chile: ≈ 1.230 km · siga para NE", or less, as the clues say. */
  private resultText(game: ProximityGame, guess: ProximityGuess): string {
    const name = this.nameOf(guess.target);
    const clue = this.clueText(game, guess);
    return game.clues === 'distance-direction' && guess.sector !== null
      ? this.i18n.t('proximity.result', { name, distance: clue, dir: this.compass(guess.sector) })
      : this.i18n.t('proximity.result.clue', { name, clue });
  }

  protected nameOf(target: Target): string {
    return this.i18n.name(target.place.name);
  }

  /** "vizinho", or the distance rounded to tens of km ("≈ 1.230 km"). */
  protected distanceText(km: number): string {
    const rounded = approxKm(km);
    if (rounded === 0) return this.i18n.t('proximity.neighbor');
    const locale = this.i18n.lang() === 'pt' ? 'pt-BR' : 'en-US';
    return this.i18n.t('proximity.km', { km: new Intl.NumberFormat(locale).format(rounded) });
  }

  protected compass(sector: number): string {
    return this.i18n.t('proximity.compass').split(' ')[sector];
  }

  protected submit(element: HTMLInputElement): void {
    const game = this.game();
    if (!game || !element.value.trim()) return;
    const result = game.submit(element.value);

    switch (result.kind) {
      case 'guess': {
        element.value = '';
        const { target } = result.guess;
        if (result.won) {
          this.say('hit', this.i18n.t('proximity.found', { name: this.nameOf(target) }));
          this.pulseUnits([target]);
          if (this.settings.value().infoBox) this.infoTarget.set(target);
        } else {
          this.say('info', this.resultText(game, result.guess), 8000);
          // Getting warmer sounds like a hit; anything else is silent (it is not an error).
          if (result.closest) this.sound.play('hit');
          this.pulseUnits([target]);
        }
        break;
      }
      case 'repeat':
        element.value = '';
        this.say(
          'duplicate',
          this.i18n.t('proximity.repeat', {
            name: this.nameOf(result.guess.target),
            clue: this.clueText(game, result.guess),
          }),
        );
        break;
      case 'miss':
        // A real place that is not an answer teaches instead, and costs nothing.
        if (this.explainTyped(element.value, this.pool, true)) {
          element.value = '';
          break;
        }
        this.say('miss', this.i18n.t('typing.miss'));
        this.sound.play('wrong');
        this.shaking.set(true);
        element.select();
        break;
      case 'ignored':
        return;
    }
    this.save();
    this.afterChange(game);
  }

  /** Giving up shows where the secret was. */
  protected override async giveUp(): Promise<void> {
    await super.giveUp();
    const game = this.game();
    if (game?.status() === 'finished' && game.secret) this.pulseUnits([game.secret]);
  }
}
