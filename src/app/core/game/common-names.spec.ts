// Common ways people write country names, in Portuguese and English, that must be accepted.
// Aliases beyond the Wikidata ones are the editorial list in scripts/decisions.json.
import { worldTargets } from './test-targets';
import { TypingGame } from './typing-game';

/** [what is typed, id of the country it must score] */
const COMMON_NAMES: [string, string][] = [
  ['Congo', 'COG'],
  ['Congo-Brazzaville', 'COG'],
  ['República do Congo', 'COG'],
  ['Congo-Kinshasa', 'COD'],
  ['RD Congo', 'COD'],
  ['Democratic Republic of the Congo', 'COD'],
  ['Swaziland', 'SWZ'],
  ['Suazilândia', 'SWZ'],
  ['Eswatini', 'SWZ'],
  ['Burma', 'MMR'],
  ['Birmânia', 'MMR'],
  ['Myanmar', 'MMR'],
  ['Türkiye', 'TUR'],
  ['Turkiye', 'TUR'],
  ['Turquia', 'TUR'],
  ['Turkey', 'TUR'],
  ['Santa Sé', 'VAT'],
  ['Holy See', 'VAT'],
  ['Vaticano', 'VAT'],
  ['Timor', 'TLS'],
  ['Timor-Leste', 'TLS'],
  ['East Timor', 'TLS'],
  ['Estados Unidos', 'USA'],
  ['EUA', 'USA'],
  ['United States', 'USA'],
  ['Alemanha', 'DEU'],
  ['Germany', 'DEU'],
  ['Holanda', 'NLD'],
  ['Netherlands', 'NLD'],
  ['Costa do Marfim', 'CIV'],
  ['Ivory Coast', 'CIV'],
  ['Tchéquia', 'CZE'],
  ['Czechia', 'CZE'],
  ['Rússia', 'RUS'],
  ['Coreia do Sul', 'KOR'],
  ['South Korea', 'KOR'],
];

const newGame = () =>
  new TypingGame({
    gameId: 'digitar-paises',
    mode: 'countries',
    targets: worldTargets(false),
    tolerance: 1,
    territories: false,
    durationMs: null,
  });

describe('common country names', () => {
  it('accepts each of them (Enter pressed, as a player does when a name is also a start)', () => {
    for (const [typed, id] of COMMON_NAMES) {
      const result = newGame().submit(typed, true);
      expect(result.kind, typed).toBe('hit');
      if (result.kind === 'hit')
        expect(
          result.targets.map((t) => t.id),
          typed,
        ).toEqual([id]);
    }
  });

  it('makes "Congo" wait for Enter while typing, so Congo-Kinshasa can still be typed', () => {
    const game = newGame();
    expect(game.submit('Congo', false).kind).toBe('pending');
    expect(game.foundCount()).toBe(0);
    expect(game.submit('Congo-Kinshasa', false).kind).toBe('hit');
  });
});
