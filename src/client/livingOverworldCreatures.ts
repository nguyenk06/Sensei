import type { OverworldWeatherAppearance } from '../shared/types';
import type { LivingLight, LivingSeason } from './LivingOverworldScene';

export type LivingCreatureSpecies = 'wolf' | 'chicken' | 'pig' | 'zombie' | 'skeleton' | 'enderman';

export interface LivingCreaturePoint {
  x: number;
  y: number;
  scale: number;
}

export interface LivingCreatureState extends LivingCreaturePoint {
  id: string;
  species: LivingCreatureSpecies;
  routeIndex: number;
  direction: -1 | 1;
  facing: -1 | 1;
  hopping: boolean;
  moveSequence: number;
  moveDurationMs: number;
}

export const livingCreatureRoutes = {
  desktop: [
    { x: 4, y: 92, scale: 1 }, { x: 19, y: 84, scale: .76 }, { x: 36, y: 90, scale: .94 }, { x: 45.6, y: 82, scale: .72 },
    { x: 54.4, y: 82, scale: .72 }, { x: 66, y: 90, scale: .94 }, { x: 80, y: 84, scale: .76 }, { x: 96, y: 91, scale: .97 }
  ],
  mobile: [
    { x: 3, y: 92, scale: 1 }, { x: 18, y: 81, scale: .74 }, { x: 37, y: 89, scale: .92 }, { x: 47, y: 79, scale: .7 },
    { x: 56, y: 80, scale: .71 }, { x: 69, y: 89, scale: .92 }, { x: 84, y: 81, scale: .74 }, { x: 97, y: 91, scale: .97 }
  ]
} satisfies Record<'desktop' | 'mobile', LivingCreaturePoint[]>;

const severeWeather: OverworldWeatherAppearance[] = ['rain', 'snow', 'fog'];

function choose<T>(values: readonly T[], random: () => number): T {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

function routeFor(mobile: boolean): LivingCreaturePoint[] {
  return livingCreatureRoutes[mobile ? 'mobile' : 'desktop'];
}

function stateFor(species: LivingCreatureSpecies, index: number, mobile: boolean, random: () => number): LivingCreatureState {
  const route = routeFor(mobile);
  const routeIndex = Math.min(route.length - 1, Math.floor(random() * route.length));
  const point = route[routeIndex];
  const direction = random() < .5 ? -1 : 1;
  return {
    id: `${species}-${index}`,
    species,
    routeIndex,
    direction,
    facing: direction,
    hopping: false,
    moveSequence: 0,
    moveDurationMs: 4_800 + Math.round(random() * 2_800),
    ...point
  };
}

export function createLivingCreaturePopulation(options: {
  season: LivingSeason;
  light: LivingLight;
  weather: OverworldWeatherAppearance;
  mobile: boolean;
  random?: () => number;
}): LivingCreatureState[] {
  const { season, light, weather, mobile, random = Math.random } = options;
  const nighttime = light === 'night' || light === 'evening';
  const reducedPopulation = severeWeather.includes(weather);
  let species: LivingCreatureSpecies[];

  if (nighttime) {
    const first = random() < .5 ? 'zombie' : 'skeleton';
    species = mobile || reducedPopulation ? [first] : [first, first === 'zombie' ? 'skeleton' : 'zombie'];
    if (random() < (mobile ? .06 : .1)) species[species.length - 1] = 'enderman';
  } else if (season === 'winter') {
    species = ['wolf'];
    if (!mobile && !reducedPopulation && random() < .32) species.push(random() < .5 ? 'chicken' : 'pig');
  } else {
    species = reducedPopulation ? [choose(['wolf', 'chicken', 'pig'] as const, random)] : ['wolf', 'chicken', 'pig'];
    if (mobile) species = [choose(species, random)];
  }

  return species.map((value, index) => stateFor(value, index, mobile, random));
}

function housePoint(season: LivingSeason, mobile: boolean): LivingCreaturePoint {
  if (mobile) return season === 'winter' ? { x: 75, y: 65, scale: .68 } : { x: 77, y: 67, scale: .68 };
  return season === 'winter' ? { x: 68, y: 69, scale: .7 } : { x: 72, y: 67, scale: .68 };
}

export function advanceLivingCreature(
  creature: LivingCreatureState,
  options: { season: LivingSeason; mobile: boolean; random?: () => number }
): LivingCreatureState {
  const { season, mobile, random = Math.random } = options;
  const route = routeFor(mobile);

  if (creature.species === 'enderman') {
    const destinations = [...route, housePoint(season, mobile)];
    const destination = choose(destinations, random);
    return {
      ...creature,
      ...destination,
      routeIndex: destinations.indexOf(destination) < route.length ? destinations.indexOf(destination) : -1,
      hopping: false,
      moveSequence: creature.moveSequence + 1,
      moveDurationMs: 0
    };
  }

  if (random() < .24) return { ...creature, hopping: false, moveSequence: creature.moveSequence + 1 };

  let direction = creature.direction;
  if (random() < .22) direction = direction === 1 ? -1 : 1;
  let nextIndex = creature.routeIndex + direction;
  if (nextIndex < 0 || nextIndex >= route.length) {
    direction = direction === 1 ? -1 : 1;
    nextIndex = creature.routeIndex + direction;
  }
  const point = route[nextIndex];
  const hopping = Math.min(creature.routeIndex, nextIndex) === 3 && Math.max(creature.routeIndex, nextIndex) === 4;
  return {
    ...creature,
    ...point,
    routeIndex: nextIndex,
    direction,
    facing: point.x >= creature.x ? 1 : -1,
    hopping,
    moveSequence: creature.moveSequence + 1,
    moveDurationMs: hopping ? 1_400 : 4_800 + Math.round(random() * 2_800)
  };
}

