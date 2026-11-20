import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { AnswerMode } from '../../core/game/answers';
import { explainNonTarget } from '../../core/game/non-targets';
import { Target } from '../../core/game/targets';
import { TypingGame } from '../../core/game/typing-game';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { TargetListComponent } from '../../shared/target-list/target-list.component';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

/** Typing games: "digitar países" and "digitar capitais" (same rules, different answers). */
@Component({
  selector: 'app-typing-game-page',
  imports: [GameFrameComponent, TargetListComponent, InfoBoxComponent],
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
        [status]="g.status()"
        [result]="g.result()"
        [record]="record()"
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
        <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-0.5">
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
            (input)="onInput(answer)"
            (keydown.enter)="onEnter(answer)"
          />
          <p class="bar-line h-5 truncate text-xs md:text-sm" aria-live="polite">
            @if (feedback(); as f) {
              <span class="font-sans font-medium">{{ icon[f.kind] }} {{ f.text }}</span>
            }
          </p>
        </div>

        <app-target-list
          end
          [targets]="g.targets"
          [found]="g.found()"
          [mode]="mode()"
          [layer]="layer"
          [reveal]="true"
          (picked)="showInfo($event)"
        />
      </app-game-frame>

      @if (g.status() === 'playing' && listOpen()) {
        <aside
          class="fixed inset-x-0 bottom-0 z-10 h-[46dvh] animate-panel-in overflow-y-auto rounded-t-2xl bg-panel p-3 shadow-panel backdrop-blur-md md:inset-x-auto md:top-36 md:right-3 md:bottom-36 md:h-auto md:w-80 md:rounded-2xl"
          [attr.aria-label]="i18n.t(listKey())"
        >
          <app-target-list
            [targets]="g.targets"
            [found]="g.found()"
            [mode]="mode()"
            [layer]="layer"
            (picked)="showInfo($event)"
          />
        </aside>
      }

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" (closed)="closeInfo()" />
      }
    }
  `,
})
export class TypingGamePage extends GamePage<TypingGame> {
  protected readonly icon = FEEDBACK_ICON;
  protected readonly listOpen = signal(window.matchMedia('(min-width: 768px)').matches);
  protected readonly mode = (): AnswerMode =>
    this.gameId === 'digitar-paises' ? 'countries' : 'capitals';
  protected readonly prompt = () => {
    if (this.mode() === 'capitals') return this.i18n.t('typing.placeholder.capitals');
    return this.i18n.t(
      this.layer === 'brazil' ? 'typing.placeholder.states' : 'typing.placeholder.countries',
    );
  };
  protected readonly listKey = () => {
    if (this.mode() === 'capitals') return 'typing.listCapitals';
    return this.layer === 'brazil' ? 'typing.listStates' : 'typing.listCountries';
  };

  /** In the capitals game the map shows the capital, not the country. */
  protected override labelFor(target: Target): string {
    return this.mode() === 'capitals'
      ? this.i18n.name(target.place.capitals[0].name)
      : super.labelFor(target);
  }

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('answer');

  constructor() {
    super();

    // Clicking a place on the map reopens its info card, but only if it is already found (or the
    // game is over): clicking must never give away an answer.
    effect(() => {
      const id = this.mapState.selectedId();
      const game = this.game();
      if (!id || !game) return;
      const target = this.targetByUnit().get(id);
      const reveal = target && (game.found().has(target.id) || game.status() === 'finished');
      untracked(() => {
        if (reveal) this.infoTarget.set(target);
        else this.mapState.select(null);
      });
    });

    effect(() => {
      const element = this.input();
      if (element && this.game()?.status() === 'playing') element.nativeElement.focus();
    });
  }

  protected createGame(options: NewGameOptions): TypingGame {
    // Only the country-name game explains what is not an answer (Greenland, England...).
    this.nonTargets = this.mode() === 'countries' ? this.buildNonTargets(options.targets) : null;
    return new TypingGame({
      gameId: this.gameId as 'digitar-paises' | 'digitar-capitais',
      layer: this.layer,
      mode: this.mode(),
      targets: options.targets,
      // A saved game keeps the rules it started with.
      tolerance: options.saved?.tolerance ?? this.settings.value().typoTolerance,
      territories: options.territories,
      durationMs: options.durationMs,
      saved: options.saved ?? undefined,
    });
  }

  protected onInput(element: HTMLInputElement): void {
    this.submit(element, false);
  }

  protected onEnter(element: HTMLInputElement): void {
    this.submit(element, true);
  }

  private submit(element: HTMLInputElement, fuzzy: boolean): void {
    const game = this.game();
    if (!game || !element.value.trim()) return;
    const result = game.submit(element.value, fuzzy);

    if (result.kind === 'hit') {
      element.value = '';
      this.say('hit', this.describe(result.targets));
      this.sound.play('hit');
      this.pulseUnits(result.targets);
      if (this.settings.value().infoBox) this.infoTarget.set(result.targets[0]);
      this.save();
      this.afterChange(game);
    } else if (result.kind === 'duplicate') {
      element.value = '';
      this.say('duplicate', this.i18n.t('typing.dup', { name: this.describe(result.targets) }));
    } else if (result.kind === 'pending') {
      // "Irã" may still become "Iraque": only Enter confirms it.
      this.say(
        'info',
        this.i18n.t('typing.confirm', { name: this.describe(result.targets) }),
        6000,
      );
    } else if (result.kind === 'miss' && this.nonTargets && this.explainMiss(element)) {
      // A real place that is not an answer: it teaches, and counts as neither hit nor error.
    } else if (result.kind === 'miss' && fuzzy) {
      this.say('miss', this.i18n.t('typing.miss'));
      this.sound.play('wrong');
      this.shaking.set(true);
      element.select();
    } else if (this.feedback()?.kind === 'info') {
      this.feedback.set(null); // the Enter hint no longer applies
    }
  }

  private explainMiss(element: HTMLInputElement): boolean {
    const why = this.nonTargets && explainNonTarget(element.value, this.nonTargets);
    if (!why) return false;
    element.value = '';
    this.explain(why);
    return true;
  }

  /** "Brasil", or "Brasília → Brasil" in the capitals game. */
  private describe(targets: Target[]): string {
    const name = (t: Target) => this.i18n.name(t.place.name);
    const capitals = (t: Target) => t.place.capitals.map((c) => this.i18n.name(c.name)).join(' / ');
    return targets
      .map((t) => (this.mode() === 'countries' ? name(t) : `${capitals(t)} → ${name(t)}`))
      .join(', ');
  }
}
