import { describe, expect, it } from 'vitest';
import { themes } from './themes';
import { livingOverworldAssets } from './LivingOverworldScene';

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
});
