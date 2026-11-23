import { GameIconName } from '../shared/ui/game-icon.component';

export type TypingGameId = 'digitar-paises' | 'digitar-capitais';
export type ClickGameId = 'clicar-nome' | 'clicar-capital' | 'clicar-bandeira';
export type GameId = TypingGameId | ClickGameId | ChallengeId;

/** Titles and descriptions are interface text: keys `game.<id>.title` and `game.<id>.desc`. */
export interface GameInfo {
  id: GameId;
  icon: GameIconName;
  /** Shows the difficulty badge on the icon. */
  hard?: boolean;
}

export const isTypingGame = (id: GameId): id is TypingGameId => id.startsWith('digitar');
export const isClickGame = (id: GameId): id is ClickGameId => id.startsWith('clicar');

/** Capital games can only ask about places that have a capital. */
export const usesCapitals = (id: GameId): boolean =>
  id === 'digitar-capitais' || id === 'clicar-capital';

/** The Trail and Proximity end some other way: their clock only counts up. */
export const hasTimeLimit = (id: GameId): boolean => id !== 'trilha' && id !== 'proximidade';

export const GAMES: GameInfo[] = [
  { id: 'digitar-paises', icon: 'keyboard' },
  { id: 'digitar-capitais', icon: 'landmark' },
  { id: 'clicar-nome', icon: 'pointer' },
  { id: 'clicar-capital', icon: 'map-pin' },
  { id: 'clicar-bandeira', icon: 'flag' },
];

/** Games of the "Desafios" group. */
export type ChallengeId = 'silhuetas' | 'vizinhos' | 'trilha' | 'proximidade';

export interface ChallengeInfo {
  id: ChallengeId;
  icon: GameIconName;
  hard?: boolean;
}

export const CHALLENGES: ChallengeInfo[] = [
  {
    id: 'silhuetas',
    icon: 'shapes',
  },
  { id: 'vizinhos', icon: 'grid' },
  { id: 'trilha', icon: 'route' },
  { id: 'proximidade', icon: 'radar' },
];
