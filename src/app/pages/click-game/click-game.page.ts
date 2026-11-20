import { ChangeDetectionStrategy, Component, effect, untracked } from '@angular/core';
import { ClickGame, ClueKind } from '../../core/game/click-game';
import { Territory } from '../../core/data/geo-data.models';
import { isTerritory } from '../../core/data/geo-data.service';
import { territoryWords } from '../../core/game/non-targets';
import { Target } from '../../core/game/targets';
import { ClickGameId } from '../../core/games';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { FlagCardComponent } from '../../shared/flag/flag-card.component';
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
  imports: [GameFrameComponent, TargetListComponent, InfoBoxComponent, FlagCardComponent],
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
        (settings)="openSettings()"
      >
        <div
          class="mx-auto flex w-full max-w-3xl flex-col items-center"
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
                <p
                  class="max-w-44 text-center text-sm leading-tight text-ink-muted md:max-w-none md:text-2xl"
                >
                  {{ i18n.t(layer === 'brazil' ? 'click.whichFlagState' : 'click.whichFlag') }}
                </p>
              }
            }
          } @else {
            <p class="text-ink-muted">{{ i18n.t('click.noMore') }}</p>
          }
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
          (picked)="pick($event)"
        />
      </app-game-frame>

      @if (g.clue === 'flag' && g.status() !== 'finished' && g.current(); as asked) {
        <app-flag-card
          class="fixed top-36 left-1/2 z-10 w-[min(11rem,42vw)] -translate-x-1/2 md:top-44 md:left-4 md:w-80 md:translate-x-0"
          [src]="'data/' + asked.place.flag"
        />
      }

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
    this.mapState.doubleClickZoom.set(false);

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
    this.nonTargets = this.buildNonTargets(options.targets);
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
    if (!clicked) {
      // A real place that is not a target (Antarctica, Kosovo...): explain, no error.
      const why = unitId && this.nonTargets?.byId.get(unitId);
      if (why && game.status() !== 'paused') this.explain(why);
      return;
    }

    // With territories off, a territory counts as its country: the messages and the info card
    // still name the territory that was clicked.
    const territory = this.territoryClicked(unitId, clicked);
    const card = territory ? this.territoryCard(territory, unitId as string) : clicked;

    // Game over: clicking just explains the place.
    if (game.status() === 'finished') {
      this.showInfo(card);
      return;
    }

    const outcome = game.click(clicked.id);
    switch (outcome.kind) {
      case 'known':
        this.showInfo(card);
        break;
      case 'hit': {
        const name = this.describe(outcome.target);
        this.say(
          'hit',
          territory
            ? this.i18n.t('click.correctTerritory', { name, ...this.territoryWords(territory) })
            : this.i18n.t('click.correct', { name }),
          territory ? 6000 : undefined,
        );
        this.sound.play('hit');
        this.pulseUnits([outcome.target]);
        if (this.settings.value().infoBox) this.infoTarget.set(card);
        break;
      }
      case 'wrong': {
        const learn = game.learnMode;
        this.say(
          'miss',
          !learn
            ? this.i18n.t('click.notThat')
            : territory
              ? this.i18n.t('click.thatIsTerritory', this.territoryWords(territory))
              : this.i18n.t('click.thatIs', { name: this.i18n.name(clicked.place.name) }),
          territory && learn ? 6000 : undefined,
        );
        this.sound.play('wrong');
        this.wrong(clicked, learn, card);
        break;
      }
      case 'revealed':
        this.say('info', this.i18n.t('click.itWas', { name: this.describe(outcome.asked) }), 6000);
        this.sound.play('wrong');
        this.wrong(clicked, false);
        this.pulseUnits([outcome.asked]);
        this.infoTarget.set(outcome.asked);
        this.focusOn([outcome.asked]);
        break;
      case 'ignored':
        return;
    }
    this.save();
    this.afterChange(game);
  }

  private wrong(clicked: Target, showInfo: boolean, card = clicked): void {
    this.shaking.set(true);
    this.flashWrong(clicked);
    if (showInfo) this.infoTarget.set(card);
  }

  /** The territory whose map shape was clicked, when it only counts as its country. */
  private territoryClicked(unitId: string | null, target: Target): Territory | undefined {
    const place = unitId ? this.geo.place(unitId) : undefined;
    return place && isTerritory(place) && place.administeredBy === target.id ? place : undefined;
  }

  /** The info card of a territory, built like a target so the card can show it. */
  private territoryCard(territory: Territory, unitId: string): Target {
    return {
      id: territory.id,
      place: territory,
      group: territory.continent,
      unitIds: [unitId],
      tiny: false,
    };
  }

  private territoryWords(territory: Territory) {
    return territoryWords(territory, this.geo.nonTargets(), (text) => this.i18n.name(text));
  }

  /** The country name; in the capital game also the capital it was asked by. */
  private describe(target: Target): string {
    const name = this.i18n.name(target.place.name);
    if (this.game()?.clue !== 'capital') return name;
    const capitals = target.place.capitals.map((c) => this.i18n.name(c.name)).join(' / ');
    return `${capitals} → ${name}`;
  }
}
