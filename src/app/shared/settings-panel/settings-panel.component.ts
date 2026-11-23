import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { SettingsService } from '../../core/settings.service';
import { SoundService } from '../../core/sound.service';
import { MapStateService } from '../map/map-state.service';
import { SegmentedComponent, SegmentedOption } from '../ui/segmented.component';
import { SwitchComponent } from '../ui/switch.component';

/** Opens and closes the settings panel from anywhere. */
@Injectable({ providedIn: 'root' })
export class SettingsPanelService {
  readonly open = signal(false);
  /** True when opened from inside a game: only then do the "next game" labels make sense. */
  readonly duringGame = signal(false);

  show(duringGame: boolean): void {
    this.duringGame.set(duringGame);
    this.open.set(true);
  }
}

/**
 * Settings panel, with the general preferences (the difficulty is chosen when a game starts): a
 * native <dialog> (focus stays inside, Esc closes) styled as a small card over the map. Changes are saved at once, in this browser.
 */
@Component({
  selector: 'app-settings-panel',
  imports: [SwitchComponent, SegmentedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    dialog::backdrop {
      background: rgb(20 40 60 / 0.25);
    }
  `,
  template: `
    <dialog
      #dialog
      class="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-panel-solid p-4 text-ink shadow-panel md:inset-x-auto md:top-4 md:bottom-auto md:left-4 md:max-h-[calc(100dvh-2rem)] md:w-[26rem] md:rounded-2xl"
      aria-labelledby="settings-title"
      (cancel)="$event.preventDefault(); close()"
    >
      <div class="flex items-center justify-between">
        <h2 id="settings-title" class="font-serif text-2xl font-semibold">
          {{ i18n.t('settings.title') }}
        </h2>
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full text-ink-muted hover:bg-black/5"
          [attr.aria-label]="i18n.t('settings.close')"
          [title]="i18n.t('settings.close')"
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

      <section class="mt-3">
        <h3 class="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {{ i18n.t('settings.language') }}
        </h3>
        <app-segmented
          [label]="i18n.t('settings.language')"
          [options]="languages"
          [value]="s().language"
          (changed)="settings.update({ language: $any($event) })"
        />
      </section>

      <section class="mt-3">
        <h3 class="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {{ i18n.t('settings.projection') }}
        </h3>
        <app-segmented
          [label]="i18n.t('settings.projection')"
          [options]="projections()"
          [value]="s().mapProjection"
          (changed)="settings.update({ mapProjection: $any($event) })"
        />
        <p class="mt-1 text-xs text-ink-muted">{{ i18n.t('settings.projection.hint') }}</p>
      </section>

      <section class="mt-3">
        <h3 class="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {{ i18n.t('settings.camera') }}
        </h3>
        <app-segmented
          [label]="i18n.t('settings.camera')"
          [options]="cameraModes()"
          [value]="s().camera"
          (changed)="settings.update({ camera: $any($event) })"
        />
        <p class="mt-1 text-xs text-ink-muted">{{ i18n.t('settings.camera.hint') }}</p>
      </section>

      <section class="mt-3 divide-y divide-line">
        <app-switch
          [label]="i18n.t('settings.territories')"
          [tag]="nextGameTag()"
          [hint]="
            brazilMap()
              ? i18n.t('settings.territories.brazil')
              : i18n.t('settings.territories.hint')
          "
          [checked]="s().includeTerritories"
          [disabled]="brazilMap()"
          (changed)="settings.update({ includeTerritories: $event })"
        />
        <app-switch
          [label]="i18n.t('settings.sounds')"
          [hint]="i18n.t('settings.sounds.hint')"
          [checked]="s().sounds"
          (changed)="setSounds($event)"
        />
      </section>

      @if (duringGame()) {
        <p class="mt-3 text-xs text-ink-muted">{{ i18n.t('settings.nextGame.note') }}</p>
      }
    </dialog>
  `,
})
export class SettingsPanelComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly settings = inject(SettingsService);
  private readonly sound = inject(SoundService);
  private readonly panel = inject(SettingsPanelService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private readonly map = inject(MapStateService);

  protected readonly s = this.settings.value;
  protected readonly duringGame = this.panel.duringGame;
  protected readonly nextGameTag = computed(() =>
    this.duringGame() ? this.i18n.t('settings.nextGame') : undefined,
  );
  /** Territories only exist on the world map. */
  protected readonly brazilMap = computed(() => this.map.layer() === 'brazil');
  protected readonly languages: SegmentedOption[] = [
    { value: 'pt', label: 'Português' },
    { value: 'en', label: 'English' },
  ];
  protected readonly projections = computed<SegmentedOption[]>(() => [
    { value: 'continuous', label: this.i18n.t('settings.continuous') },
    { value: 'natural-earth', label: this.i18n.t('settings.naturalEarth') },
  ]);
  protected readonly cameraModes = computed<SegmentedOption[]>(() =>
    (['zoom', 'center', 'off'] as const).map((mode) => ({
      value: mode,
      label: this.i18n.t(`settings.camera.${mode}`),
    })),
  );

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      const open = this.panel.open();
      if (open && !element.open) element.showModal();
      if (!open && element.open) element.close();
    });
  }

  protected close(): void {
    this.panel.open.set(false);
  }

  protected setSounds(on: boolean): void {
    this.settings.update({ sounds: on });
    if (on) this.sound.preview(); // lets the player hear what was just turned on
  }
}
