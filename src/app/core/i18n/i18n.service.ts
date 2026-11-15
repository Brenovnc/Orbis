import { Injectable, computed, inject } from '@angular/core';
import { Continent, Lang, LocalizedText } from '../data/geo-data.models';
import { SettingsService } from '../settings.service';
import { STRINGS, StringKey } from './strings';

/**
 * Runtime translation (Portuguese / English): the language changes on the spot, with no reload
 * and no separate build. Templates call `t()`; because it reads the language signal, every
 * text updates by itself when the language changes.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly settings = inject(SettingsService);

  readonly lang = computed<Lang>(() => this.settings.value().language);

  t(key: StringKey, params?: Record<string, string | number>): string {
    let text: string = STRINGS[key][this.lang()];
    for (const [name, value] of Object.entries(params ?? {})) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
  }

  /** A name from the generated data (country, capital, state...) in the current language. */
  name(text: LocalizedText): string {
    return text[this.lang()];
  }

  continent(continent: Continent): string {
    return this.t(`continent.${continent}`);
  }

  /** km² with the thousands separator of the current language. */
  area(km2: number): string {
    const locale = this.lang() === 'pt' ? 'pt-BR' : 'en-US';
    const digits = km2 < 10 ? 2 : 0;
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(km2)} km²`;
  }

  /** Sorts names the way the current language expects (accents, case). */
  compare(a: string, b: string): number {
    return a.localeCompare(b, this.lang());
  }
}
