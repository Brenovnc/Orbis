import { worldTargets, territories } from './test-targets';

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
