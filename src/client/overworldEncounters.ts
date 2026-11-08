export type NightCreatureSpecies = 'zombie' | 'skeleton' | 'enderman' | 'chicken-jockey';
export type EncounterDirection = 'left-to-right' | 'right-to-left';

export interface NightEncounter {
  id: string;
  species: NightCreatureSpecies;
  direction: EncounterDirection;
  lane: 0 | 1 | 2;
  positionPercent: number;
  durationMs: number;
  stationary: boolean;
}

interface SpeciesConfig {
  species: NightCreatureSpecies;
  weight: number;
  durationMs: readonly [number, number];
}

export const NIGHT_ENCOUNTER_CONFIG = {
  maxConcurrent: 3,
  spawnDelayMs: [8_000, 15_000] as const,
  species: [
    { species: 'zombie', weight: 60, durationMs: [18_000, 26_000] },
    { species: 'skeleton', weight: 25, durationMs: [15_000, 22_000] },
    { species: 'enderman', weight: 11, durationMs: [7_000, 11_000] },
    { species: 'chicken-jockey', weight: 4, durationMs: [8_000, 11_000] }
  ] as readonly SpeciesConfig[]
} as const;

function normalizedRandom(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(.999_999, value));
}

export function selectNightSpecies(randomValue: number): NightCreatureSpecies {
  const target = normalizedRandom(randomValue) * 100;
  let cumulativeWeight = 0;
  for (const entry of NIGHT_ENCOUNTER_CONFIG.species) {
    cumulativeWeight += entry.weight;
    if (target < cumulativeWeight) return entry.species;
  }
  return 'chicken-jockey';
}

export function randomEncounterDelay(random: () => number): number {
  const [minimum, maximum] = NIGHT_ENCOUNTER_CONFIG.spawnDelayMs;
  return Math.round(minimum + normalizedRandom(random()) * (maximum - minimum));
}

export function createNightEncounter(random: () => number, id: string, stationary = false): NightEncounter {
  const species = selectNightSpecies(random());
  const config = NIGHT_ENCOUNTER_CONFIG.species.find((entry) => entry.species === species)!;
  const direction = random() < .5 ? 'left-to-right' : 'right-to-left';
  const lane = Math.floor(normalizedRandom(random()) * 3) as 0 | 1 | 2;
  const [minimumDuration, maximumDuration] = config.durationMs;
  const durationMs = Math.round(minimumDuration + normalizedRandom(random()) * (maximumDuration - minimumDuration));
  const positionPercent = Math.round(12 + normalizedRandom(random()) * 70);
  return { id, species, direction, lane, positionPercent, durationMs, stationary };
}
