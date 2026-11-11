import { describe, expect, it } from 'vitest';
import { themes } from './themes';
import {
  livingCreaturePopulation, livingLightFor, livingOverworldAssets, livingSeasonBlendFor,
  livingSeasonFor, livingWeatherFor, moonPhaseFor
} from './LivingOverworldScene';

describe('Living Overworld theme foundation', () => {
  it('registers independently from the existing Overworld theme', () => {
    const living = themes.find((theme) => theme.id === 'living-overworld');
    expect(living?.name).toBe('Living Overworld');
    expect(themes.some((theme) => theme.id === 'minecraft')).toBe(true);
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
  });

  it('declares five aligned production layers for every season', () => {
    expect(livingOverworldAssets.summer).toEqual([
      '/assets/living-overworld/distant-mountains-v2.png',
      '/assets/living-overworld/terrain.png',
      '/assets/living-overworld/water.png',
      '/assets/living-overworld/retreat.png',
      '/assets/living-overworld/foreground-vegetation.png'
    ]);
    expect(Object.keys(livingOverworldAssets)).toEqual(['spring', 'summer', 'autumn', 'winter']);
    expect(Object.values(livingOverworldAssets).every((assets) => assets.length === 5)).toBe(true);
    expect(livingOverworldAssets.spring[1]).toContain('/seasons/spring/');
    expect(livingOverworldAssets.autumn[4]).toContain('/seasons/autumn/');
    expect(livingOverworldAssets.winter.every((asset) => asset.includes('/seasons/winter/'))).toBe(true);
  });

  it('selects meteorological seasons in Pacific time', () => {
    expect(livingSeasonFor(new Date('2026-03-15T19:00:00Z'))).toBe('spring');
    expect(livingSeasonFor(new Date('2026-07-15T19:00:00Z'))).toBe('summer');
    expect(livingSeasonFor(new Date('2026-10-15T19:00:00Z'))).toBe('autumn');
    expect(livingSeasonFor(new Date('2026-12-15T20:00:00Z'))).toBe('winter');
  });

  it('crossfades only during the seven days surrounding a season boundary', () => {
    expect(livingSeasonBlendFor(new Date('2026-02-21T20:00:00Z'))).toEqual({ primary: 'winter', adjacent: null, adjacentOpacity: 0 });
    expect(livingSeasonBlendFor(new Date('2026-02-22T20:00:00Z'))).toEqual({ primary: 'winter', adjacent: 'spring', adjacentOpacity: 0 });
    expect(livingSeasonBlendFor(new Date('2026-03-01T20:00:00Z'))).toEqual({ primary: 'winter', adjacent: 'spring', adjacentOpacity: .5 });
    expect(livingSeasonBlendFor(new Date('2026-03-08T20:00:00Z'))).toEqual({ primary: 'winter', adjacent: 'spring', adjacentOpacity: 1 });
    expect(livingSeasonBlendFor(new Date('2026-03-09T20:00:00Z'))).toEqual({ primary: 'spring', adjacent: null, adjacentOpacity: 0 });
  });

  it('uses Seattle sun times for four daily lighting periods', () => {
    const sunrise = '2026-07-15T05:27';
    const sunset = '2026-07-15T20:59';
    expect(livingLightFor(new Date('2026-07-15T13:00:00Z'), sunrise, sunset)).toBe('morning');
    expect(livingLightFor(new Date('2026-07-15T19:00:00Z'), sunrise, sunset)).toBe('day');
    expect(livingLightFor(new Date('2026-07-16T03:30:00Z'), sunrise, sunset)).toBe('evening');
    expect(livingLightFor(new Date('2026-07-16T07:00:00Z'), sunrise, sunset)).toBe('night');
  });

  it('falls back deterministically when sun times are unavailable', () => {
    expect(livingLightFor(new Date('2026-07-15T14:00:00Z'), null, null)).toBe('morning');
    expect(livingLightFor(new Date('2026-07-15T19:00:00Z'), null, null)).toBe('day');
    expect(livingLightFor(new Date('2026-07-16T02:00:00Z'), null, null)).toBe('evening');
    expect(livingLightFor(new Date('2026-07-16T07:00:00Z'), null, null)).toBe('night');
  });

  it('uses real weather in auto mode and preserves preview overrides', () => {
    const weather = { appearance: 'snow' } as Parameters<typeof livingWeatherFor>[1];
    expect(livingWeatherFor('auto', weather)).toBe('snow');
    expect(livingWeatherFor('rain', weather)).toBe('rain');
    expect(livingWeatherFor('auto', null)).toBe('clear');
  });

  it('limits creatures by season, daylight, weather, and habitat', () => {
    expect(livingCreaturePopulation('summer', 'day', 'clear')).toEqual([
      { species: 'cow', habitat: 'meadow-left' },
      { species: 'pig', habitat: 'shore-center' },
      { species: 'chicken', habitat: 'retreat-bank' },
      { species: 'axolotl', habitat: 'lake' }
    ]);
    expect(livingCreaturePopulation('spring', 'morning', 'cloudy')).toHaveLength(3);
    expect(livingCreaturePopulation('autumn', 'day', 'rain')).toEqual([
      { species: 'cow', habitat: 'meadow-left' },
      { species: 'axolotl', habitat: 'lake' }
    ]);
    expect(livingCreaturePopulation('winter', 'day', 'snow')).toEqual([
      { species: 'sheep', habitat: 'meadow-left' }
    ]);
    expect(livingCreaturePopulation('summer', 'evening', 'clear')).toEqual([
      { species: 'cow', habitat: 'meadow-left' }
    ]);
    expect(livingCreaturePopulation('summer', 'night', 'clear')).toEqual([]);
  });

  it('maps a synodic month into eight deterministic moon phases', () => {
    const epoch = Date.parse('2000-01-06T18:14:00Z');
    const phaseStep = 29.530588853 * 86_400_000 / 8;
    const expected = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
    expect(expected.map((_phase, index) => moonPhaseFor(new Date(epoch + phaseStep * index)))).toEqual(expected);
  });

  it('wraps dates before the reference epoch safely', () => {
    expect(moonPhaseFor(new Date(Date.parse('2000-01-06T18:14:00Z') - 29.530588853 * 86_400_000))).toBe('new');
  });
});
