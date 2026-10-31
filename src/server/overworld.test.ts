import { describe, expect, it, vi } from 'vitest';
import { createOverworldWeatherService, mapWeatherAppearance } from './overworld.js';

describe('Overworld weather', () => {
  it('maps Open-Meteo weather codes to the supported decorative appearances', () => {
    expect(mapWeatherAppearance(0)).toBe('clear');
    expect(mapWeatherAppearance(2)).toBe('partly-cloudy');
    expect(mapWeatherAppearance(3)).toBe('cloudy');
    expect(mapWeatherAppearance(45)).toBe('fog');
    expect(mapWeatherAppearance(63)).toBe('rain');
    expect(mapWeatherAppearance(75)).toBe('snow');
    expect(mapWeatherAppearance(95)).toBe('rain');
  });

  it('shares one 30-minute result and falls back to the last valid weather', async () => {
    let now = new Date('2026-10-29T19:00:00.000Z');
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      current: { time: '2026-10-29T12:00', weather_code: 61, temperature_2m: 12.4, is_day: 1, cloud_cover: 92 },
      daily: { sunrise: ['2026-10-29T07:47'], sunset: ['2026-10-29T17:51'] }
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch;
    const loadWeather = createOverworldWeatherService({ fetchImpl, now: () => now });

    const first = await loadWeather();
    const cached = await loadWeather();
    expect(first).toMatchObject({ appearance: 'rain', temperatureC: 12.4, source: 'open-meteo', stale: false });
    expect(cached.source).toBe('cache');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    now = new Date('2026-10-29T19:31:00.000Z');
    fetchImpl.mockRejectedValueOnce(new Error('offline'));
    const stale = await loadWeather();
    expect(stale).toMatchObject({ appearance: 'rain', source: 'cache', stale: true });
  });

  it('returns neutral scenery when no provider result has ever succeeded', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    const result = await createOverworldWeatherService({ fetchImpl, now: () => new Date('2026-10-29T19:00:00.000Z') })();
    expect(result).toMatchObject({ appearance: 'clear', source: 'fallback', stale: true, weatherCode: null });
  });
});
