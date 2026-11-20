import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { SilhouetteGame } from '../../core/game/silhouette-game';
import { Target } from '../../core/game/targets';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { MapMarker } from '../../shared/map/map-state.service';
import { SilhouetteComponent } from '../../shared/silhouette/silhouette.component';
import { TargetListComponent } from '../../shared/target-list/target-list.component';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

/**
 * Silhouettes game: only the outline of a place is shown and the player types its name. When it
 * is right (or shown), the place lights up on the map and its info card opens.
 */
@Component({
  selector: 'app-silhouette-game-page',
  imports: [GameFrameComponent, TargetListComponent, InfoBoxComponent, SilhouetteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pagehide)': 'save()',
    '(document:keydown.escape)': 'onEscape()',
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
        (menu)="goToMenu()"
        (togglePause)="togglePause()"
        (restart)="restart()"
        (replay)="replay()"
        (giveUp)="giveUp()"
        (skip)="skip(g)"
        (settings)="openSettings()"
      >
        <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-0.5">
          <p class="bar-line truncate font-sans text-sm leading-snug md:text-lg">
            {{ i18n.t(layer === 'brazil' ? 'silhouette.which.states' : 'silhouette.which') }}
          </p>
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
          <p class="bar-line h-5 truncate font-sans text-xs md:text-sm" aria-live="polite">
            @if (feedback(); as f) {
              <span class="font-medium">{{ icon[f.kind] }} {{ f.text }}</span>
            }
          </p>
        </div>

        <app-target-list
          end
          [targets]="g.targets"
          [found]="g.found()"
          mode="countries"
          [layer]="layer"
          [reveal]="true"
          (picked)="showInfo($event)"
        />
      </app-game-frame>

      @if (g.status() !== 'finished' && g.current(); as asked) {
        <app-silhouette
          class="fixed top-36 left-1/2 z-10 w-[min(11rem,42vw)] -translate-x-1/2 md:top-44 md:left-4 md:w-80 md:translate-x-0"
          [target]="asked"
          [layer]="layer"
        />
      }

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" (closed)="closeInfo()" />
      }
    }
  `,
})
export class SilhouetteGamePage extends GamePage<SilhouetteGame> {
  protected readonly icon = FEEDBACK_ICON;
  protected readonly prompt = () =>
    this.i18n.t(
      this.layer === 'brazil' ? 'silhouette.placeholder.states' : 'silhouette.placeholder',
    );

  /** The place just answered (or shown): it stands out on the map, to see where it is. */
  private readonly lastShown = signal<Target | null>(null);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('answer');

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

    effect(() => {
      const element = this.input();
      if (element && this.game()?.status() === 'playing') element.nativeElement.focus();
    });
  }

  protected override loadExtra(): Promise<void> {
    return this.geo.loadSilhouetteExclusions();
  }

  /** Places whose outline is a dot or a square are never asked (but can still be typed). */
  protected override askable(targets: Target[]): Target[] {
    const data = this.geo.silhouetteExcluded();
    if (!data) return targets;
    const excluded = new Set((this.layer === 'brazil' ? data.brazil : data.world).map((x) => x.id));
    return targets.filter((target) => !excluded.has(target.id));
  }

  protected createGame(options: NewGameOptions): SilhouetteGame {
    this.lastShown.set(null);
    this.nonTargets = this.buildNonTargets(options.pool);
    return new SilhouetteGame({
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

  protected submit(element: HTMLInputElement, fuzzy: boolean): void {
    const game = this.game();
    if (!game || !element.value.trim()) return;
    const result = game.submit(element.value, fuzzy);
    const name = (target: Target) => this.i18n.name(target.place.name);

    switch (result.kind) {
      case 'hit':
        element.value = '';
        this.say('hit', this.i18n.t('click.correct', { name: name(result.target) }));
        this.sound.play('hit');
        this.reveal(result.target, this.settings.value().infoBox);
        break;
      case 'revealed':
        element.value = '';
        this.say('info', this.i18n.t('click.itWas', { name: name(result.asked) }), 6000);
        this.sound.play('wrong');
        this.reveal(result.asked, true);
        break;
      case 'wrong':
        this.say(
          'miss',
          game.learnMode
            ? this.i18n.t('click.thatIs', { name: name(result.clicked) })
            : this.i18n.t('click.notThat'),
        );
        this.sound.play('wrong');
        this.shaking.set(true);
        element.select();
        this.flashWrong(result.clicked);
        if (game.learnMode) this.infoTarget.set(result.clicked);
        break;
      case 'known':
        element.value = '';
        this.say('duplicate', this.i18n.t('typing.dup', { name: name(result.target) }));
        break;
      case 'pending':
        // "Guiné" may still become "Guiné-Bissau": only Enter confirms it.
        this.say('info', this.i18n.t('typing.confirm', { name: name(result.target) }), 6000);
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
    if (card) this.infoTarget.set(target);
  }
}
