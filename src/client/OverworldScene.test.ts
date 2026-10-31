import { describe, expect, it } from 'vitest';
import { lightPeriodFor, seasonBlendFor } from './OverworldScene';

describe('Overworld scene selection', () => {
  it('selects meteorological seasons in Pacific Time', () => {
    expect(seasonBlendFor(new Date('2026-04-15T19:00:00Z')).primary).toBe('spring');
    expect(seasonBlendFor(new Date('2026-07-15T19:00:00Z')).primary).toBe('summer');
    expect(seasonBlendFor(new Date('2026-10-15T19:00:00Z')).primary).toBe('autumn');
    expect(seasonBlendFor(new Date('2026-12-20T19:00:00Z')).primary).toBe('winter');
  });

  it('crossfades for seven days on each side of a season boundary', () => {
    const before = seasonBlendFor(new Date('2026-05-25T19:00:00Z'));
    const boundary = seasonBlendFor(new Date('2026-06-01T19:00:00Z'));
    const after = seasonBlendFor(new Date('2026-06-08T19:00:00Z'));
    expect(before).toMatchObject({ primary: 'spring', adjacent: 'summer', adjacentOpacity: 0 });
    expect(boundary.adjacentOpacity).toBe(.5);
    expect(after.adjacentOpacity).toBe(1);
  });

  it('uses sunrise and sunset when available and deterministic fallback periods otherwise', () => {
    expect(lightPeriodFor(new Date('2026-10-29T15:15:00Z'), '2026-10-29T07:45', '2026-10-29T17:50')).toBe('morning');
    expect(lightPeriodFor(new Date('2026-10-29T20:00:00Z'), '2026-10-29T07:45', '2026-10-29T17:50')).toBe('day');
    expect(lightPeriodFor(new Date('2026-10-30T00:30:00Z'), '2026-10-29T07:45', '2026-10-29T17:50')).toBe('evening');
    expect(lightPeriodFor(new Date('2026-10-30T06:00:00Z'), null, null)).toBe('night');
  });
});
