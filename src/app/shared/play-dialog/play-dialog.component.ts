import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Layer } from '../../core/data/geo-data.models';
import { GameId } from '../../core/games';
import { I18nService } from '../../core/i18n/i18n.service';
import { Preset, SettingsService } from '../../core/settings.service';
import { GameIconComponent, GameIconName } from '../ui/game-icon.component';
import { SwitchComponent } from '../ui/switch.component';
import { GameOptionsComponent } from './game-options.component';

export interface PlayLevel {
  level: Preset;
  /** What this level is in the game, already translated. */
  notes: { icon: GameIconName; text: string }[];
  /** The record of this level, already translated; empty when there is none. */
  record: string;
  /** Something the player should know about this level here (the Trail's hard fallback). */
  warning: string;
}

/** What the dialog shows for one game; the page that owns the dialog builds it. */
export interface PlayRequest {
  id: GameId;
  layer: Layer;
  icon: GameIconName;
  title: string;
  levels: PlayLevel[];
  /** The option matching the current settings. */
  selected: Preset | 'custom';
  hasSaved: boolean;
  /** Offers the sea crossings (the Trail on the world map). */
  crossings: boolean;
  /** Why a new game cannot start as things are (the Trail in Oceania with no crossings), or empty. */
  blocked: string;
  /** Says that no place can be forbidden here (Trail), or empty. */
  noForbidden: string;
}

/**
 * The window that opens when a game is picked in the menu: difficulty first, then start (or
 * resume a saved game). "Customize" goes to a second step, with the options of that game. A native
 * <dialog>, styled like the settings panel: a floating card on large screens, a sheet from the
 * bottom on phones. The page decides what starting does.
 */
@Component({
  selector: 'app-play-dialog',
  imports: [GameIconComponent, GameOptionsComponent, SwitchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog::backdrop {
      background: rgb(20 40 60 / 0.25);
    }
  `,
  template: `
    <dialog
      #dialog
      class="fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-panel-solid text-ink shadow-panel open:flex md:inset-x-auto md:top-4 md:bottom-auto md:left-4 md:h-auto md:max-h-[calc(100dvh-2rem)] md:w-[26rem] md:rounded-2xl"
      [class]="step() === 'custom' ? 'h-[94dvh] max-h-[94dvh]' : 'max-h-[88dvh]'"
      aria-labelledby="play-title"
      (cancel)="onCancel($event)"
      (close)="closed.emit()"
    >
      @if (request(); as r) {
        <div class="shrink-0 px-4 pt-4">
          @if (step() === 'custom') {
            <button
              #back
              type="button"
              class="-mt-1 -ml-2 flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-muted hover:bg-black/5"
              (click)="goBack()"
            >
              <app-game-icon name="arrow-left" class="size-4!" />
              {{ i18n.t('play.back') }}
            </button>
          }
          <div class="flex items-center justify-between gap-2">
            <h2 id="play-title" class="flex items-center gap-2.5 font-serif text-2xl font-semibold">
              <span
                class="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft font-sans text-accent"
              >
                <app-game-icon [name]="r.icon" />
              </span>
              {{ r.title }}
            </h2>
            <button
              type="button"
              class="grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-black/5"
              [attr.aria-label]="i18n.t('play.close')"
              [title]="i18n.t('play.close')"
              (click)="close()"
            >
              <svg
                viewBox="0 0 20 20"
                class="size-4 fill-none stroke-current stroke-2"
                aria-hidden="true"
              >
                <path d="m5 5 10 10M15 5 5 15" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        </div>

        @if (step() === 'custom') {
          <section
            class="min-h-0 flex-1 overflow-y-auto px-4 py-1"
            [attr.aria-label]="i18n.t('settings.custom')"
          >
            <app-game-options
              [game]="r.id"
              [layer]="r.layer"
              [crossings]="r.crossings"
              [noForbidden]="r.noForbidden"
            />
          </section>
        } @else {
          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            <fieldset class="grid gap-1.5">
              <legend class="sr-only">{{ i18n.t('play.levels') }}</legend>
              @for (item of r.levels; track item.level) {
                <label [class]="optionClass">
                  <input
                    type="radio"
                    name="play-level"
                    class="mt-1 size-4 shrink-0 accent-accent"
                    [value]="item.level"
                    [checked]="choice() === item.level"
                    (change)="choice.set(item.level)"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span class="font-semibold">{{ i18n.t(levelKey(item.level)) }}</span>
                      @if (item.record) {
                        <span class="text-xs text-ink-muted tabular-nums">{{ item.record }}</span>
                      }
                    </span>
                    <!-- Two columns, so the same item is in the same place in every level. -->
                    <span
                      class="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-[0.8125rem] leading-tight text-ink-muted"
                    >
                      @for (note of item.notes; track note.text) {
                        <span class="flex items-center gap-1.5">
                          <app-game-icon class="size-4! shrink-0" [name]="note.icon" />
                          <span>{{ note.text }}<span class="sr-only">. </span></span>
                        </span>
                      }
                    </span>
                    @if (item.warning) {
                      <span class="mt-0.5 block text-xs font-medium">ⓘ {{ item.warning }}</span>
                    }
                  </span>
                </label>
              }
              <label [class]="optionClass">
                <input
                  type="radio"
                  name="play-level"
                  class="mt-1 size-4 shrink-0 accent-accent"
                  value="custom"
                  [checked]="choice() === 'custom'"
                  (change)="choice.set('custom')"
                />
                <span class="min-w-0 flex-1">
                  <span class="block font-semibold">{{ i18n.t('settings.custom') }}</span>
                  <span class="block text-sm text-ink-muted">{{ i18n.t('play.custom.desc') }}</span>
                </span>
              </label>
            </fieldset>
            @if (r.crossings) {
              <app-switch
                class="mt-1 block"
                [label]="i18n.t('settings.trailCrossings')"
                [hint]="i18n.t('settings.trailCrossings.hint')"
                [checked]="settings.value().trailCrossings"
                (changed)="settings.update({ trailCrossings: $event })"
              />
            }
          </div>
        }

        <div
          class="flex shrink-0 flex-col gap-2 border-t border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          @if (r.blocked) {
            <p id="play-blocked" class="text-xs font-medium" role="status">ⓘ {{ r.blocked }}</p>
          }
          @if (step() === 'levels' && r.hasSaved) {
            <button type="button" class="btn-primary" (click)="resumed.emit()">
              {{ i18n.t('play.continue') }}
            </button>
          }
          <button
            type="button"
            class="disabled:opacity-50"
            [class]="step() === 'levels' && r.hasSaved ? 'btn-secondary' : 'btn-primary'"
            [disabled]="r.blocked && !toCustomize()"
            [attr.aria-describedby]="r.blocked ? 'play-blocked' : null"
            (click)="next()"
          >
            {{ i18n.t(startKey(r)) }}
          </button>
          @if (r.hasSaved) {
            <p class="text-xs text-ink-muted">{{ i18n.t('play.discardNote') }}</p>
          }
        </div>
      }
    </dialog>
  `,
})
export class PlayDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsService);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly back = viewChild<ElementRef<HTMLButtonElement>>('back');

  /** The game to start; null keeps the dialog closed. */
  readonly request = input<PlayRequest | null>(null);
  /** The player picked a level (or finished customizing) and wants a new game. */
  readonly started = output<Preset | 'custom'>();
  readonly resumed = output<void>();
  /** Closed by Esc, the X or the page itself. */
  readonly closed = output<void>();

  protected readonly step = signal<'levels' | 'custom'>('levels');
  protected readonly choice = signal<Preset | 'custom'>('normal');
  /** The main button goes to the customize step, instead of starting. */
  protected readonly toCustomize = computed(
    () => this.step() === 'levels' && this.choice() === 'custom',
  );
  /** Selected state is not only color: a thicker accent border, besides the radio itself. */
  protected readonly optionClass =
    'flex cursor-pointer gap-3 rounded-xl border-2 border-line p-3 hover:bg-accent-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent';

  private readonly gameId = computed(() => this.request()?.id ?? null);

  constructor() {
    // A new game resets the choice to what the current settings match.
    effect(() => {
      if (!this.gameId()) return;
      untracked(() => {
        this.step.set('levels');
        this.choice.set(this.request()?.selected ?? 'normal');
      });
    });
    effect(() => {
      const element = this.dialog().nativeElement;
      const open = this.gameId() !== null;
      if (open && !element.open) {
        element.showModal();
        // After the content is drawn: the checked option gets the focus, so arrows work at once.
        queueMicrotask(() => this.focusChecked());
      }
      if (!open && element.open) element.close();
    });
  }

  protected levelKey(level: Preset) {
    return `settings.${level}` as const;
  }

  protected startKey(request: PlayRequest) {
    if (this.toCustomize()) return 'settings.custom';
    return this.step() === 'levels' && request.hasSaved ? 'play.startNew' : 'play.start';
  }

  protected next(): void {
    if (this.toCustomize()) {
      this.step.set('custom');
      this.afterRender(() => this.back()?.nativeElement.focus());
    } else {
      this.started.emit(this.choice());
    }
  }

  protected goBack(): void {
    this.step.set('levels');
    this.afterRender(() => this.focusChecked());
  }

  /** Esc (or the phone's back gesture) in the customize step goes back to the levels. */
  protected onCancel(event: Event): void {
    if (this.step() !== 'custom') return;
    event.preventDefault();
    this.goBack();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  private focusChecked(): void {
    this.dialog().nativeElement.querySelector<HTMLInputElement>('input:checked')?.focus();
  }

  private afterRender(fn: () => void): void {
    afterNextRender(fn, { injector: this.injector });
  }
}
