import { TestBed } from '@angular/core/testing';
import { SettingsService } from '../settings.service';
import { I18nService } from './i18n.service';
import { STRINGS, StringKey } from './strings';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('interface texts', () => {
  const keys = Object.keys(STRINGS) as StringKey[];

  it('has both languages for every text, and never an empty one', () => {
    for (const key of keys) {
      expect(STRINGS[key].pt.trim(), `${key} pt`).not.toBe('');
      expect(STRINGS[key].en.trim(), `${key} en`).not.toBe('');
    }
  });

  it('uses the same placeholders in both languages', () => {
    for (const key of keys) {
      expect(placeholders(STRINGS[key].pt), key).toBe(placeholders(STRINGS[key].en));
    }
  });

  it('has a title and a description for every game and a name for every continent', () => {
    for (const game of [
      'digitar-paises',
      'digitar-capitais',
      'clicar-nome',
      'clicar-capital',
      'clicar-bandeira',
    ]) {
      expect(keys).toContain(`game.${game}.title`);
      expect(keys).toContain(`game.${game}.desc`);
    }
    for (const continent of [
      'africa',
      'antarctica',
      'asia',
      'europe',
      'north-america',
      'oceania',
      'south-america',
    ]) {
      expect(keys).toContain(`continent.${continent}`);
    }
  });
});

describe('I18nService', () => {
  beforeEach(() => localStorage.clear());

  it('starts in Portuguese and changes language on the spot', () => {
    const i18n = TestBed.inject(I18nService);
    const settings = TestBed.inject(SettingsService);
    expect(i18n.t('frame.pause')).toBe('Pausar');
    settings.update({ language: 'en' });
    expect(i18n.t('frame.pause')).toBe('Pause');
    expect(i18n.name({ pt: 'Alemanha', en: 'Germany' })).toBe('Germany');
    expect(i18n.continent('south-america')).toBe('South America');
  });

  it('fills placeholders', () => {
    const i18n = TestBed.inject(I18nService);
    expect(i18n.t('typing.dup', { name: 'Brasil' })).toBe('Você já acertou: Brasil');
  });

  it('formats areas with the separator of the language', () => {
    const i18n = TestBed.inject(I18nService);
    const settings = TestBed.inject(SettingsService);
    expect(i18n.area(8_509_361)).toBe('8.509.361 km²');
    settings.update({ language: 'en' });
    expect(i18n.area(8_509_361)).toBe('8,509,361 km²');
  });
});
