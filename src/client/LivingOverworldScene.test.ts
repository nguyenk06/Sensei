import { describe, expect, it } from 'vitest';
import { themes } from './themes';
import {
  createLivingSkyEvent, livingCelestialTopForPreviewHeight, livingCelestialTrackFor, livingLightFor, livingSeasonBlendFor, livingSeasonFor, livingSeasonIllustrations,
  livingWeatherFor, moonPhaseFor
} from './LivingOverworldScene';

describe('Living Overworld theme foundation', () => {
  it('registers independently from the existing Overworld theme', () => {
    const living = themes.find((theme) => theme.id === 'living-overworld');
    expect(living?.name).toBe('Living Overworld');
    expect(themes.some((theme) => theme.id === 'minecraft')).toBe(true);
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
  });

  it('uses one cohesive illustration per approved seasonal proof', () => {
    expect(livingSeasonIllustrations.autumn).toEqual({
      mobile: '/assets/living-overworld/seasons/autumn/mobile.png',
      desktop: '/assets/living-overworld/seasons/autumn/desktop.png',
      nightMobile: '/assets/living-overworld/seasons/autumn/night-mobile.png',
      nightDesktop: '/assets/living-overworld/seasons/autumn/night-desktop.png'
    });
    expect(livingSeasonIllustrations.winter).toEqual({
      mobile: '/assets/living-overworld/seasons/winter/mobile.png',
      desktop: '/assets/living-overworld/seasons/winter/desktop.png',
      nightMobile: '/assets/living-overworld/seasons/winter/night-mobile.png',
      nightDesktop: '/assets/living-overworld/seasons/winter/night-desktop.png'
    });
    expect(livingSeasonIllustrations.spring).toBe(livingSeasonIllustrations.autumn);
    expect(livingSeasonIllustrations.summer).toBe(livingSeasonIllustrations.autumn);
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

  it('moves the celestial body vertically from the horizon to a contained apex', () => {
    const sunrise = '2026-07-15T06:00';
    const sunset = '2026-07-15T20:00';
    const rising = livingCelestialTrackFor(new Date('2026-07-15T13:00:00Z'), sunrise, sunset);
    const apex = livingCelestialTrackFor(new Date('2026-07-15T20:00:00Z'), sunrise, sunset);
    const night = livingCelestialTrackFor(new Date('2026-07-16T08:00:00Z'), sunrise, sunset);
    expect(rising).toMatchObject({ body: 'sun', progress: 0, topPercent: 72 });
    expect(apex.body).toBe('sun');
    expect(apex.topPercent).toBeCloseTo(18, 5);
    expect(night.body).toBe('moon');
    expect(night.progress).toBeCloseTo(.5, 5);
    expect(night.topPercent).toBeCloseTo(18, 5);
  });

  it('maps the manual celestial slider from low to high in the intuitive direction', () => {
    expect(livingCelestialTopForPreviewHeight(0)).toBe(68);
    expect(livingCelestialTopForPreviewHeight(50)).toBe(43);
    expect(livingCelestialTopForPreviewHeight(100)).toBe(18);
    expect(livingCelestialTopForPreviewHeight(-50)).toBe(68);
    expect(livingCelestialTopForPreviewHeight(150)).toBe(18);
  });

  it('uses real weather in auto mode and preserves preview overrides', () => {
    const weather = { appearance: 'snow' } as Parameters<typeof livingWeatherFor>[1];
    expect(livingWeatherFor('auto', weather)).toBe('snow');
    expect(livingWeatherFor('rain', weather)).toBe('rain');
    expect(livingWeatherFor('auto', null)).toBe('clear');
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

  it('gives meteors and comets distinct point-to-point sky travel', () => {
    const meteor = createLivingSkyEvent('meteor', 1, () => .25);
    const comet = createLivingSkyEvent('comet', 2, () => .25);
    expect(meteor).toMatchObject({ kind: 'meteor', sequence: 1, durationMs: 1350 });
    expect(comet).toMatchObject({ kind: 'comet', sequence: 2, durationMs: 14_000 });
    expect(meteor.endX).toBeGreaterThan(meteor.startX);
    expect(meteor.endY).toBeGreaterThan(meteor.startY);
    expect(comet.startY).toBeGreaterThanOrEqual(42);
    expect(comet.endY).toBeGreaterThanOrEqual(108);
    expect(comet.durationMs).toBeGreaterThan(meteor.durationMs * 5);
    expect([meteor.startX, meteor.startY, meteor.endX, meteor.endY, comet.startX, comet.startY, comet.endX]
      .every((coordinate) => coordinate >= 0 && coordinate <= 100)).toBe(true);
  });
});
