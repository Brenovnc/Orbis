import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { StringKey } from '../../core/i18n/strings';
import { BNCC_SKILLS } from './bncc';

interface Source {
  what: StringKey;
  name: string;
  url: string;
  license: StringKey | string;
}

/** About: a scrollable panel floating over the map, like the menu and the settings. */
@Component({
  selector: 'app-about-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 max-h-[78dvh] animate-panel-in overflow-y-auto rounded-2xl bg-panel-solid p-4 shadow-panel md:inset-x-auto md:top-4 md:bottom-auto md:left-4 md:max-h-[calc(100dvh-2rem)] md:w-[30rem] md:p-5"
      aria-labelledby="about-title"
    >
      <div class="flex items-center justify-between gap-2">
        <h1 id="about-title" class="font-serif text-2xl font-semibold">
          {{ i18n.t('about.title') }}
        </h1>
        <a
          routerLink="/"
          class="shrink-0 rounded-md px-2.5 py-2 text-sm text-accent hover:bg-accent-soft"
        >
          {{ i18n.t('about.back') }}
        </a>
      </div>

      <section class="mt-3">
        <h2 class="font-serif text-lg font-semibold">{{ i18n.t('about.what.title') }}</h2>
        <p class="mt-1 text-sm">{{ i18n.t('about.what.text') }}</p>
      </section>

      <section class="mt-4">
        <h2 class="font-serif text-lg font-semibold">{{ i18n.t('about.how.title') }}</h2>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
          @for (key of how; track key) {
            <li>{{ i18n.t(key) }}</li>
          }
        </ul>
      </section>

      <section class="mt-4">
        <h2 class="font-serif text-lg font-semibold">{{ i18n.t('about.criteria.title') }}</h2>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
          @for (key of criteria; track key) {
            <li>{{ i18n.t(key) }}</li>
          }
        </ul>
        <h3 class="mt-3 text-sm font-semibold">{{ i18n.t('about.borders.title') }}</h3>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
          @for (key of borders; track key) {
            <li>{{ i18n.t(key) }}</li>
          }
        </ul>
        <h3 class="mt-3 text-sm font-semibold">{{ i18n.t('about.maps.title') }}</h3>
        <p class="mt-1 text-sm">{{ i18n.t('about.maps.text') }}</p>
      </section>

      <section class="mt-4">
        <h2 class="font-serif text-lg font-semibold">{{ i18n.t('about.sources.title') }}</h2>
        <p class="mt-1 text-sm">{{ i18n.t('about.sources.text') }}</p>
        <ul class="mt-2 space-y-2 text-sm">
          @for (source of sources; track source.name) {
            <li>
              <span class="mb-0.5 block text-xs text-ink-muted">{{ i18n.t(source.what) }}</span>
              <a
                class="font-medium text-accent underline"
                [href]="source.url"
                target="_blank"
                rel="noopener"
                >{{ source.name }}</a
              >
              <span class="text-ink-muted"> · {{ license(source.license) }}</span>
            </li>
          }
        </ul>
        <p class="mt-2 text-xs text-ink-muted">{{ i18n.t('about.sources.more') }}</p>
      </section>

      <section class="mt-4">
        <h2 class="font-serif text-lg font-semibold">{{ i18n.t('about.bncc.title') }}</h2>
        <p class="mt-1 text-sm">{{ i18n.t('about.bncc.intro') }}</p>
        <ul class="mt-2 space-y-3 text-sm">
          @for (skill of skills; track skill.code) {
            <li>
              <p>
                <strong>{{ skill.code }}</strong>
              </p>
              <p lang="pt-BR" class="mt-0.5">{{ skill.text }}</p>
              <p class="mt-0.5 text-xs text-ink-muted">{{ i18n.t(skill.relation) }}</p>
            </li>
          }
        </ul>
      </section>
    </main>
  `,
})
export class AboutPage {
  protected readonly i18n = inject(I18nService);
  protected readonly skills = BNCC_SKILLS;
  protected readonly how: StringKey[] = [
    'about.how.1',
    'about.how.2',
    'about.how.3',
    'about.how.challenges',
    'about.how.silhouettes',
    'about.how.neighbors',
    'about.how.trail',
    'about.how.proximity',
    'about.how.4',
    'about.how.5',
  ];
  protected readonly borders: StringKey[] = [
    'about.borders.1',
    'about.borders.2',
    'about.borders.3',
  ];
  protected readonly criteria: StringKey[] = [
    'about.criteria.1',
    'about.criteria.2',
    'about.criteria.3',
    'about.criteria.4',
  ];
  protected readonly sources: Source[] = [
    {
      what: 'about.sources.borders',
      name: 'Natural Earth',
      url: 'https://www.naturalearthdata.com/',
      license: 'about.sources.licensePD',
    },
    {
      what: 'about.sources.facts',
      name: 'Wikidata',
      url: 'https://www.wikidata.org/',
      license: 'CC0 1.0',
    },
    {
      what: 'about.sources.states',
      name: 'IBGE',
      url: 'https://servicodados.ibge.gov.br/api/docs',
      license: 'about.sources.licenseIbge',
    },
    {
      what: 'about.sources.flags',
      name: 'flag-icons',
      url: 'https://github.com/lipis/flag-icons',
      license: 'MIT',
    },
    {
      what: 'about.sources.stateFlags',
      name: 'Wikimedia Commons',
      url: 'https://commons.wikimedia.org/',
      license: 'about.sources.licenseFlags',
    },
  ];

  /** A license is either a text key or a name that needs no translation (MIT, CC0). */
  protected license(value: string): string {
    return value.startsWith('about.') ? this.i18n.t(value as StringKey) : value;
  }
}
