import { ChangeDetectionStrategy, Component, effect, untracked } from '@angular/core';
import { ClickGame, ClueKind } from '../../core/game/click-game';
import { Target } from '../../core/game/targets';
import { ClickGameId } from '../../core/games';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { TargetListComponent } from '../../shared/target-list/target-list.component';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

const CLUES: Record<ClickGameId, ClueKind> = {
  'clicar-nome': 'name',
  'clicar-capital': 'capital',
  'clicar-bandeira': 'flag',
};

/** Click games: the clue is in the top bar and the player clicks the right place on the map. */
@Component({
  selector: 'app-click-game-page',
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
        [errors]="g.errors()"
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
      >
        <div
          class="mx-auto flex max-w-3xl flex-col items-center"
          [class.animate-shake]="shaking()"
          (animationend)="shaking.set(false)"
        >
          @if (g.current(); as asked) {
            @switch (g.clue) {
              @case ('name') {
                <p [class]="sizeFor(i18n.name(asked.place.name))">
                  <span class="text-ink-muted">{{ i18n.t('click.whereIs') }}</span>
                  <strong class="font-semibold"> {{ i18n.name(asked.place.name) }}</strong><span
                    class="text-ink-muted"
                    >?</span
                  >
                </p>
              }
              @case ('capital') {
                <p [class]="sizeFor(i18n.name(asked.place.capitals[0].name), 12)">
                  <span class="text-ink-muted">{{
                    i18n.t(layer === 'brazil' ? 'click.capitalOfState' : 'click.capitalOf')
                  }}</span>
                  <strong class="font-semibold">
                    {{ i18n.name(asked.place.capitals[0].name) }}</strong><span
                    class="text-ink-muted"
                    >?</span
                  >
                </p>
              }
              @case ('flag') {
                <p class="inline-flex items-center gap-3">
                  <span class="text-base text-ink-muted md:text-2xl">{{
                    i18n.t(layer === 'brazil' ? 'click.whichFlagState' : 'click.whichFlag')
                  }}</span>
                  <img
                    [src]="'data/' + asked.place.flag"
                    [alt]="i18n.t('click.flagAlt')"
                    class="h-9 w-auto rounded-sm shadow ring-1 ring-black/15 md:h-14"
                  />
                </p>
              }
            }
          } @else {
            <p class="text-ink-muted">{{ i18n.t('click.noMore') }}</p>
          }
          <p class="h-5 w-full truncate font-sans text-xs md:text-sm" aria-live="polite">
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

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" (closed)="closeInfo()" />
      }
    }
  `,
})
export class ClickGamePage extends GamePage<ClickGame> {
  protected readonly icon = FEEDBACK_ICON;

  constructor() {
    super();

    // Every click on the map is an answer. `lastClick` changes on every click, even on the same
    // place twice in a row.
    effect(() => {
      const click = this.mapState.lastClick();
      const game = this.game();
      if (!click || !game) return;
      untracked(() => this.onMapClick(game, click.id));
    });
  }

  /** Long names get a smaller font so the question always fits in the bar's fixed height. */
  protected sizeFor(answer: string, extra = 0): string {
    return answer.length + extra > 22 ? 'text-base leading-snug md:text-3xl' : '';
  }

  protected override enlargesTinyPlaces(): boolean {
    return true;
  }

  protected createGame(options: NewGameOptions): ClickGame {
    const id = this.gameId as ClickGameId;
    return new ClickGame({
      gameId: id,
      layer: this.layer,
      clue: CLUES[id],
      targets: options.targets,
      territories: options.territories,
      durationMs: options.durationMs,
      // A saved game keeps the rules it started with.
      revealAfterErrors:
        options.saved?.revealAfterErrors ?? this.settings.value().revealAfterErrors,
      learnMode: options.saved?.learnMode ?? this.settings.value().learnMode,
      saved: options.saved ?? undefined,
    });
  }

  protected skip(game: ClickGame): void {
    game.skip();
    this.feedback.set(null);
    this.save();
  }

  private onMapClick(game: ClickGame, unitId: string | null): void {
    this.mapState.select(null); // answers are shown by the game, not by the amber selection
    const clicked = unitId ? this.targetByUnit().get(unitId) : undefined;
    if (!clicked) return;

    // Game over: clicking just explains the place.
    if (game.status() === 'finished') {
      this.showInfo(clicked);
      return;
    }

    const outcome = game.click(clicked.id);
    switch (outcome.kind) {
      case 'known':
        this.showInfo(outcome.target);
        break;
      case 'hit':
        this.say('hit', this.i18n.t('click.correct', { name: this.describe(outcome.target) }));
        this.sound.play('hit');
        this.pulseUnits([outcome.target]);
        if (this.settings.value().infoBox) this.infoTarget.set(outcome.target);
        break;
      case 'wrong': {
        const learn = game.learnMode;
        this.say(
          'miss',
          learn
            ? this.i18n.t('click.thatIs', { name: this.i18n.name(clicked.place.name) })
            : this.i18n.t('click.notThat'),
        );
        this.sound.play('wrong');
        this.wrong(clicked, learn);
        break;
      }
      case 'revealed':
        this.say('info', this.i18n.t('click.itWas', { name: this.describe(outcome.asked) }), 6000);
        this.sound.play('wrong');
        this.wrong(clicked, false);
        this.pulseUnits([outcome.asked]);
        this.infoTarget.set(outcome.asked);
        break;
      case 'ignored':
        return;
    }
    this.save();
    this.afterChange(game);
  }

  private wrong(clicked: Target, showInfo: boolean): void {
    this.shaking.set(true);
    this.flashWrong(clicked);
    if (showInfo) this.infoTarget.set(clicked);
  }

  /** The country name; in the capital game also the capital it was asked by. */
  private describe(target: Target): string {
    const name = this.i18n.name(target.place.name);
    if (this.game()?.clue !== 'capital') return name;
    const capitals = target.place.capitals.map((c) => this.i18n.name(c.name)).join(' / ');
    return `${capitals} → ${name}`;
  }
}
