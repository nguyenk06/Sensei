import { describe, expect, it } from 'vitest';
import { advanceLivingCreature, createLivingCreaturePopulation, livingCreatureRoutes, type LivingCreatureState } from './livingOverworldCreatures';

const baseCreature: LivingCreatureState = {
  id: 'wolf-0', species: 'wolf', routeIndex: 3, direction: 1, facing: 1,
  hopping: false, moveSequence: 0, moveDurationMs: 5_000,
  ...livingCreatureRoutes.desktop[3]
};

describe('Living Overworld creatures', () => {
  it('limits portrait mobile to one creature and reduces severe-weather populations', () => {
    const mobile = createLivingCreaturePopulation({ season: 'autumn', light: 'day', weather: 'clear', mobile: true, random: () => .4 });
    const storm = createLivingCreaturePopulation({ season: 'autumn', light: 'day', weather: 'rain', mobile: false, random: () => .4 });
    expect(mobile).toHaveLength(1);
    expect(storm).toHaveLength(1);
  });

  it('keeps winter daytime centered on the wolf', () => {
    const winter = createLivingCreaturePopulation({ season: 'winter', light: 'day', weather: 'clear', mobile: false, random: () => .8 });
    expect(winter.map((creature) => creature.species)).toEqual(['wolf']);
  });

  it('uses one bidirectional route and marks only the river crossing as a hop', () => {
    const across = advanceLivingCreature(baseCreature, { season: 'autumn', mobile: false, random: () => .8 });
    expect(across.routeIndex).toBe(4);
    expect(across.hopping).toBe(true);
    expect(across.scale).toBe(livingCreatureRoutes.desktop[4].scale);

    const reverse = advanceLivingCreature({ ...baseCreature, routeIndex: 0, direction: -1, ...livingCreatureRoutes.desktop[0] }, { season: 'autumn', mobile: false, random: () => .8 });
    expect(reverse.direction).toBe(1);
    expect(reverse.routeIndex).toBe(1);
    expect(reverse.hopping).toBe(false);
  });

  it('teleports Enderman only to authored dry ground or the house', () => {
    const enderman: LivingCreatureState = { ...baseCreature, id: 'enderman-0', species: 'enderman' };
    const landed = advanceLivingCreature(enderman, { season: 'autumn', mobile: false, random: () => .999 });
    expect(landed.routeIndex).toBe(-1);
    expect(landed).toMatchObject({ x: 72, y: 67, scale: .68, hopping: false });
    expect(landed.moveSequence).toBe(1);
  });
});

