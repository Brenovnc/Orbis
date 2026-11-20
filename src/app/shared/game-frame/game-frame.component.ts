import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { StringKey } from '../../core/i18n/strings';
import { RecordEntry, RecordOutcome } from '../../core/game/records.service';
import { GameResult, GameStatus } from '../../core/game/typing-game';
import { formatClock } from '../../core/labels';
import { TopBarComponent } from '../top-bar/top-bar.component';

const ICON = {
  pause: 'M7 4v12M13 4v12',
  play: 'M6 4l10 6-10 6z',
  list: 'M4 5h12M4 10h12M4 15h8',
  restart: 'M16 10a6 6 0 1 1-2-4.5M16 3v4h-4',
  giveUp: 'M5 17V3M5 4h10l-2 3.5 2 3.5H5',
};

/**
 * The frame shared by every game: top bar with time, score and progress, the pause / give up /
 * restart actions, the pause card and the end screen. The game puts its question in the default
 * slot, a button of its own next to Pause in the `gameAction` slot (Undo, Next round...) and the
 * full answer list for the end screen in the `end` slot.
 */
@Component({
  selector: 'app-game-frame',
  imports: [TopBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'moreOpen.set(false)' },
  template: `
    <app-top-bar
      [time]="time()"
      [progress]="progress()"
      [progressLabel]="progressLabel()"
      [errors]="errors()"
      [hasSettings]="status() !== 'finished'"
      (menu)="menu.emit()"
      (settings)="settings.emit()"
    >
      <ng-content />
      @if (status() !== 'finished') {
        <div actions class="contents">
          <button
            type="button"
            class="action-btn w-[5.25rem] justify-center hover:bg-black/5 md:w-[7rem] md:text-[0.8125rem]"
            (click)="togglePause.emit()"
          >
            <svg
              viewBox="0 0 20 20"
              class="size-4 fill-none stroke-current stroke-2"
              aria-hidden="true"
            >
              <path
                [attr.d]="status() === 'paused' ? icon.play : icon.pause"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ i18n.t(status() === 'paused' ? 'frame.resume' : 'frame.pause') }}
          </button>
          @if (hasList()) {
            <button
              type="button"
              class="action-btn w-[5.25rem] justify-center hover:bg-black/5 md:w-[7rem] md:text-[0.8125rem]"
              [attr.aria-pressed]="listOpen()"
              (click)="toggleList.emit()"
            >
              <svg
                viewBox="0 0 20 20"
                class="size-4 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path [attr.d]="icon.list" stroke-linecap="round" />
              </svg>
              {{ i18n.t('frame.list') }}
            </button>
          }
          @if (skippable()) {
            <button
              type="button"
              class="action-btn w-[5.25rem] justify-center hover:bg-black/5 md:w-[7rem] md:text-[0.8125rem] disabled:opacity-40"
              [disabled]="!canSkip() || status() !== 'playing'"
              (click)="skip.emit()"
            >
              <svg
                viewBox="0 0 20 20"
                class="size-4 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path d="M5 5l6 5-6 5zM14 5v10" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ i18n.t('frame.skip') }}
            </button>
          }
          <ng-content select="[gameAction]" />
          <div class="relative md:hidden">
            <button
              type="button"
              class="action-btn w-10 justify-center hover:bg-black/5"
              aria-haspopup="menu"
              [attr.aria-expanded]="moreOpen()"
              [attr.aria-label]="i18n.t('bar.more')"
              [title]="i18n.t('bar.more')"
              (click)="moreOpen.set(!moreOpen())"
            >
              <svg viewBox="0 0 20 20" class="size-5 fill-current" aria-hidden="true">
                <circle cx="4.5" cy="10" r="1.6" />
                <circle cx="10" cy="10" r="1.6" />
                <circle cx="15.5" cy="10" r="1.6" />
              </svg>
            </button>
            @if (moreOpen()) {
              <button
                type="button"
                class="fixed inset-0 z-20 cursor-default"
                tabindex="-1"
                aria-hidden="true"
                (click)="moreOpen.set(false)"
              ></button>
              <div
                class="absolute top-full right-0 z-30 mt-1 flex w-40 flex-col rounded-xl bg-panel-solid p-1 shadow-panel"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  class="action-btn justify-start px-3 text-sm hover:bg-black/5"
                  (click)="moreOpen.set(false); restart.emit()"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="size-4 fill-none stroke-current stroke-2"
                    aria-hidden="true"
                  >
                    <path [attr.d]="icon.restart" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  {{ i18n.t('frame.restart') }}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="action-btn justify-start px-3 text-sm hover:bg-black/5"
                  (click)="moreOpen.set(false); giveUp.emit()"
                >
                  <svg
                    viewBox="0 0 20 20"
                    class="size-4 fill-none stroke-current stroke-2"
                    aria-hidden="true"
                  >
                    <path [attr.d]="icon.giveUp" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  {{ i18n.t('frame.giveUp') }}
                </button>
              </div>
            }
          </div>
          <div class="hidden md:contents">
            <button
              type="button"
              class="action-btn w-[5.25rem] justify-center hover:bg-black/5 md:w-[7rem] md:text-[0.8125rem]"
              (click)="restart.emit()"
            >
              <svg
                viewBox="0 0 20 20"
                class="size-4 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path [attr.d]="icon.restart" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ i18n.t('frame.restart') }}
            </button>
            <button
              type="button"
              class="action-btn w-[5.25rem] justify-center hover:bg-black/5 md:w-[7rem] md:text-[0.8125rem]"
              (click)="giveUp.emit()"
            >
              <svg
                viewBox="0 0 20 20"
                class="size-4 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path [attr.d]="icon.giveUp" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              {{ i18n.t('frame.giveUp') }}
            </button>
          </div>
        </div>
      }
    </app-top-bar>

    @if (status() === 'paused') {
      <section
        class="fixed top-36 left-1/2 z-20 w-[min(92vw,20rem)] -translate-x-1/2 animate-panel-in rounded-2xl bg-panel-solid p-4 text-center shadow-panel md:top-40"
        [attr.aria-label]="i18n.t('frame.paused')"
      >
        <h2 class="font-serif text-xl font-semibold">{{ i18n.t('frame.paused') }}</h2>
        <p class="mt-1 text-sm text-ink-muted">{{ i18n.t('frame.clockStopped') }}</p>
        <button type="button" class="btn-primary mt-3 w-full" (click)="togglePause.emit()">
          {{ i18n.t('frame.resume') }}
        </button>
      </section>
    }

    @if (status() === 'finished' && result(); as r) {
      <section
        class="fixed inset-x-0 bottom-0 z-20 flex animate-panel-in flex-col rounded-t-2xl bg-panel-solid shadow-panel md:inset-x-auto md:top-36 md:right-3 md:bottom-36 md:w-[26rem] md:rounded-2xl"
        [class]="collapsed() ? 'md:bottom-auto' : 'h-[58dvh] md:h-auto'"
        [attr.aria-label]="i18n.t('frame.result')"
      >
        <div class="shrink-0 border-b border-line p-4 pb-3">
          <h2
            #endTitle
            tabindex="-1"
            class="font-serif text-2xl leading-tight font-semibold outline-none"
          >
            {{ title() }}
          </h2>
          <p class="mt-1 text-lg">
            <strong class="tabular-nums">{{
              r.guesses === undefined ? r.found + '/' + r.total : guessesLabel(r.guesses)
            }}</strong>
            <span class="text-sm text-ink-muted">
              {{ i18n.t('frame.in') }} {{ elapsed() }}{{ errorsText(r.errors) }}
            </span>
          </p>
          @if (accuracy(r); as text) {
            <p class="text-sm text-ink-muted">{{ text }}</p>
          }
          @if (record(); as rec) {
            <p class="mt-0.5 text-sm">
              @if (rec.isNew) {
                <span class="font-semibold">{{ i18n.t('frame.newRecord') }}</span>
              } @else if (rec.best; as best) {
                <span class="text-ink-muted">{{ recordText(best) }}</span>
              }
            </p>
          }
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn-primary" (click)="replay.emit()">
              {{ i18n.t('frame.playAgain') }}
            </button>
            <button type="button" class="btn-secondary" (click)="menu.emit()">
              {{ i18n.t('frame.menu') }}
            </button>
            <button
              type="button"
              class="btn-secondary ml-auto"
              [attr.aria-expanded]="!collapsed()"
              (click)="collapsed.set(!collapsed())"
            >
              {{ i18n.t(collapsed() ? 'frame.seeList' : 'frame.seeMap') }}
            </button>
          </div>
        </div>
        @if (!collapsed()) {
          <div class="min-h-0 flex-1 overflow-y-auto p-3">
            <ng-content select="[end]" />
          </div>
        }
      </section>
    }
  `,
})
export class GameFrameComponent {
  readonly time = input<string>();
  readonly progress = input<string>();
  /** What the progress counts, if not "Acertos". */
  readonly progressLabel = input<string>();
  readonly status = input.required<GameStatus>();
  readonly result = input<GameResult | null>(null);
  readonly record = input<RecordOutcome | null>(null);
  readonly listOpen = input(false);
  /** Show the "Lista" button (typing games). */
  readonly hasList = input(false);
  /** Show the "Pular" button (click games), and whether there is another question to go to. */
  readonly skippable = input(false);
  readonly canSkip = input(true);
  /** Wrong clicks so far; leave undefined in games without errors. */
  readonly errors = input<number>();
  /** Title of the end screen, for a game that has its own (Proximity). */
  readonly ownEndTitle = input<string>();
  /** The errors were wrong answers typed, not wrong clicks (Silhouettes). */
  readonly typed = input(false);
  readonly skip = output<void>();

  readonly menu = output<void>();
  readonly settings = output<void>();
  readonly togglePause = output<void>();
  readonly restart = output<void>();
  readonly giveUp = output<void>();
  readonly toggleList = output<void>();
  readonly replay = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly icon = ICON;
  protected readonly collapsed = signal(false);
  /** The "⋯" menu with restart and give up (phones only). */
  protected readonly moreOpen = signal(false);
  private readonly endTitle = viewChild<ElementRef<HTMLElement>>('endTitle');

  protected readonly title = computed(() => {
    const result = this.result();
    if (!result) return '';
    const own = this.ownEndTitle();
    if (own) return own;
    // The Trail game ends by reaching the destination or running out of guesses.
    return this.i18n.t(
      result.guesses === undefined
        ? (`frame.end.${result.reason}` as StringKey)
        : (`frame.end.trail.${result.reason}` as StringKey),
    );
  });

  private errorsLabel(errors: number): string {
    return errors === 1 ? this.i18n.t('frame.error1') : this.i18n.t('frame.errorsN', { n: errors });
  }

  protected guessesLabel(guesses: number): string {
    return guesses === 1
      ? this.i18n.t('frame.guess1')
      : this.i18n.t('frame.guessesN', { n: guesses });
  }

  /** " · 3 errors" after the time, only in games that count errors. */
  protected errorsText(errors: number | undefined): string {
    return errors === undefined ? '' : ` · ${this.errorsLabel(errors)}`;
  }
  /** Click games: hits out of every click made (hits + wrong clicks). */
  protected accuracy(result: GameResult): string {
    if (result.errors === undefined) return '';
    const attempts = result.found + result.errors;
    if (attempts === 0) return '';
    return this.i18n.t(this.typed() ? 'frame.accuracyTyped' : 'frame.accuracy', {
      pct: Math.round((result.found / attempts) * 100),
      found: result.found,
      attempts,
    });
  }

  protected recordText(best: RecordEntry): string {
    const values = {
      found: best.found,
      total: best.total,
      time: formatClock(best.elapsedMs, 'up'),
    };
    if (best.guesses !== undefined) {
      return this.i18n.t('frame.yourRecordGuesses', {
        guesses: this.guessesLabel(best.guesses),
        time: values.time,
      });
    }
    if (best.errors === undefined) return this.i18n.t('frame.yourRecord', values);
    return this.i18n.t('frame.yourRecordErrors', {
      ...values,
      errors: this.errorsLabel(best.errors),
    });
  }

  protected readonly elapsed = computed(() => formatClock(this.result()?.elapsedMs ?? 0, 'up'));

  constructor() {
    // Moves focus to the result so screen readers announce it.
    effect(() => this.endTitle()?.nativeElement.focus());
    // The menu does not stay open once the game is over.
    effect(() => {
      if (this.status() === 'finished') this.moreOpen.set(false);
    });
  }
}
