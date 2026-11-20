export type TypingGameId = 'digitar-paises' | 'digitar-capitais';
export type ClickGameId = 'clicar-nome' | 'clicar-capital' | 'clicar-bandeira';
export type GameId = TypingGameId | ClickGameId | ChallengeId;

/** Titles and descriptions are interface text: keys `game.<id>.title` and `game.<id>.desc`. */
export interface GameInfo {
  id: GameId;
  /** SVG path (20×20 viewBox) for the menu icon. */
  icon: string;
}

/** Capital games can only ask about places that have a capital. */
export const usesCapitals = (id: GameId): boolean =>
  id === 'digitar-capitais' || id === 'clicar-capital';

const KEYBOARD = 'M3 6h14v9H3zM6 9h1M9.5 9h1M13 9h1M6.5 12h7';
const POINTER = 'M6 3v11l3-3 2.5 5 2-1-2.5-5H15z';

export const GAMES: GameInfo[] = [
  { id: 'digitar-paises', icon: KEYBOARD },
  { id: 'digitar-capitais', icon: KEYBOARD },
  { id: 'clicar-nome', icon: POINTER },
  { id: 'clicar-capital', icon: 'M10 3 3 7h14zM5 8v6M8.3 8v6M11.7 8v6M15 8v6M3 16h14' },
  { id: 'clicar-bandeira', icon: 'M5 17V3M5 4h10l-2 3.5 2 3.5H5' },
];

/** Games of the "Desafios" group. The ones not `ready` yet show as "soon" in the menu. */
export type ChallengeId = 'silhuetas' | 'vizinhos' | 'trilha' | 'trilha-dificil' | 'proximidade';

export interface ChallengeInfo {
  id: ChallengeId;
  icon: string;
  ready: boolean;
}

const TRAIL = 'M4 15a2 2 0 1 0 0-.01M16 5a2 2 0 1 0 0-.01M6 14c4 0 1-8 5-8h3';

export const CHALLENGES: ChallengeInfo[] = [
  {
    id: 'silhuetas',
    icon: 'M10 3c3 0 5 2 5 5s-1 3-1 5 1 4-1 4H7c-2 0-2-2-2-4s-1-2-1-5 3-5 6-5z',
    ready: true,
  },
  { id: 'vizinhos', icon: 'M3 4h6v6H3zM11 10h6v6h-6zM9 7h2v3M11 13H9', ready: true },
  { id: 'trilha', icon: TRAIL, ready: true },
  { id: 'trilha-dificil', icon: TRAIL, ready: true },
  { id: 'proximidade', icon: 'M10 3a7 7 0 1 0 .01 0zM10 7a3 3 0 1 0 .01 0z', ready: true },
];
