import { Injectable } from '@angular/core';
import { Layer } from '../data/geo-data.models';
import { GameId } from '../games';
import { readStore, removeStore, writeStore } from '../storage';
import { SavedGame } from './typing-game';

/** The world keeps its original key, so games saved before the Brazil layer still resume. */
const keyOf = (gameId: GameId, layer: Layer) =>
  layer === 'world' ? `game:${gameId}` : `game:${layer}:${gameId}`;

/** The game in progress, one slot per game and map. */
@Injectable({ providedIn: 'root' })
export class SavedGameStore {
  get(gameId: GameId, layer: Layer): SavedGame | null {
    const saved = readStore<SavedGame>(keyOf(gameId, layer));
    const valid =
      saved?.v === 1 &&
      saved.gameId === gameId &&
      saved.layer === layer &&
      Array.isArray(saved.found) &&
      typeof saved.elapsedMs === 'number';
    return valid ? saved : null;
  }

  has(gameId: GameId, layer: Layer): boolean {
    return this.get(gameId, layer) !== null;
  }

  save(game: SavedGame): void {
    writeStore(keyOf(game.gameId, game.layer), game);
  }

  clear(gameId: GameId, layer: Layer): void {
    removeStore(keyOf(gameId, layer));
  }
}
