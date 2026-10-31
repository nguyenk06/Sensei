import type { OverworldWeatherAppearance, OverworldWeatherResponse } from '../shared/types.js';

const SEATTLE_LATITUDE = 47.6062;
const SEATTLE_LONGITUDE = -122.3321;
const CACHE_MILLISECONDS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MILLISECONDS = 4_000;

interface OpenMeteoPayload {
  current?: {
    time?: string;
    weather_code?: number;
    temperature_2m?: number;
    is_day?: number;
    cloud_cover?: number;
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
}

interface WeatherServiceOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export function mapWeatherAppearance(code: number | null, cloudCover = 0): OverworldWeatherAppearance {
  if (code === null) return cloudCover >= 75 ? 'cloudy' : cloudCover >= 30 ? 'partly-cloudy' : 'clear';
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  return cloudCover >= 75 ? 'cloudy' : cloudCover >= 30 ? 'partly-cloudy' : 'clear';
}

function forecastUrl(): URL {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(SEATTLE_LATITUDE),
    longitude: String(SEATTLE_LONGITUDE),
    current: 'weather_code,temperature_2m,is_day,cloud_cover',
    daily: 'sunrise,sunset',
    timezone: 'America/Los_Angeles',
    forecast_days: '1'
  }).toString();
  return url;
}

export function createOverworldWeatherService(options: WeatherServiceOptions = {}): () => Promise<OverworldWeatherResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());
  let cached: { expiresAt: number; value: OverworldWeatherResponse } | null = null;
  let lastValid: OverworldWeatherResponse | null = null;

  return async () => {
    const currentTime = now();
    if (cached && currentTime.getTime() < cached.expiresAt) {
      return { ...cached.value, source: 'cache' };
    }
    try {
      const response = await fetchImpl(forecastUrl(), {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
        headers: { accept: 'application/json', 'user-agent': 'Sensei household display/0.1' }
      });
      if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
      const payload = await response.json() as OpenMeteoPayload;
      const weatherCode = Number.isFinite(payload.current?.weather_code) ? Number(payload.current?.weather_code) : null;
      const cloudCover = Number.isFinite(payload.current?.cloud_cover) ? Number(payload.current?.cloud_cover) : null;
      const value: OverworldWeatherResponse = {
        appearance: mapWeatherAppearance(weatherCode, cloudCover ?? 0),
        weatherCode,
        temperatureC: Number.isFinite(payload.current?.temperature_2m) ? Number(payload.current?.temperature_2m) : null,
        isDay: payload.current?.is_day === 1 ? true : payload.current?.is_day === 0 ? false : null,
        cloudCover,
        observedAt: payload.current?.time ?? currentTime.toISOString(),
        sunrise: payload.daily?.sunrise?.[0] ?? null,
        sunset: payload.daily?.sunset?.[0] ?? null,
        fetchedAt: currentTime.toISOString(),
        stale: false,
        source: 'open-meteo',
        attribution: 'Open-Meteo'
      };
      lastValid = value;
      cached = { expiresAt: currentTime.getTime() + CACHE_MILLISECONDS, value };
      return value;
    } catch {
      if (lastValid) return { ...lastValid, stale: true, source: 'cache' };
      return {
        appearance: 'clear', weatherCode: null, temperatureC: null, isDay: null, cloudCover: null,
        observedAt: currentTime.toISOString(), sunrise: null, sunset: null, fetchedAt: currentTime.toISOString(),
        stale: true, source: 'fallback', attribution: 'Open-Meteo'
      };
    }
  };
}
