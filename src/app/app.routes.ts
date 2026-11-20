import { Routes } from '@angular/router';
import { leaveGuard } from './core/confirm/confirm.service';
import { Layer } from './core/data/geo-data.models';
import { CHALLENGES, ChallengeId, GAMES } from './core/games';

const typingGame = () =>
  import('./pages/typing-game/typing-game.page').then((m) => m.TypingGamePage);
const clickGame = () => import('./pages/click-game/click-game.page').then((m) => m.ClickGamePage);

const trailGame = () => import('./pages/trail-game/trail-game.page').then((m) => m.TrailGamePage);
const neighborsGame = () =>
  import('./pages/neighbors-game/neighbors-game.page').then((m) => m.NeighborsGamePage);
const proximityGame = () =>
  import('./pages/proximity-game/proximity-game.page').then((m) => m.ProximityGamePage);

const silhouetteGame = () =>
  import('./pages/silhouette-game/silhouette-game.page').then((m) => m.SilhouetteGamePage);

const challengePage = (id: ChallengeId) => {
  if (id === 'silhuetas') return silhouetteGame;
  if (id === 'vizinhos') return neighborsGame;
  return id === 'proximidade' ? proximityGame : trailGame;
};

/** The same five games exist on both maps; the page reads `game` and `layer` from the route. */
const gameRoutes = (layer: Layer): Routes =>
  GAMES.map(({ id }) => ({
    path: layer === 'world' ? `jogo/${id}` : `jogo/brasil/${id}`,
    title: layer === 'world' ? `game.${id}.title` : `game.br.${id}.title`,
    data: { game: id, layer },
    canDeactivate: [leaveGuard],
    loadComponent: id.startsWith('digitar') ? typingGame : clickGame,
  }));

/** The challenges that are playable already; the others only show in the menu. */
const challengeRoutes = (layer: Layer): Routes =>
  CHALLENGES.filter((challenge) => challenge.ready).map(({ id }) => ({
    path: layer === 'world' ? `jogo/${id}` : `jogo/brasil/${id}`,
    title: layer === 'world' ? `game.${id}.title` : `game.br.${id}.title`,
    data: { game: id, layer },
    canDeactivate: [leaveGuard],
    loadComponent: challengePage(id),
  }));

export const routes: Routes = [
  {
    path: '',
    title: 'Orbis',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'sobre',
    title: 'about.title',
    loadComponent: () => import('./pages/about/about.page').then((m) => m.AboutPage),
  },
  ...gameRoutes('world'),
  ...gameRoutes('brazil'),
  ...challengeRoutes('world'),
  ...challengeRoutes('brazil'),
  { path: '**', redirectTo: '' },
];
