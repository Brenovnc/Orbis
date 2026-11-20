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
import { ProximityFile } from '../../core/data/geo-data.service';
import { approxKm } from '../../core/data/proximity';
import { ProximityGame, ProximityGuess } from '../../core/game/proximity-game';
import { Target } from '../../core/game/targets';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { MapLabel, MapMarker } from '../../shared/map/map-state.service';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

/**
 * Proximity game: find a secret place by guessing. Each guess shows how far it is from the secret,
 * an arrow towards it and a hot-to-cold color on the map.
 */
@Component({
  selector: 'app-proximity-game-page',
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
        [progress]="'' + g.guessed().length"
        [progressLabel]="i18n.t('bar.guesses')"
        [status]="g.status()"
        [result]="g.result()"
        [record]="record()"
        [ownEndTitle]="endTitle(g)"
        [hasList]="true"
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
              @if (g.ranked()[0]; as best) {
                <span class="text-ink-muted">
                  ·
                  {{
                    i18n.t('proximity.closest', {
                      name: nameOf(best.target),
                      distance: distanceText(best.km),
                    })
                  }}
                </span>
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
              }
            </p>
          </div>
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
        </div>
      </app-game-frame>

      @if (g.status() === 'playing' && listOpen()) {
        <aside
          data-map-cover
          class="fixed inset-x-0 bottom-0 z-10 h-[40dvh] animate-panel-in overflow-y-auto rounded-t-2xl bg-panel p-3 shadow-panel backdrop-blur-md md:inset-x-auto md:top-36 md:right-3 md:bottom-36 md:h-auto md:w-80 md:rounded-2xl"
          [attr.aria-label]="i18n.t('proximity.guesses')"
        >
          <h2 class="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {{ i18n.t('proximity.guesses') }}
          </h2>
          <ng-container
            [ngTemplateOutlet]="guessList"
            [ngTemplateOutletContext]="{ $implicit: g }"
          />
        </aside>
      }

      @if (g.status() === 'playing') {
        <!-- Small legend in the corner; on phones it rides above the guess list when that is open. -->
        <div
          class="pointer-events-none fixed left-3 z-10 flex flex-col gap-0.5 rounded-md bg-panel px-2 py-1 text-xs text-ink-muted shadow-panel"
          [class.bottom-3]="!listOpen()"
          [class.max-md:bottom-[calc(40dvh+0.5rem)]]="listOpen()"
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
        <app-info-box [place]="place" (closed)="closeInfo()" />
      }
    }

    <!-- The guesses from nearest to farthest: color, distance and an arrow towards the secret. -->
    <ng-template #guessList let-g>
      <ol class="flex flex-col">
        @for (guess of rankedOf(g); track guess.target.id) {
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-accent-soft"
              (click)="pick(guess.target)"
            >
              @if (guess.sector === null) {
                <span
                  class="size-3.5 shrink-0 rounded-sm bg-found ring-1 ring-black/30"
                  aria-hidden="true"
                ></span>
                <span class="min-w-0 flex-1 truncate font-medium">{{ nameOf(guess.target) }}</span>
                <span aria-hidden="true">✓</span>
                <span class="sr-only">{{ i18n.t('list.found') }}</span>
              } @else {
                <span
                  class="size-3.5 shrink-0 rounded-sm bg-(--heat) ring-1 ring-black/30"
                  [attr.data-heat]="guess.heat"
                  aria-hidden="true"
                ></span>
                <span class="min-w-0 flex-1 truncate font-medium">{{ nameOf(guess.target) }}</span>
                <span class="text-ink-muted tabular-nums">{{ distanceText(guess.km) }}</span>
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
            </button>
          </li>
        } @empty {
          <li class="text-sm text-ink-muted">{{ i18n.t('proximity.none') }}</li>
        }
      </ol>
      <p class="mt-2 text-xs text-ink-muted">{{ i18n.t('proximity.note') }}</p>
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

  /** Each map (and the territories rule) has its own distances file. */
  private fileFor(territories: boolean): ProximityFile {
    if (this.layer === 'brazil') return 'brazil';
    return territories ? 'world-territories' : 'world';
  }

  protected override loadExtra(): Promise<void> {
    const saved = this.saved.get(this.gameId, this.layer, this.continent);
    return this.geo.loadProximity(
      this.fileFor(saved?.territories ?? this.settings.value().includeTerritories),
    );
  }

  /** A new game follows the current settings, which may need the other distances file. */
  protected override replay(): void {
    const file = this.fileFor(this.settings.value().includeTerritories);
    void this.geo.loadProximity(file).then(() => super.replay());
  }

  protected createGame(options: NewGameOptions): ProximityGame {
    this.pool = options.pool;
    this.nonTargets = this.buildNonTargets(options.pool);
    const data = this.geo.proximity()[this.fileFor(options.territories)];
    return new ProximityGame({
      layer: this.layer,
      pool: options.pool,
      askable: options.targets,
      data: data ?? { ids: [], km: [], dir: [] },
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

  /** With names on, each guess also shows its distance on the map. */
  protected override extraLabels(): MapLabel[] {
    return (this.game()?.guesses() ?? []).flatMap((guess) =>
      guess.sector === null
        ? []
        : [
            this.mapLabel(
              guess.target,
              `${this.nameOf(guess.target)} · ${this.distanceText(guess.km)}`,
            ),
          ],
    );
  }

  protected endTitle(game: ProximityGame): string {
    const reason = game.result()?.reason;
    return reason === 'complete'
      ? this.i18n.t('frame.end.proximity.complete')
      : this.i18n.t('frame.end.proximity.gaveup');
  }

  protected rankedOf(game: ProximityGame): ProximityGuess[] {
    return game.ranked();
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
        const { target, km, sector } = result.guess;
        if (result.won) {
          this.say('hit', this.i18n.t('proximity.found', { name: this.nameOf(target) }));
          this.pulseUnits([target]);
          if (this.settings.value().infoBox) this.infoTarget.set(target);
        } else {
          this.say(
            'info',
            this.i18n.t('proximity.result', {
              name: this.nameOf(target),
              distance: this.distanceText(km),
              dir: this.compass(sector as number),
            }),
            8000,
          );
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
            distance: this.distanceText(result.guess.km),
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
