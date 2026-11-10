import { describe, expect, it } from 'vitest';
import { themes } from './themes';
import { livingOverworldAssets, moonPhaseFor } from './LivingOverworldScene';

describe('Living Overworld theme foundation', () => {
  it('registers independently from the existing Overworld theme', () => {
    const living = themes.find((theme) => theme.id === 'living-overworld');
    expect(living?.name).toBe('Living Overworld');
    expect(themes.some((theme) => theme.id === 'minecraft')).toBe(true);
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
  });

  it('declares the five independently composited production layers', () => {
    expect(livingOverworldAssets).toEqual([
      '/assets/living-overworld/distant-mountains-v2.png',
      '/assets/living-overworld/terrain.png',
      '/assets/living-overworld/water.png',
      '/assets/living-overworld/retreat.png',
      '/assets/living-overworld/foreground-vegetation.png'
    ]);
  });

  it('maps a synodic month into eight deterministic square-moon phases', () => {
    const epoch = Date.parse('2000-01-06T18:14:00Z');
    const phaseStep = 29.530588853 * 86_400_000 / 8;
    const expected = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
    expect(expected.map((_phase, index) => moonPhaseFor(new Date(epoch + phaseStep * index)))).toEqual(expected);
  });

  it('wraps dates before the reference epoch safely', () => {
    expect(moonPhaseFor(new Date(Date.parse('2000-01-06T18:14:00Z') - 29.530588853 * 86_400_000))).toBe('new');
  });
});
