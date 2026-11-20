import { Injectable } from '@angular/core';
import { Continent, Layer } from '../data/geo-data.models';
import { GameId } from '../games';
import { readStore, removeStore, writeStore } from '../storage';
import { SavedGame } from './typing-game';

/**
 * The whole world keeps its original key, so games saved before the Brazil layer and the
 * continents still resume. Each continent has its own slot.
 */
const keyOf = (gameId: GameId, layer: Layer, continent: Continent | null) => {
  if (layer !== 'world') return `game:${layer}:${gameId}`;
  return continent ? `game:${continent}:${gameId}` : `game:${gameId}`;
};

/** The game in progress, one slot per game, map and continent. */
@Injectable({ providedIn: 'root' })
export class SavedGameStore {
  get(gameId: GameId, layer: Layer, continent: Continent | null): SavedGame | null {
    const saved = readStore<SavedGame>(keyOf(gameId, layer, continent));
    const valid =
      saved?.v === 1 &&
      saved.gameId === gameId &&
      saved.layer === layer &&
      Array.isArray(saved.found) &&
      typeof saved.elapsedMs === 'number';
    return valid ? saved : null;
  }

  has(gameId: GameId, layer: Layer, continent: Continent | null): boolean {
    return this.get(gameId, layer, continent) !== null;
  }

  save(game: SavedGame, continent: Continent | null): void {
    writeStore(keyOf(game.gameId, game.layer, continent), game);
  }

  clear(gameId: GameId, layer: Layer, continent: Continent | null): void {
    removeStore(keyOf(gameId, layer, continent));
  }
}
