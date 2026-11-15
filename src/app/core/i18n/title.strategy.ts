import { Injectable, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';
import { STRINGS, StringKey } from './strings';

/** Page titles in the current language: a route's `title` is an interface text key. */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly i18n = inject(I18nService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    // A route title is a text key; anything else (the home page: "Orbis") is used as written.
    document.title =
      title && title in STRINGS ? `${this.i18n.t(title as StringKey)} · Orbis` : (title ?? 'Orbis');
  }
}
