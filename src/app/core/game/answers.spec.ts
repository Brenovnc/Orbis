import { buildIndex, editDistance, matchAnswer, normalizeAnswer } from './answers';
import { worldTargets } from './test-targets';

describe('normalizeAnswer', () => {
  it('ignores case, accents, hyphens, spaces and punctuation', () => {
    expect(normalizeAnswer('São Tomé e Príncipe')).toBe('saotomeeprincipe');
    expect(normalizeAnswer('  sao-tome   E principe ')).toBe('saotomeeprincipe');
    expect(normalizeAnswer('GUINÉ-BISSAU')).toBe(normalizeAnswer('guine bissau'));
    expect(normalizeAnswer('E.U.A.')).toBe('eua');
  });

  it('turns a blank answer into an empty key', () => {
    expect(normalizeAnswer(' - . ')).toBe('');
  });
});

describe('editDistance', () => {
  it('counts insertions, deletions, substitutions and swapped neighbours', () => {
    expect(editDistance('brasil', 'brasil')).toBe(0);
    expect(editDistance('brasil', 'brasl')).toBe(1);
    expect(editDistance('brasil', 'brazil')).toBe(1);
    expect(editDistance('brasil', 'brasli')).toBe(1);
    expect(editDistance('brasil', 'chile')).toBeGreaterThan(2);
  });
});

describe('matchAnswer with countries', () => {
  const targets = worldTargets(false);
  const index = buildIndex(targets, 'countries');
  const none = new Set<string>();
  const exact = { fuzzy: false, tolerance: 1 as const };
  const ids = (result: ReturnType<typeof matchAnswer>) =>
    result.kind === 'miss' ? [] : result.targets.map((t) => t.id);

  it('accepts names in Portuguese and English, with or without accents', () => {
    expect(ids(matchAnswer('Alemanha', index, none, exact))).toEqual(['DEU']);
    expect(ids(matchAnswer('germany', index, none, exact))).toEqual(['DEU']);
    expect(ids(matchAnswer('sao tome e principe', index, none, exact))).toEqual(['STP']);
  });

  it('accepts common aliases such as EUA and USA', () => {
    expect(ids(matchAnswer('EUA', index, none, exact))).toEqual(['USA']);
    expect(ids(matchAnswer('USA', index, none, exact))).toEqual(['USA']);
    expect(ids(matchAnswer('Estados Unidos', index, none, exact))).toEqual(['USA']);
  });

  it('does not accept a territory as its own country when territories are off', () => {
    expect(matchAnswer('Groenlândia', index, none, exact).kind).toBe('miss');
    expect(
      ids(matchAnswer('Groenlândia', buildIndex(worldTargets(true), 'countries'), none, exact)),
    ).toEqual(['GRL']);
  });

  it('reports an answer that was already given as a duplicate, without scoring again', () => {
    const result = matchAnswer('brasil', index, new Set(['BRA']), exact);
    expect(result.kind).toBe('duplicate');
  });

  it('forgives typos only when fuzzy is on and the tolerance allows it', () => {
    expect(matchAnswer('Brasl', index, none, exact).kind).toBe('miss');
    expect(ids(matchAnswer('Brasl', index, none, { fuzzy: true, tolerance: 1 }))).toEqual(['BRA']);
    expect(matchAnswer('Brasl', index, none, { fuzzy: true, tolerance: 0 }).kind).toBe('miss');
  });

  it('never forgives typos in very short names', () => {
    expect(matchAnswer('Pau', index, none, { fuzzy: true, tolerance: 2 }).kind).toBe('miss');
    expect(matchAnswer('Chd', index, none, { fuzzy: true, tolerance: 2 }).kind).toBe('miss');
  });

  it('refuses to guess when a typo fits two different places equally', () => {
    // One edit away from both Niger and Nigeria: better to say 'not found' than to guess.
    const result = matchAnswer('Nigera', index, none, { fuzzy: true, tolerance: 1 });
    expect(result.kind).toBe('miss');
  });
});

describe('matchAnswer with capitals', () => {
  const none = new Set<string>();
  const exact = { fuzzy: false, tolerance: 1 as const };
  const ids = (result: ReturnType<typeof matchAnswer>) =>
    result.kind === 'miss' ? [] : result.targets.map((t) => t.id);

  it('accepts any capital of a country with several', () => {
    const index = buildIndex(worldTargets(false), 'capitals');
    expect(ids(matchAnswer('Sucre', index, none, exact))).toEqual(['BOL']);
    expect(ids(matchAnswer('La Paz', index, none, exact))).toEqual(['BOL']);
    expect(ids(matchAnswer('Pretória', index, none, exact))).toEqual(['ZAF']);
  });

  it('marks every place that has the typed capital name when territories are on', () => {
    const index = buildIndex(worldTargets(true), 'capitals');
    expect(ids(matchAnswer('Kingston', index, none, exact)).sort()).toEqual(['JAM', 'NFK']);
    // Already found one of them: the other is still a hit.
    const result = matchAnswer('Kingston', index, new Set(['JAM']), exact);
    expect(ids(result)).toEqual(['NFK']);
  });

  it('counts a territory capital for no one when territories are off', () => {
    const index = buildIndex(worldTargets(false), 'capitals');
    expect(ids(matchAnswer('Kingston', index, none, exact))).toEqual(['JAM']);
  });

  it('does not accept the country name as a capital answer', () => {
    const index = buildIndex(worldTargets(false), 'capitals');
    expect(matchAnswer('Bolívia', index, none, exact).kind).toBe('miss');
  });
});
