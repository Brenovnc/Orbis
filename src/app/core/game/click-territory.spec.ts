// Messages of the click games when a territory counts as its country (territories off).
import { TestBed } from '@angular/core/testing';
import nonTargetsJson from '../../../../public/data/non-targets.json';
import { NonTargetsData } from '../data/geo-data.models';
import { I18nService } from '../i18n/i18n.service';
import { SettingsService } from '../settings.service';
import { territoryWords } from './non-targets';
import { territories } from './test-targets';

const data = nonTargetsJson as unknown as NonTargetsData;
const greenland = territories.find((territory) => territory.id === 'GRL')!;

describe('click game messages for a territory that counts as its country', () => {
  beforeEach(() => localStorage.clear());

  const messages = (language: 'pt' | 'en') => {
    TestBed.inject(SettingsService).update({ language });
    const i18n = TestBed.inject(I18nService);
    const words = territoryWords(greenland, data, (text) => i18n.name(text));
    return {
      wrong: i18n.t('click.thatIsTerritory', words),
      hit: i18n.t('click.correctTerritory', {
        name: i18n.name({ pt: 'Dinamarca', en: 'Denmark' }),
        ...words,
      }),
    };
  };

  it('names the territory and the country in Portuguese', () => {
    const { wrong, hit } = messages('pt');
    expect(wrong).toBe('Esse é: Groenlândia, território da Dinamarca');
    expect(hit).toBe('Correto! Dinamarca. Groenlândia é um território da Dinamarca');
  });

  it('names the territory and the country in English', () => {
    const { wrong, hit } = messages('en');
    expect(wrong).toBe("That's: Greenland, a territory of Denmark");
    expect(hit).toBe('Correct! Denmark. Greenland is a territory of Denmark');
  });
});
