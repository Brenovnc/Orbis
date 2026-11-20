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

const challengeRoutes = (layer: Layer): Routes =>
  CHALLENGES.map(({ id }) => ({
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
  // The hard Trail used to have its own menu entry; now it is a level of the Trail.
  { path: 'jogo/trilha-dificil', redirectTo: 'jogo/trilha' },
  { path: 'jogo/brasil/trilha-dificil', redirectTo: 'jogo/brasil/trilha' },
  { path: '**', redirectTo: '' },
];
