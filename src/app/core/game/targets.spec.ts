import { outOfPlayUnits, withCapitals } from './targets';
import { worldTargets, territories, units } from './test-targets';

describe('areas out of play', () => {
  it('with territories off, the areas of no country are out of play, territories apart', () => {
    const out = outOfPlayUnits(units, worldTargets(false), worldTargets(true), false);
    for (const id of ['ATA', 'KOS', 'SOL', 'CYN', 'TWN', 'ESH']) {
      expect(out.get(id), id).toBe('territories');
    }
    for (const id of ['CNM', 'SPI', 'BRT', 'PGA', 'SCR']) expect(out.get(id), id).toBe('never');
    expect(out.size).toBe(11);
  });

  it('with territories on, only the areas that are no target at all remain', () => {
    const out = outOfPlayUnits(units, worldTargets(true), worldTargets(true), true);
    expect([...out.keys()].sort()).toEqual(['BRT', 'CNM', 'PGA', 'SCR', 'SPI']);
    expect([...out.values()].every((kind) => kind === 'never')).toBe(true);
  });

  it('never marks a country or a territory that administers shapes as out of play', () => {
    const out = outOfPlayUnits(units, worldTargets(false), worldTargets(true), false);
    for (const id of ['GRL', 'FRO', 'GUF', 'HKG', 'BRA']) expect(out.has(id), id).toBe(false);
  });

  it('in the capital games, places with no capital are out of play, whatever the option says', () => {
    const off = withCapitals(worldTargets(false));
    const on = withCapitals(worldTargets(true));
    const noCapital = worldTargets(true).filter((t) => t.place.capitals.length === 0);
    expect(noCapital.map((t) => t.id)).toContain('ATA');
    const out = outOfPlayUnits(units, on, on, true);
    for (const unitId of noCapital.flatMap((t) => t.unitIds)) {
      expect(out.get(unitId), unitId).toBe('game');
    }
    // With territories off, the card must not promise it comes in with the option.
    const outOff = outOfPlayUnits(units, off, on, false);
    expect(outOff.get('ATA')).toBe('unlisted');
    expect(outOff.get('KOS')).toBe('territories');
    // A territory with no capital still belongs to its country when territories are off.
    expect(outOff.has('HKG')).toBe(false);
  });

  it('a country the game does not ask about is a place of the game, not an unlisted area', () => {
    const asked = (on: boolean) => worldTargets(on).filter((t) => !['AND', 'BRB'].includes(t.id));
    const out = outOfPlayUnits(units, asked(false), asked(true), false);
    expect(out.get('AND')).toBe('game');
    expect(out.get('BRB')).toBe('game');
    expect(out.get('TWN')).toBe('territories');
  });
});

describe('world targets and the territories rule', () => {
  const unitsOf = (targets: ReturnType<typeof worldTargets>, id: string) =>
    targets.find((t) => t.id === id)?.unitIds ?? [];

  it('with territories off, the targets are the 195 countries', () => {
    const targets = worldTargets(false);
    expect(targets.length).toBe(195);
    expect(targets.some((t) => t.id === 'GRL')).toBe(false);
  });

  it('with territories off, a territory lights up with the country that administers it', () => {
    const targets = worldTargets(false);
    expect(unitsOf(targets, 'DNK')).toEqual(expect.arrayContaining(['DNK', 'GRL', 'FRO']));
    expect(unitsOf(targets, 'FRA')).toEqual(expect.arrayContaining(['FRA', 'GUF']));
  });

  it('with territories off, Antarctica and unadministered places belong to no target', () => {
    const lit = new Set(worldTargets(false).flatMap((t) => t.unitIds));
    for (const id of ['ATA', 'KOS', 'SOL', 'CYN', 'TWN', 'ESH'])
      expect(lit.has(id), id).toBe(false);
  });

  it('with territories on, territories are targets of their own and the total passes 195', () => {
    const targets = worldTargets(true);
    expect(targets.length).toBe(195 + territories.length);
    expect(unitsOf(targets, 'GRL')).toEqual(['GRL']);
    expect(unitsOf(targets, 'ATA')).toEqual(['ATA']);
    expect(unitsOf(targets, 'DNK')).not.toContain('GRL');
  });

  it('gives every target at least one shape to light up', () => {
    for (const includeTerritories of [false, true]) {
      for (const target of worldTargets(includeTerritories)) {
        expect(target.unitIds.length, target.id).toBeGreaterThan(0);
      }
    }
  });

  it('never lights the same shape for two targets', () => {
    for (const includeTerritories of [false, true]) {
      const all = worldTargets(includeTerritories).flatMap((t) => t.unitIds);
      expect(new Set(all).size).toBe(all.length);
    }
  });
});
