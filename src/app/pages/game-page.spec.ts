import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import worldTopo from '../../../public/data/world.topo.json';
import { GeoDataService } from '../core/data/geo-data.service';
import { PlayedLevel, RecordsService, recordKey } from '../core/game/records.service';
import { SavedGameStore } from '../core/game/saved-game.store';
import { countries, territories } from '../core/game/test-targets';
import { TypingGame } from '../core/game/typing-game';
import { SettingsService } from '../core/settings.service';
import { MapStateService } from '../shared/map/map-state.service';
import { GamePage, NewGameOptions } from './game-page';

@Component({ template: '' })
class TestGamePage extends GamePage<TypingGame> {
  protected createGame(options: NewGameOptions): TypingGame {
    return new TypingGame({
      gameId: 'digitar-paises',
      mode: 'countries',
      tolerance: 1,
      targets: options.targets,
      territories: options.territories,
      durationMs: options.durationMs,
      saved: options.saved ?? undefined,
    });
  }

  type(name: string): void {
    this.game()?.submit(name, true);
    this.save();
  }

  finish(): void {
    const game = this.game();
    game?.giveUp();
    if (game) this.afterChange(game);
  }

  outcome() {
    return this.record();
  }

  playing() {
    return this.game();
  }

  again(): void {
    this.replay();
  }
}

/** A page opened on the real data, once its game has started. */
async function open() {
  const fixture = TestBed.createComponent(TestGamePage);
  await fixture.whenStable();
  return fixture;
}

const recordAt = (played: PlayedLevel) =>
  TestBed.inject(RecordsService).get(
    recordKey({
      gameId: 'digitar-paises',
      layer: 'world',
      territories: false,
      durationMs: 15 * 60_000,
      ...played,
    }),
  );

describe('GamePage: the level of the record', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { game: 'digitar-paises' } } } },
        {
          provide: GeoDataService,
          useValue: {
            world: signal(worldTopo),
            countries: signal(countries),
            territories: signal(territories),
            nonTargets: signal(null),
            loadWorld: () => Promise.resolve(),
          },
        },
      ],
    });
  });

  it('is the one the game started with, even if the settings change in the middle', async () => {
    const settings = TestBed.inject(SettingsService);
    settings.applyPreset('normal');
    const page = (await open()).componentInstance;
    page.type('Brasil');
    settings.applyPreset('easy');
    page.finish();
    expect(page.outcome()?.level).toBe('normal');
    expect(recordAt({ level: 'normal' })?.found).toBe(1);
    expect(recordAt({ level: 'easy' })).toBeNull();

    // A new game follows the settings of now.
    page.again();
    page.type('Brasil');
    page.finish();
    expect(page.outcome()?.level).toBe('easy');
  });

  it('is saved with the game in progress and used when it is resumed', async () => {
    const settings = TestBed.inject(SettingsService);
    settings.applyPreset('hard');
    const first = await open();
    first.componentInstance.type('Brasil');
    first.destroy();
    const saved = TestBed.inject(SavedGameStore).get('digitar-paises', 'world', null);
    expect(saved?.playedLevel).toEqual({ level: 'hard' });

    settings.applyPreset('hard');
    settings.update({ showNames: true }); // custom now
    const resumed = (await open()).componentInstance;
    resumed.finish();
    expect(resumed.outcome()?.level).toBe('hard');
    expect(recordAt({ level: 'hard' })?.found).toBe(1);
    expect(recordAt({ level: 'custom' })).toBeNull();
  });

  it('a saved game keeps the borders it started with; a new one follows the settings', async () => {
    const settings = TestBed.inject(SettingsService);
    const map = TestBed.inject(MapStateService);
    settings.applyPreset('hard');
    const first = await open();
    expect(map.borders()).toBe('coast');
    first.componentInstance.type('Brasil');
    first.destroy();
    expect(map.borders()).toBe('all');

    settings.applyPreset('normal');
    const resumed = (await open()).componentInstance;
    expect(map.borders()).toBe('coast');
    resumed.again();
    expect(map.borders()).toBe('all');
    expect(resumed.playing()?.durationMs).toBe(15 * 60_000);
  });
});
