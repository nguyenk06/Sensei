import { describe, expect, it } from 'vitest';
import { createNightEncounter, NIGHT_ENCOUNTER_CONFIG, randomEncounterDelay, selectNightSpecies } from './overworldEncounters';

describe('Overworld night encounters', () => {
  it('uses centralized common-to-rare encounter weights', () => {
    expect(selectNightSpecies(0)).toBe('zombie');
    expect(selectNightSpecies(.5999)).toBe('zombie');
    expect(selectNightSpecies(.6)).toBe('skeleton');
    expect(selectNightSpecies(.8499)).toBe('skeleton');
    expect(selectNightSpecies(.85)).toBe('enderman');
    expect(selectNightSpecies(.9599)).toBe('enderman');
    expect(selectNightSpecies(.96)).toBe('chicken-jockey');
    expect(selectNightSpecies(.9999)).toBe('chicken-jockey');
    expect(NIGHT_ENCOUNTER_CONFIG.maxConcurrent).toBe(3);
  });

  it('builds deterministic encounters from a controllable random source', () => {
    const values = [.97, .75, .5, .25, .4];
    const encounter = createNightEncounter(() => values.shift() ?? 0, 'test-encounter');
    expect(encounter).toEqual({
      id: 'test-encounter', species: 'chicken-jockey', direction: 'right-to-left', lane: 1,
      positionPercent: 40, durationMs: 8_750, stationary: false
    });
  });

  it('keeps spawn timing inside the configured quiet range', () => {
    expect(randomEncounterDelay(() => 0)).toBe(8_000);
    expect(randomEncounterDelay(() => .999999)).toBe(15_000);
  });
});
