import { TestBed } from '@angular/core/testing';
import { DEFAULT_SETTINGS, PRESETS, SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => localStorage.clear());

  it('starts with the defaults: normal difficulty, no sound, no territories, Portuguese', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.value()).toEqual(DEFAULT_SETTINGS);
    expect(settings.value()).toMatchObject(PRESETS.normal);
    expect(settings.value().sounds).toBe(false);
    expect(settings.value().includeTerritories).toBe(false);
    expect(settings.value().language).toBe('pt');
    expect(settings.value().mapProjection).toBe('continuous');
  });

  it('applies each difficulty level to all its options at once', () => {
    const settings = TestBed.inject(SettingsService);
    for (const preset of ['easy', 'hard', 'normal'] as const) {
      settings.applyPreset(preset);
      for (const [key, value] of Object.entries(PRESETS[preset])) {
        expect(settings.value()[key as keyof typeof DEFAULT_SETTINGS], `${preset}.${key}`).toEqual(
          value,
        );
      }
    }
  });

  it('keeps the camera out of the levels: it starts on zoom and is never a customization', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.value().camera).toBe('zoom');
    settings.update({ camera: 'off' });
    settings.applyPreset('hard');
    expect(settings.value().camera).toBe('off');
  });

  it('sets the Trail level with the levels', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.value().trailLevel).toBe('normal');
    for (const preset of ['easy', 'normal', 'hard'] as const) {
      settings.applyPreset(preset);
      expect(settings.value().trailLevel).toBe(preset);
    }
  });

  it('sets the forbidden places with the levels, but never the sea crossings', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.value().trailCrossings).toBe(false);
    settings.update({ trailCrossings: true });
    for (const [preset, mode] of [
      ['easy', 'none'],
      ['normal', 'sometimes'],
      ['hard', 'always'],
    ] as const) {
      settings.applyPreset(preset);
      expect(settings.value().trailForbidden).toBe(mode);
      expect(settings.value().trailCrossings).toBe(true);
    }
  });

  it('sets the Silhouettes mode with the levels', () => {
    const settings = TestBed.inject(SettingsService);
    expect(settings.value().silhouetteMode).toBe('hints');
    for (const [preset, mode] of [
      ['easy', 'choices'],
      ['normal', 'hints'],
      ['hard', 'typing'],
    ] as const) {
      settings.applyPreset(preset);
      expect(settings.value().silhouetteMode).toBe(mode);
    }
  });

  it('leaves language, map, sounds and territories alone when a level is applied', () => {
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

  it('hides the borders only in hard, and gives fewer Proximity clues at each level', () => {
    const levels = [PRESETS.easy, PRESETS.normal, PRESETS.hard];
    expect(levels.map((level) => level.mapBorders)).toEqual(['all', 'all', 'coast']);
    expect(levels.map((level) => level.proximityClues)).toEqual([
      'distance-direction',
      'distance',
      'color',
    ]);
  });

  it('never changes the levels themselves when a custom time is set', () => {
    const settings = TestBed.inject(SettingsService);
    settings.applyPreset('hard');
    settings.value().durationMinutes.typing.world = 1;
    expect(PRESETS.hard.durationMinutes.typing.world).toBe(15);
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

  it('keeps the levels different from each other', () => {
    const easy = JSON.stringify(PRESETS.easy);
    const normal = JSON.stringify(PRESETS.normal);
    const hard = JSON.stringify(PRESETS.hard);
    expect(new Set([easy, normal, hard]).size).toBe(3);
  });

  it('saves in the browser and loads again, filling in options added later', () => {
    const durationMinutes = { typing: { world: 7, brazil: 2 }, others: { world: 8, brazil: 3 } };
    TestBed.inject(SettingsService).update({ language: 'en', durationMinutes });
    TestBed.resetTestingModule();
    const loaded = TestBed.inject(SettingsService).value();
    expect(loaded.language).toBe('en');
    expect(loaded.durationMinutes).toEqual(durationMinutes);
    expect(loaded.hoverHighlight).toBe(DEFAULT_SETTINGS.hoverHighlight);

    // A save from an older version, without the newer options, still loads.
    localStorage.setItem(
      'orbis:v1:settings',
      JSON.stringify({ timerEnabled: false, durationMinutes: { world: 7, brazil: 2 } }),
    );
    TestBed.resetTestingModule();
    const old = TestBed.inject(SettingsService).value();
    expect(old.timerEnabled).toBe(false);
    expect(old.sounds).toBe(false);
    expect(old.durationMinutes).toEqual(DEFAULT_SETTINGS.durationMinutes);
  });
});
