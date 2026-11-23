import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  untracked,
  viewChild,
} from '@angular/core';
import { NeighborsGame } from '../../core/game/neighbors-game';
import { Target } from '../../core/game/targets';
import { GameFrameComponent } from '../../shared/game-frame/game-frame.component';
import { InfoBoxComponent } from '../../shared/info-box/info-box.component';
import { OutOfPlayCardComponent } from '../../shared/out-of-play/out-of-play-card.component';
import { OutOfPlayKeyComponent } from '../../shared/out-of-play/out-of-play-key.component';
import { MapMarker } from '../../shared/map/map-state.service';
import { FEEDBACK_ICON, GamePage, NewGameOptions } from '../game-page';

/** Neighbors game: a place is highlighted and the player types every land neighbor of it. */
@Component({
  selector: 'app-neighbors-game-page',
  imports: [GameFrameComponent, InfoBoxComponent, OutOfPlayCardComponent, OutOfPlayKeyComponent],
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
        (menu)="goToMenu()"
        (togglePause)="togglePause()"
        (restart)="restart()"
        (replay)="replay()"
        (giveUp)="giveUp()"
        (settings)="openSettings()"
      >
        @if (g.subjects.length > 0) {
          <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-0.5">
            <p class="bar-line truncate font-sans text-sm leading-snug md:text-lg">
              <span class="text-ink-muted tabular-nums">
                {{ i18n.t('neighbors.round', { n: g.round() + 1, total: g.subjects.length }) }}
                ·
                {{ i18n.t('neighbors.of') }}
              </span>
              <strong class="font-semibold"> {{ i18n.name(g.subject().place.name) }}</strong>
              <span class="text-ink-muted tabular-nums">
                · {{ g.found().size }}/{{ g.neighbors().length }}
              </span>
            </p>
            <label class="sr-only" for="answer">{{ prompt() }}</label>
            <input
              #answer
              id="answer"
              type="text"
              class="w-full rounded-lg border border-line bg-white/85 px-3 py-1.5 font-sans text-base shadow-inner disabled:opacity-60 md:text-xl"
              [class.animate-shake]="shaking()"
              [placeholder]="prompt()"
              [disabled]="g.status() !== 'playing' || g.roundOver()"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
              (animationend)="shaking.set(false)"
              (input)="submit(answer, false)"
              (keydown.enter)="submit(answer, true)"
            />
            <p class="bar-line bar-feedback truncate font-sans" aria-live="polite">
              @if (feedback(); as f) {
                <span class="font-medium">{{ icon[f.kind] }} {{ f.text }}</span>
              }
            </p>
          </div>
        }

        <!-- One root element per block, so each can go to the gameAction slot. -->
        @if (g.status() === 'playing' && g.roundOver()) {
          <button gameAction #nextBtn type="button" class="btn-primary !py-1.5" (click)="goNext(g)">
            {{ i18n.t(g.isLastRound() ? 'neighbors.finish' : 'neighbors.next') }}
          </button>
        }
        @if (g.status() === 'playing' && !g.roundOver() && g.subjects.length > 0) {
          <button
            gameAction
            type="button"
            class="action-btn justify-center px-3 hover:bg-black/5 md:text-[0.8125rem]"
            (click)="giveUpRound(g)"
          >
            <svg
              viewBox="0 0 20 20"
              class="size-4 fill-none stroke-current stroke-2"
              aria-hidden="true"
            >
              <path
                d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5S2 10 2 10z"
                stroke-linejoin="round"
              />
              <circle cx="10" cy="10" r="2.5" />
            </svg>
            {{ i18n.t('neighbors.giveUpRound') }}
          </button>
        }

        <ol end class="flex flex-col gap-1">
          @for (round of g.results(); track $index) {
            <li class="flex items-baseline gap-2 text-sm">
              <span aria-hidden="true">{{ round.found === round.total ? '✓' : '✗' }}</span>
              <span class="sr-only">{{
                i18n.t(round.found === round.total ? 'list.found' : 'list.missed')
              }}</span>
              <span class="font-medium">{{ nameOf(round.id) }}</span>
              <span class="ml-auto text-ink-muted tabular-nums">
                {{ i18n.t('list.countOf', { found: round.found, total: round.total }) }}
              </span>
            </li>
          }
        </ol>
        <app-out-of-play-key end class="mt-3 block" />
      </app-game-frame>

      @if (infoPlace(); as place) {
        <app-info-box [place]="place" [note]="infoNote()" (closed)="closeInfo()" />
      }
      @if (outOfPlayCard(); as card) {
        <app-out-of-play-card [name]="card.name" [kind]="card.kind" (closed)="closeInfo()" />
      }
    }
  `,
})
export class NeighborsGamePage extends GamePage<NeighborsGame> {
  protected readonly icon = FEEDBACK_ICON;
  protected readonly prompt = () =>
    this.i18n.t(this.layer === 'brazil' ? 'neighbors.placeholder.states' : 'neighbors.placeholder');

  private readonly input = viewChild<ElementRef<HTMLInputElement>>('answer');
  private readonly nextButton = viewChild<ElementRef<HTMLButtonElement>>('nextBtn');
  private pool = new Map<string, Target>();

  constructor() {
    super();

    // The place of the round stands out on the map (all of its shapes, with its territories).
    effect(() => {
      const game = this.game();
      if (!game || game.subjects.length === 0) return;
      this.mapState.focus.set(new Set(game.subject().unitIds));
      // A new round: the camera frames the place and its neighbors.
      const places = [game.subject(), ...untracked(() => game.neighbors())];
      untracked(() => this.focusOn(places));
    });

    // Clicking a neighbor already found (or shown) reopens its info card; never gives answers away.
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
      const game = this.game();
      if (element && game?.status() === 'playing' && !game.roundOver()) {
        element.nativeElement.focus();
      }
    });

    // With the round over, Enter on the focused button goes to the next one.
    effect(() => this.nextButton()?.nativeElement.focus());
  }

  protected createGame(options: NewGameOptions): NeighborsGame {
    this.pool = new Map(options.pool.map((target) => [target.id, target]));
    this.nonTargets = this.buildNonTargets(options.pool);
    const data = this.geo.neighbors();
    const graph = !data
      ? {}
      : this.layer === 'brazil'
        ? data.brazil
        : options.territories
          ? data.world.territoriesOn
          : data.world.territoriesOff;
    return new NeighborsGame({
      layer: this.layer,
      pool: options.pool,
      askable: options.targets,
      graph,
      // The border-through-a-territory notes only exist with territories off.
      via: this.layer === 'world' && !options.territories ? (data?.world.via ?? {}) : {},
      tolerance: options.saved?.tolerance ?? this.settings.value().typoTolerance,
      territories: options.territories,
      durationMs: options.durationMs,
      saved: options.saved ?? undefined,
    });
  }

  protected override loadExtra(): Promise<void> {
    return this.geo.loadNeighbors();
  }

  /** A tiny place has no shape to see: a ring marks it. */
  protected override extraMarkers(): MapMarker[] {
    const game = this.game();
    if (!game || game.subjects.length === 0) return [];
    const subject = game.subject();
    return subject.tiny ? [{ id: subject.id, point: subject.place.labelPoint, kind: 'focus' }] : [];
  }

  protected nameOf(id: string): string {
    const target = this.pool.get(id);
    return target ? this.i18n.name(target.place.name) : id;
  }

  protected submit(element: HTMLInputElement, fuzzy: boolean): void {
    const game = this.game();
    if (!game || !element.value.trim()) return;
    const result = game.submit(element.value, fuzzy);

    if (result.kind === 'hit') {
      element.value = '';
      this.onHit(game, result.targets);
    } else if (result.kind === 'duplicate') {
      element.value = '';
      this.say('duplicate', this.i18n.t('typing.dup', { name: this.names(result.targets) }));
    } else if (result.kind === 'pending') {
      // "Guiné" may still become "Guiné-Bissau": only Enter confirms it.
      this.say('info', this.i18n.t('typing.confirm', { name: this.names(result.targets) }), 6000);
    } else if (result.kind === 'notNeighbor') {
      this.explainWrong(game, element, result.targets);
    } else if (result.kind === 'subject') {
      this.explainWrong(game, element, null);
    } else if (result.kind === 'miss' && this.explainTyped(element.value, [], false)) {
      // A real place that is not an answer: it teaches, and counts as neither hit nor error.
      element.value = '';
    } else if (result.kind === 'miss' && fuzzy) {
      this.say('miss', this.i18n.t('typing.miss'));
      this.sound.play('wrong');
      this.shaking.set(true);
      element.select();
    } else if (this.feedback()?.kind === 'info') {
      this.feedback.set(null); // the Enter hint no longer applies
    }
  }

  private onHit(game: NeighborsGame, targets: Target[]): void {
    const subject = this.i18n.name(game.subject().place.name);
    const territories = targets.flatMap((target) =>
      game.viaTerritories(target.id).map((id) => this.geo.place(id)),
    );
    // A border that only exists through a territory is explained (France–Brazil: French Guiana).
    const via = territories.flatMap((place) => (place ? [this.i18n.name(place.name)] : []));
    this.say(
      'hit',
      via.length
        ? this.i18n.t('neighbors.via', {
            a: subject,
            b: this.names(targets),
            territory: via.join(', '),
          })
        : this.names(targets),
      via.length ? 7000 : undefined,
    );
    this.sound.play('hit');
    this.pulseUnits(targets);
    if (this.settings.value().infoBox) this.infoTarget.set(targets[0]);
    this.save();
  }

  private explainWrong(
    game: NeighborsGame,
    element: HTMLInputElement,
    notNeighbors: Target[] | null,
  ): void {
    const subject = this.i18n.name(game.subject().place.name);
    element.select();
    this.shaking.set(true);
    this.sound.play('wrong');
    this.say(
      'miss',
      notNeighbors
        ? this.i18n.t('neighbors.notNeighbor', { name: this.names(notNeighbors), subject })
        : this.i18n.t('neighbors.isSubject', { name: subject }),
      5000,
    );
  }

  protected giveUpRound(game: NeighborsGame): void {
    game.giveUpRound();
    const missing = [...game.revealed()];
    this.say('info', this.i18n.t('neighbors.missed', { n: missing.length }), 6000);
    this.sound.play('wrong');
    this.pulseUnits(game.neighbors().filter((target) => game.revealed().has(target.id)));
    this.save();
  }

  protected goNext(game: NeighborsGame): void {
    game.nextRound();
    this.feedback.set(null);
    this.closeInfo();
    this.save();
    this.afterChange(game);
  }

  private names(targets: Target[]): string {
    return targets.map((target) => this.i18n.name(target.place.name)).join(', ');
  }
}
