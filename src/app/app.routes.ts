import { Routes } from '@angular/router';
import { leaveGuard } from './core/confirm/confirm.service';
import { Layer } from './core/data/geo-data.models';
import { GAMES } from './core/games';

const typingGame = () =>
  import('./pages/typing-game/typing-game.page').then((m) => m.TypingGamePage);
const clickGame = () => import('./pages/click-game/click-game.page').then((m) => m.ClickGamePage);

/** The same five games exist on both maps; the page reads `game` and `layer` from the route. */
const gameRoutes = (layer: Layer): Routes =>
  GAMES.map(({ id }) => ({
    path: layer === 'world' ? `jogo/${id}` : `jogo/brasil/${id}`,
    title: layer === 'world' ? `game.${id}.title` : `game.br.${id}.title`,
    data: { game: id, layer },
    canDeactivate: [leaveGuard],
    loadComponent: id.startsWith('digitar') ? typingGame : clickGame,
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
  { path: '**', redirectTo: '' },
];
