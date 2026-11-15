import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/i18n/i18n.service';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { WorldMapComponent } from './shared/map/world-map.component';
import { SettingsPanelComponent } from './shared/settings-panel/settings-panel.component';

@Component({
  imports: [RouterOutlet, WorldMapComponent, ConfirmDialogComponent, SettingsPanelComponent],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    const i18n = inject(I18nService);
    // Screen readers and the browser need to know which language the page is in.
    effect(() => {
      document.documentElement.lang = i18n.lang() === 'pt' ? 'pt-BR' : 'en';
    });
  }
}
