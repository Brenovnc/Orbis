import { TestBed } from '@angular/core/testing';
import { Continent } from '../../core/data/geo-data.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { inContinent } from '../../core/game/targets';
import { worldTargets } from '../../core/game/test-targets';
import { TargetListComponent } from './target-list.component';

describe('list of places', () => {
  function render(continent: Continent | null) {
    const fixture = TestBed.createComponent(TargetListComponent);
    fixture.componentRef.setInput('targets', inContinent(worldTargets(false), continent));
    fixture.componentRef.setInput('found', new Set());
    fixture.componentRef.setInput('mode', 'countries');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const groups = () => [...root.querySelectorAll<HTMLButtonElement>('h3 button')];
    return {
      all: () => root.querySelector<HTMLButtonElement>('button:not(h3 button)'),
      groups,
      open: () => groups().filter((b) => b.getAttribute('aria-expanded') === 'true').length,
      click: (button: HTMLButtonElement | null) => {
        button?.click();
        fixture.detectChanges();
      },
    };
  }

  it('folds and unfolds every group, and the label follows the groups', () => {
    const t = (key: 'list.foldAll' | 'list.unfoldAll') => TestBed.inject(I18nService).t(key);
    const list = render(null);
    const total = list.groups().length;
    const state = () => [
      list.all()?.textContent?.trim(),
      list.all()?.getAttribute('aria-expanded'),
    ];
    expect(total).toBeGreaterThan(1);
    expect(list.open()).toBe(total);
    expect(state()).toEqual([t('list.foldAll'), 'true']);

    list.click(list.all());
    expect(list.open()).toBe(0);
    expect(state()).toEqual([t('list.unfoldAll'), 'false']);

    // By hand: one open is still not all; the last one open changes the label.
    for (const group of list.groups()) {
      expect(state()).toEqual([t('list.unfoldAll'), 'false']);
      list.click(group);
    }
    expect(state()).toEqual([t('list.foldAll'), 'true']);

    list.click(list.groups()[0]);
    expect(state()).toEqual([t('list.unfoldAll'), 'false']);
    list.click(list.all());
    expect(list.open()).toBe(total);
  });

  it('has no such button with a single group', () => {
    const list = render('europe');
    expect(list.groups().length).toBe(1);
    expect(list.all()).toBeNull();
  });
});
