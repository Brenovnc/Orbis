import nonTargetsJson from '../../../../public/data/non-targets.json';
import { NonTargetsData } from '../data/geo-data.models';
import { Explanation, buildNonTargetIndex, explainNonTarget } from './non-targets';
import { territories, worldTargets } from './test-targets';
import { TypingGame } from './typing-game';

const data = nonTargetsJson as unknown as NonTargetsData;
const targetIds = (includeTerritories: boolean) =>
  new Set(worldTargets(includeTerritories).map((target) => target.id));
const explain = (text: string, includeTerritories = false) =>
  explainNonTarget(text, buildNonTargetIndex(territories, data, targetIds(includeTerritories)));

describe('explaining places that are not answers', () => {
  it('says a territory belongs to its country', () => {
    const why = explain('Groenlândia') as Extract<Explanation, { kind: 'territory' }>;
    expect(why.kind).toBe('territory');
    expect(why.name.en).toBe('Greenland');
    expect(why.country.pt).toBe('da Dinamarca');
    expect(explain('greenland')?.kind).toBe('territory');
  });

  it('says places without a country are not among the 195', () => {
    expect(explain('Antártida')?.kind).toBe('unlisted');
    expect(explain('Kosovo')?.kind).toBe('unlisted');
  });

  it('explains the parts of the United Kingdom, in both languages', () => {
    for (const text of ['Inglaterra', 'England', 'Escócia', 'Scotland', 'País de Gales', 'Wales']) {
      const why = explain(text) as Extract<Explanation, { kind: 'part' }>;
      expect(why.kind, text).toBe('part');
      expect(why.country.en, text).toBe('the United Kingdom');
    }
    expect(explain('Irlanda do Norte')?.kind).toBe('part');
    expect(explain('Northern Ireland')?.kind).toBe('part');
  });

  it('never explains a real answer', () => {
    for (const text of ['Brasil', 'Dinamarca', 'Irlanda', 'Reino Unido', 'Chipre']) {
      expect(explain(text), text).toBeNull();
    }
  });

  it('stops explaining a territory once territories are targets', () => {
    expect(explain('Groenlândia', true)).toBeNull();
    expect(explain('Kosovo', true)).toBeNull();
    // Parts of the United Kingdom are never targets.
    expect(explain('Inglaterra', true)?.kind).toBe('part');
  });

  it('has wording for every country that administers a territory', () => {
    for (const territory of territories) {
      if (territory.administeredBy) {
        expect(data.countryPhrases[territory.administeredBy], territory.id).toBeDefined();
      }
    }
  });

  it('explains only when the whole name is typed, never while typing a country', () => {
    const index = buildNonTargetIndex(territories, data, targetIds(false));
    expect(explainNonTarget('Irlanda do Nor', index)).toBeNull();
    expect(explainNonTarget('Irlanda', index)).toBeNull();
    expect(explainNonTarget('Irlanda do Norte', index)?.kind).toBe('part');
  });

  it('knows territories by their map shape id (clicks in the click games)', () => {
    const index = buildNonTargetIndex(territories, data, targetIds(false));
    expect(index.byId.get('ATA')?.kind).toBe('unlisted');
    expect(index.byId.get('KOS')?.kind).toBe('unlisted');
    expect(index.byId.has('BRA')).toBe(false);
    expect(buildNonTargetIndex(territories, data, targetIds(true)).byId.has('KOS')).toBe(false);
  });
});

// Regression: only targets still to find may make an exact name wait for Enter.
describe('names that are also the start of a non-target', () => {
  const typed = (text: string, includeTerritories: boolean) =>
    new TypingGame({
      gameId: 'digitar-paises',
      mode: 'countries',
      targets: worldTargets(includeTerritories),
      tolerance: 1,
      territories: includeTerritories,
      durationMs: null,
    }).submit(text, false).kind;

  it('scores at once with territories off', () => {
    for (const text of ['Guiana', 'Irlanda', 'Samoa', 'Países Baixos']) {
      expect(typed(text, false), text).toBe('hit');
    }
  });

  it('waits only for territories that are targets when they are on', () => {
    expect(typed('Guiana', true)).toBe('pending'); // Guiana Francesa
    expect(typed('Samoa', true)).toBe('pending'); // Samoa Americana
    expect(typed('Países Baixos', true)).toBe('pending'); // Países Baixos Caribenhos
    // Northern Ireland is never a target, not even with territories on.
    expect(typed('Irlanda', true)).toBe('hit');
  });

  it('still makes "Congo" wait, between two targets', () => {
    expect(typed('Congo', false)).toBe('pending');
    expect(typed('Congo', true)).toBe('pending');
  });
});
