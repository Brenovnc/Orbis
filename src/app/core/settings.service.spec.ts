import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, PRESETS, SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('starts with the defaults: normal difficulty, no sound, no territories, Portuguese', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.value()).toEqual(DEFAULT_SETTINGS);
    expect(settings.preset()).toBe('normal');
    expect(settings.value().sounds).toBe(false);
    expect(settings.value().includeTerritories).toBe(false);
    expect(settings.value().language).toBe('pt');
    expect(settings.value().mapProjection).toBe('continuous');
    expect(settings.value().durationMinutes).toEqual({ world: 15, brazil: 5 });
  });

  it('applies each difficulty shortcut to all its options at once', () => {
    const settings = TestBed.inject(SettingsService);
    for (const preset of ['easy', 'hard', 'normal'] as const) {
      settings.applyPreset(preset);
      expect(settings.preset()).toBe(preset);
      for (const [key, value] of Object.entries(PRESETS[preset])) {
        expect(settings.value()[key as keyof typeof DEFAULT_SETTINGS], `${preset}.${key}`).toEqual(
          value,
        );
      }
    }
  });

  it('sets the Trail level with the shortcuts', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.value().trailLevel).toBe('normal');
    for (const preset of ['easy', 'normal', 'hard'] as const) {
      settings.applyPreset(preset);
      expect(settings.value().trailLevel).toBe(preset);
    }
    // Changing only the Trail level is a customization.
    settings.update({ trailLevel: 'easy' });
    expect(settings.preset()).toBeNull();
  });

  it('leaves language, map, sounds and territories alone when a shortcut is applied', () => {
    const settings = TestBed.inject(SettingsService);
    settings.update({
      language: 'en',
      sounds: true,
      includeTerritories: true,
      mapProjection: 'natural-earth',
    });
    settings.applyPreset('hard');
    expect(settings.value()).toMatchObject({
      language: 'en',
      sounds: true,
      includeTerritories: true,
      mapProjection: 'natural-earth',
    });
  });

  it('shows no shortcut as selected once one option is changed', () => {
    const settings = TestBed.inject(SettingsService);
    settings.applyPreset('easy');
    settings.update({ revealAfterErrors: 5 });
    expect(settings.preset()).toBeNull();
    settings.update({ revealAfterErrors: PRESETS.easy.revealAfterErrors });
    expect(settings.preset()).toBe('easy');
  });

  it('gives 3 attempts per question in easy and normal and 1 in hard', () => {
    expect(PRESETS.easy.revealAfterErrors).toBe(3);
    expect(PRESETS.normal.revealAfterErrors).toBe(3);
    expect(PRESETS.hard.revealAfterErrors).toBe(1);
  });

  it('turns the old "never" (0) in a saved setting into 3 attempts', () => {
    localStorage.setItem('orbis:v1:settings', JSON.stringify({ revealAfterErrors: 0 }));
    expect(TestBed.inject(SettingsService).value().revealAfterErrors).toBe(3);
    localStorage.setItem('orbis:v1:settings', JSON.stringify({ revealAfterErrors: 5 }));
    TestBed.resetTestingModule();
    expect(TestBed.inject(SettingsService).value().revealAfterErrors).toBe(5);
  });

  it('keeps the shortcuts different from each other', () => {
    const easy = JSON.stringify(PRESETS.easy);
    const normal = JSON.stringify(PRESETS.normal);
    const hard = JSON.stringify(PRESETS.hard);
    expect(new Set([easy, normal, hard]).size).toBe(3);
  });

  it('saves in the browser and loads again, filling in options added later', () => {
    TestBed.inject(SettingsService).update({
      language: 'en',
      durationMinutes: { world: 7, brazil: 2 },
    });
    TestBed.resetTestingModule();
    const loaded = TestBed.inject(SettingsService).value();
    expect(loaded.language).toBe('en');
    expect(loaded.durationMinutes).toEqual({ world: 7, brazil: 2 });
    expect(loaded.hoverHighlight).toBe(DEFAULT_SETTINGS.hoverHighlight);

    // A save from an older version, without the newer options, still loads.
    localStorage.setItem('orbis:v1:settings', JSON.stringify({ timerEnabled: false }));
    TestBed.resetTestingModule();
    const old = TestBed.inject(SettingsService).value();
    expect(old.timerEnabled).toBe(false);
    expect(old.sounds).toBe(false);
    expect(old.durationMinutes).toEqual({ world: 15, brazil: 5 });
  });
});
