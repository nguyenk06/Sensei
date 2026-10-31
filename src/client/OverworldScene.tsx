import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OverworldWeatherAppearance, OverworldWeatherResponse } from '../shared/types';

type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type LightPeriod = 'morning' | 'day' | 'evening' | 'night';
type Override<T extends string> = T | 'auto';

const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const lightPeriods: LightPeriod[] = ['morning', 'day', 'evening', 'night'];
const weatherAppearances: OverworldWeatherAppearance[] = ['clear', 'partly-cloudy', 'cloudy', 'rain', 'snow', 'fog'];
const assetRoot = '/assets/overworld-v04';

interface PacificParts { year: number; month: number; day: number; hour: number; minute: number }
interface SeasonBlend { primary: Season; adjacent: Season | null; adjacentOpacity: number }

function pacificParts(date: Date): PacificParts {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return values as unknown as PacificParts;
}

export function seasonBlendFor(date: Date): SeasonBlend {
  const parts = pacificParts(date);
  const dayValue = Date.UTC(parts.year, parts.month - 1, parts.day);
  const oneDay = 86_400_000;
  const boundaries: Array<{ month: number; day: number; from: Season; to: Season }> = [
    { month: 3, day: 1, from: 'winter', to: 'spring' },
    { month: 6, day: 1, from: 'spring', to: 'summer' },
    { month: 9, day: 1, from: 'summer', to: 'autumn' },
    { month: 12, day: 1, from: 'autumn', to: 'winter' }
  ];
  for (const boundary of boundaries) {
    const center = Date.UTC(parts.year, boundary.month - 1, boundary.day);
    const start = center - 7 * oneDay;
    const end = center + 7 * oneDay;
    if (dayValue >= start && dayValue <= end) {
      return { primary: boundary.from, adjacent: boundary.to, adjacentOpacity: (dayValue - start) / (end - start) };
    }
  }
  const primary: Season = parts.month >= 3 && parts.month <= 5 ? 'spring'
    : parts.month >= 6 && parts.month <= 8 ? 'summer'
      : parts.month >= 9 && parts.month <= 11 ? 'autumn' : 'winter';
  return { primary, adjacent: null, adjacentOpacity: 0 };
}

function clockMinutes(value: string | null): number | null {
  const match = value?.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function lightPeriodFor(date: Date, sunrise: string | null, sunset: string | null): LightPeriod {
  const parts = pacificParts(date);
  const current = parts.hour * 60 + parts.minute;
  const rise = clockMinutes(sunrise);
  const set = clockMinutes(sunset);
  if (rise !== null && set !== null) {
    if (current >= rise - 60 && current < rise + 120) return 'morning';
    if (current >= rise + 120 && current < set - 120) return 'day';
    if (current >= set - 120 && current < set + 60) return 'evening';
    return 'night';
  }
  if (parts.hour >= 5 && parts.hour < 9) return 'morning';
  if (parts.hour >= 9 && parts.hour < 17) return 'day';
  if (parts.hour >= 17 && parts.hour < 21) return 'evening';
  return 'night';
}

function title(value: string): string {
  return value.replace(/(^|-)(\w)/g, (_match, dash: string, letter: string) => `${dash ? ' ' : ''}${letter.toUpperCase()}`);
}

async function loadWeather(): Promise<OverworldWeatherResponse> {
  const response = await fetch('/api/overworld/weather');
  if (!response.ok) throw new Error('Weather unavailable');
  return response.json() as Promise<OverworldWeatherResponse>;
}

export function OverworldScene() {
  const [weather, setWeather] = useState<OverworldWeatherResponse | null>(null);
  const [seasonOverride, setSeasonOverride] = useState<Override<Season>>('auto');
  const [lightOverride, setLightOverride] = useState<Override<LightPeriod>>('auto');
  const [weatherOverride, setWeatherOverride] = useState<Override<OverworldWeatherAppearance>>('auto');
  const [motionEnabled, setMotionEnabled] = useState(() => localStorage.getItem('sensei-overworld-motion') !== 'off');
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    const refresh = () => void loadWeather().then((result) => { if (active) setWeather(result); }).catch(() => undefined);
    refresh();
    const weatherTimer = window.setInterval(refresh, 30 * 60 * 1000);
    const clockTimer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => { active = false; window.clearInterval(weatherTimer); window.clearInterval(clockTimer); };
  }, []);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReducedMotion(query.matches);
    const onVisibility = () => setPageVisible(!document.hidden);
    query.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { query.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const blend = useMemo(() => seasonOverride === 'auto' ? seasonBlendFor(now)
    : { primary: seasonOverride, adjacent: null, adjacentOpacity: 0 }, [now, seasonOverride]);
  const light = lightOverride === 'auto' ? lightPeriodFor(now, weather?.sunrise ?? null, weather?.sunset ?? null) : lightOverride;
  const weatherAppearance = weatherOverride === 'auto' ? weather?.appearance ?? 'clear' : weatherOverride;
  const displaySeason = blend.adjacent && blend.adjacentOpacity >= .5 ? blend.adjacent : blend.primary;
  const landAnimals: Record<Season, Array<'sheep' | 'pig' | 'cow' | 'chicken'>> = {
    spring: ['sheep', 'pig', 'chicken'], summer: ['sheep', 'cow', 'chicken'],
    autumn: ['pig', 'cow', 'chicken'], winter: ['sheep', 'cow', 'chicken']
  };
  const moving = motionEnabled && !reducedMotion && pageVisible;

  function toggleMotion() {
    const next = !motionEnabled;
    setMotionEnabled(next);
    localStorage.setItem('sensei-overworld-motion', next ? 'on' : 'off');
  }

  const header = document.querySelector<HTMLElement>('.topbar');
  const headerTools = <div className="overworld-header-tools">
    <div className="overworld-status">
      <strong>{title(displaySeason)} · {title(light)}</strong>
      <span>{title(weatherAppearance)}{weather?.temperatureC !== null && weather?.temperatureC !== undefined ? ` · ${Math.round(weather.temperatureC)}°C` : ''}</span>
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo</a>
    </div>
    <details className="overworld-lab">
      <summary>Scene controls</summary>
      <div className="overworld-lab-grid">
        <label>Season<select value={seasonOverride} onChange={(event) => setSeasonOverride(event.target.value as Override<Season>)}>
          <option value="auto">Auto</option>{seasons.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>
        <label>Light<select value={lightOverride} onChange={(event) => setLightOverride(event.target.value as Override<LightPeriod>)}>
          <option value="auto">Auto</option>{lightPeriods.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>
        <label>Weather<select value={weatherOverride} onChange={(event) => setWeatherOverride(event.target.value as Override<OverworldWeatherAppearance>)}>
          <option value="auto">Auto</option>{weatherAppearances.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>
        <button type="button" aria-pressed={!motionEnabled} onClick={toggleMotion}>{motionEnabled ? 'Pause motion' : 'Resume motion'}</button>
      </div>
    </details>
  </div>;

  return <section className={`overworld-banner season-${displaySeason} light-${light} weather-${weatherAppearance} ${moving ? 'motion-on' : 'motion-off'}`} aria-label="Living Overworld scene">
    <div className="overworld-scene" aria-hidden="true">
      <img className="overworld-layer overworld-landscape" src={`${assetRoot}/landscapes/${blend.primary}.webp`} alt="" />
      {blend.adjacent && <img className="overworld-layer overworld-landscape" style={{ opacity: blend.adjacentOpacity }}
        src={`${assetRoot}/landscapes/${blend.adjacent}.webp`} alt="" />}
      <img className="overworld-layer overworld-light" src={`${assetRoot}/lighting/${light}.png`} alt="" />
      <div className="overworld-night-sky">
        <i className="overworld-comet comet-one" />
        <i className="overworld-comet comet-two" />
      </div>
      <img className="overworld-layer overworld-weather" src={`${assetRoot}/weather/${weatherAppearance}.svg`} alt="" />
      {landAnimals[displaySeason].map((species, index) => <div key={species} className={`overworld-animal ${species} land-slot-${index + 1}`} />)}
      <div className="overworld-animal axolotl" />
      <img className="overworld-layer overworld-foreground" src={`${assetRoot}/terrain/foreground.png`} alt="" />
    </div>
    {header && createPortal(headerTools, header)}
  </section>;
}
