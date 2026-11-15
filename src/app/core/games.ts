export type TypingGameId = 'digitar-paises' | 'digitar-capitais';
export type ClickGameId = 'clicar-nome' | 'clicar-capital' | 'clicar-bandeira';
export type GameId = TypingGameId | ClickGameId;

/** Titles and descriptions are interface text: keys `game.<id>.title` and `game.<id>.desc`. */
export interface GameInfo {
  id: GameId;
  /** SVG path (20×20 viewBox) for the menu icon. */
  icon: string;
}

const KEYBOARD = 'M3 6h14v9H3zM6 9h1M9.5 9h1M13 9h1M6.5 12h7';
const POINTER = 'M6 3v11l3-3 2.5 5 2-1-2.5-5H15z';

export const GAMES: GameInfo[] = [
  { id: 'digitar-paises', icon: KEYBOARD },
  { id: 'digitar-capitais', icon: KEYBOARD },
  { id: 'clicar-nome', icon: POINTER },
  { id: 'clicar-capital', icon: 'M10 3 3 7h14zM5 8v6M8.3 8v6M11.7 8v6M15 8v6M3 16h14' },
  { id: 'clicar-bandeira', icon: 'M5 17V3M5 4h10l-2 3.5 2 3.5H5' },
];
