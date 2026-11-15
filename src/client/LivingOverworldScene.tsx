import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { OverworldWeatherAppearance, OverworldWeatherResponse } from '../shared/types';

export type LivingSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type LivingLight = 'morning' | 'day' | 'evening' | 'night';
type Override<T extends string> = T | 'auto';
export type MoonPhase = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';
type MoonOverride = MoonPhase | 'auto';

const assetRoot = '/assets/living-overworld';
const motionStorageKey = 'sensei-living-overworld-motion';
const seasons: LivingSeason[] = ['spring', 'summer', 'autumn', 'winter'];
const lightPeriods: LivingLight[] = ['morning', 'day', 'evening', 'night'];
const weatherAppearances: OverworldWeatherAppearance[] = ['clear', 'partly-cloudy', 'cloudy', 'rain', 'snow', 'fog'];
const moonPhases: MoonPhase[] = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
const newMoonEpoch = Date.parse('2000-01-06T18:14:00Z');
const synodicMonthDays = 29.530588853;

interface LivingSeasonBlend { primary: LivingSeason; adjacent: LivingSeason | null; adjacentOpacity: number }
export interface LivingSeasonArtwork { mobile: string; desktop: string }
export interface LivingCelestialTrack { body: 'sun' | 'moon'; progress: number; topPercent: number }
type AtmosphereStyle = CSSProperties & Record<`--${string}`, string>;

const celestialHorizonPercent = 72;
const celestialApexPercent = -10;
const celestialPreviewLowPercent = 68;
const celestialPreviewHighPercent = 10;
const illustratedHorizonPercent = 55;
const twilightBlendMinutes = 20;

const autumnArtwork: LivingSeasonArtwork = {
  mobile: `${assetRoot}/seasons/autumn/mobile.png`,
  desktop: `${assetRoot}/seasons/autumn/desktop.png`
};
const winterArtwork: LivingSeasonArtwork = {
  mobile: `${assetRoot}/seasons/winter/mobile.png`,
  desktop: `${assetRoot}/seasons/winter/desktop.png`
};

/** Spring and summer intentionally retain the approved autumn fallback until their own artwork milestone. */
export const livingSeasonIllustrations: Record<LivingSeason, LivingSeasonArtwork> = {
  spring: autumnArtwork,
  summer: autumnArtwork,
  autumn: autumnArtwork,
  winter: winterArtwork
};

function SeasonArtwork({ artwork, adjacentOpacity }: { artwork: LivingSeasonArtwork; adjacentOpacity?: number }) {
  return <picture className={`living-overworld-background${adjacentOpacity === undefined ? '' : ' adjacent-season-background'}`} style={adjacentOpacity === undefined ? undefined : { opacity: adjacentOpacity }}>
    <source media="(max-width: 700px)" srcSet={artwork.mobile} />
    <img src={artwork.desktop} alt="" />
  </picture>;
}

function pacificParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return values as { year: number; month: number; day: number; hour: number; minute: number };
}

export function livingSeasonFor(date: Date): LivingSeason {
  const month = pacificParts(date).month;
  return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
}

export function livingSeasonBlendFor(date: Date): LivingSeasonBlend {
  const parts = pacificParts(date);
  const dayValue = Date.UTC(parts.year, parts.month - 1, parts.day);
  const oneDay = 86_400_000;
  const boundaries: Array<{ month: number; day: number; from: LivingSeason; to: LivingSeason }> = [
    { month: 3, day: 1, from: 'winter', to: 'spring' }, { month: 6, day: 1, from: 'spring', to: 'summer' },
    { month: 9, day: 1, from: 'summer', to: 'autumn' }, { month: 12, day: 1, from: 'autumn', to: 'winter' }
  ];
  for (const boundary of boundaries) {
    const center = Date.UTC(parts.year, boundary.month - 1, boundary.day);
    const start = center - 7 * oneDay;
    const end = center + 7 * oneDay;
    if (dayValue >= start && dayValue <= end) return { primary: boundary.from, adjacent: boundary.to, adjacentOpacity: (dayValue - start) / (end - start) };
  }
  return { primary: livingSeasonFor(date), adjacent: null, adjacentOpacity: 0 };
}

function clockMinutes(value: string | null): number | null {
  const match = value?.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function livingLightFor(date: Date, sunrise: string | null, sunset: string | null): LivingLight {
  const parts = pacificParts(date);
  const current = parts.hour * 60 + parts.minute;
  const rise = clockMinutes(sunrise);
  const set = clockMinutes(sunset);
  if (rise !== null && set !== null) {
    const daylightMinutes = set - rise;
    const horizonRatio = (celestialHorizonPercent - illustratedHorizonPercent) / (celestialHorizonPercent - celestialApexPercent);
    const horizonProgress = Math.asin(horizonRatio) / Math.PI;
    const morningEnd = rise + horizonProgress * daylightMinutes + twilightBlendMinutes;
    const eveningStart = set - horizonProgress * daylightMinutes - twilightBlendMinutes;
    if (current >= rise - 60 && current < morningEnd) return 'morning';
    if (current >= morningEnd && current < eveningStart) return 'day';
    if (current >= eveningStart && current < set + 60) return 'evening';
    return 'night';
  }
  if (parts.hour >= 5 && parts.hour < 9) return 'morning';
  if (parts.hour >= 9 && parts.hour < 17) return 'day';
  if (parts.hour >= 17 && parts.hour < 21) return 'evening';
  return 'night';
}

export function livingCelestialTrackFor(date: Date, sunrise: string | null, sunset: string | null): LivingCelestialTrack {
  const parts = pacificParts(date);
  const current = parts.hour * 60 + parts.minute;
  const rise = clockMinutes(sunrise) ?? 6 * 60;
  const set = clockMinutes(sunset) ?? 20 * 60;
  const isDaylight = current >= rise && current < set;
  const duration = isDaylight ? set - rise : (24 * 60 - set) + rise;
  const elapsed = isDaylight ? current - rise : current >= set ? current - set : (24 * 60 - set) + current;
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  const topPercent = celestialHorizonPercent - (celestialHorizonPercent - celestialApexPercent) * Math.sin(Math.PI * progress);
  return { body: isDaylight ? 'sun' : 'moon', progress, topPercent };
}

export function livingCelestialTopForPreviewHeight(height: number): number {
  const normalized = Math.max(0, Math.min(100, height)) / 100;
  return celestialPreviewLowPercent - (celestialPreviewLowPercent - celestialPreviewHighPercent) * normalized;
}

function livingCelestialHeightForTop(topPercent: number): number {
  return Math.max(0, Math.min(100, (celestialHorizonPercent - topPercent) / (celestialHorizonPercent - celestialApexPercent) * 100));
}

function celestialHeightLabel(height: number): string {
  return height < 34 ? 'Low' : height < 67 ? 'Mid' : 'High';
}

export function livingWeatherFor(override: Override<OverworldWeatherAppearance>, weather: OverworldWeatherResponse | null): OverworldWeatherAppearance {
  return override === 'auto' ? weather?.appearance ?? 'clear' : override;
}

async function loadWeather(): Promise<OverworldWeatherResponse> {
  const response = await fetch('/api/overworld/weather');
  if (!response.ok) throw new Error('Weather unavailable');
  return response.json() as Promise<OverworldWeatherResponse>;
}

function storedMotionPreference(): boolean {
  try { return localStorage.getItem(motionStorageKey) !== 'off'; } catch { return true; }
}

export function moonPhaseFor(date: Date): MoonPhase {
  const elapsedDays = (date.getTime() - newMoonEpoch) / 86_400_000;
  const cycle = ((elapsedDays % synodicMonthDays) + synodicMonthDays) % synodicMonthDays;
  return moonPhases[Math.floor((cycle / synodicMonthDays) * 8 + .5) % 8];
}

function title(value: string): string {
  return value.replace(/(^|-)(\w)/g, (_match, dash: string, letter: string) => `${dash ? ' ' : ''}${letter.toUpperCase()}`);
}

function atmosphereStyle(index: number, count: number, kind: 'star' | 'rain-far' | 'rain-near' | 'snow-far' | 'snow-near'): AtmosphereStyle {
  const offset = (index * 47 + (index % 7) * 19) % 101;
  if (kind === 'star') return {
    left: `${4 + ((index * 37) % 92)}%`, top: `${3 + ((index * 53) % 73)}%`,
    '--size': `${index % 13 === 0 ? 4 : index % 5 === 0 ? 2.5 : 1.5}px`,
    '--glow': `${index % 13 === 0 ? 11 : index % 5 === 0 ? 6 : 3}px`,
    '--alpha': `${.54 + (index % 6) * .075}`
  };
  if (kind.startsWith('rain')) {
    const near = kind === 'rain-near';
    const duration = near ? 1.12 + (index % 7) * .08 : 1.48 + (index % 9) * .1;
    return {
      left: `${(index * 83 + offset) % 103}%`, top: '-12%',
      '--length': `${near ? 11 + (index % 5) * 3 : 6 + (index % 4) * 2}px`,
      '--duration': `${duration}s`, '--delay': `${-(index / count) * duration}s`, '--drift': `${(index % 5) - 2}px`,
      '--alpha': `${near ? .43 + (index % 4) * .08 : .22 + (index % 4) * .06}`
    };
  }
  const near = kind === 'snow-near';
  const duration = near ? 25 + (index % 8) * 2 : 34 + (index % 9) * 2.2;
  return {
    left: `${(index * 71 + offset) % 102}%`, top: '-14%',
    '--size': `${near ? 3.8 + (index % 4) * 1.25 : 2 + (index % 3) * .9}px`,
    '--duration': `${duration}s`, '--delay': `${-(index / count) * duration}s`, '--drift': `${-14 + (index % 7) * 5}px`,
    '--alpha': `${near ? .62 + (index % 4) * .08 : .38 + (index % 4) * .07}`
  };
}

function AtmosphereParticles({ kind, count }: { kind: 'star' | 'rain-far' | 'rain-near' | 'snow-far' | 'snow-near'; count: number }) {
  return <>{Array.from({ length: count }, (_unused, index) => <i key={index} style={atmosphereStyle(index, count, kind)} />)}</>;
}

export function LivingOverworldScene() {
  const [seasonOverride, setSeasonOverride] = useState<Override<LivingSeason>>('auto');
  const [lightOverride, setLightOverride] = useState<Override<LivingLight>>('auto');
  const [weatherOverride, setWeatherOverride] = useState<Override<OverworldWeatherAppearance>>('auto');
  const [moonOverride, setMoonOverride] = useState<MoonOverride>('auto');
  const [celestialHeightOverride, setCelestialHeightOverride] = useState<number | null>(null);
  const [weather, setWeather] = useState<OverworldWeatherResponse | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [motionEnabled, setMotionEnabled] = useState(storedMotionPreference);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [pageVisible, setPageVisible] = useState(!document.hidden);

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReducedMotion(query.matches);
    const onVisibility = () => setPageVisible(!document.hidden);
    query.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { query.removeEventListener('change', onMotion); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => void loadWeather().then((result) => { if (active) setWeather(result); }).catch(() => undefined);
    refresh();
    const weatherTimer = window.setInterval(refresh, 30 * 60 * 1000);
    const clockTimer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => { active = false; window.clearInterval(weatherTimer); window.clearInterval(clockTimer); };
  }, []);

  const moving = motionEnabled && !reducedMotion && pageVisible;
  const blend = useMemo<LivingSeasonBlend>(() => seasonOverride === 'auto' ? livingSeasonBlendFor(now) : { primary: seasonOverride, adjacent: null, adjacentOpacity: 0 }, [now, seasonOverride]);
  const season = blend.adjacent && blend.adjacentOpacity >= .5 ? blend.adjacent : blend.primary;
  const light = lightOverride === 'auto' ? livingLightFor(now, weather?.sunrise ?? null, weather?.sunset ?? null) : lightOverride;
  const weatherAppearance = livingWeatherFor(weatherOverride, weather);
  const moonPhase = moonOverride === 'auto' ? moonPhaseFor(now) : moonOverride;
  const celestialTrack = livingCelestialTrackFor(now, weather?.sunrise ?? null, weather?.sunset ?? null);
  const automaticCelestialTop = lightOverride === 'auto' ? celestialTrack.topPercent
    : lightOverride === 'day' || lightOverride === 'night' ? celestialApexPercent
      : illustratedHorizonPercent;
  const automaticCelestialHeight = livingCelestialHeightForTop(automaticCelestialTop);
  const celestialTop = celestialHeightOverride === null ? automaticCelestialTop : livingCelestialTopForPreviewHeight(celestialHeightOverride);
  const primaryIllustration = livingSeasonIllustrations[blend.primary];
  const adjacentIllustration = blend.adjacent ? livingSeasonIllustrations[blend.adjacent] : null;

  function toggleMotion() {
    const next = !motionEnabled;
    setMotionEnabled(next);
    try { localStorage.setItem(motionStorageKey, next ? 'on' : 'off'); } catch { /* Session state still works. */ }
  }

  const toolbar = <div className="living-overworld-toolbar">
    <div className="living-overworld-status" aria-live="polite">
      <strong>{title(season)} · {title(light)}</strong>
      <span>{title(weatherAppearance)}{weather?.temperatureC !== null && weather?.temperatureC !== undefined
        ? ` · ${Math.round(weather.temperatureC)}°C · ${Math.round(weather.temperatureC * 9 / 5 + 32)}°F` : ''}</span>
      {weather?.stale && <em>{weather.source === 'cache' ? 'Last known weather' : 'Neutral weather fallback'}</em>}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather by Open-Meteo</a>
    </div>
    <button className="living-overworld-motion-control" type="button" aria-pressed={!motionEnabled} onClick={toggleMotion}>{motionEnabled ? 'Pause motion' : 'Resume motion'}</button>
    <details className="living-overworld-proof-controls"><summary>Scene controls</summary><div>
      <label>Season<select aria-label="Living Overworld season" value={seasonOverride} onChange={(event) => setSeasonOverride(event.target.value as Override<LivingSeason>)}><option value="auto">Auto</option>{seasons.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>
      <label>Light<select aria-label="Living Overworld light proof" value={lightOverride} onChange={(event) => setLightOverride(event.target.value as Override<LivingLight>)}><option value="auto">Auto</option>{lightPeriods.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>
      <label>Weather<select aria-label="Living Overworld weather proof" value={weatherOverride} onChange={(event) => setWeatherOverride(event.target.value as Override<OverworldWeatherAppearance>)}><option value="auto">Auto</option>{weatherAppearances.map((value) => <option key={value} value={value}>{title(value)}</option>)}</select></label>
      <label>Moon<select aria-label="Living Overworld moon phase" value={moonOverride} onChange={(event) => setMoonOverride(event.target.value as MoonOverride)}><option value="auto">Auto</option>{moonPhases.map((phase) => <option key={phase} value={phase}>{title(phase)}</option>)}</select></label>
      <div className="living-overworld-celestial-control" role="group" aria-label="Celestial height control">
        <span>Celestial height <output>{celestialHeightOverride === null ? `Auto · ${celestialHeightLabel(automaticCelestialHeight)}` : celestialHeightLabel(celestialHeightOverride)}</output></span>
        <input aria-label="Living Overworld celestial height" type="range" min="0" max="100" step="1"
          value={celestialHeightOverride ?? Math.round(automaticCelestialHeight)}
          aria-valuetext={celestialHeightOverride === null ? `Automatic, ${celestialHeightLabel(automaticCelestialHeight)}` : `${celestialHeightLabel(celestialHeightOverride)}, ${celestialHeightOverride} percent high`}
          onChange={(event) => setCelestialHeightOverride(Number(event.target.value))} />
        <button type="button" aria-label="Use automatic celestial height" aria-pressed={celestialHeightOverride === null}
          onClick={() => setCelestialHeightOverride(null)}>Auto</button>
      </div>
    </div></details>
  </div>;

  return <><section className={`living-overworld-banner season-${season} light-${light} weather-${weatherAppearance} moon-${moonPhase} ${moving ? 'motion-on' : 'motion-off'} ${celestialHeightOverride === null ? 'celestial-auto' : 'celestial-preview'}`} aria-label={`Living Overworld ${season} retreat scene during ${light} with ${weatherAppearance} weather`}>
    <div className="living-overworld-scene" aria-hidden="true">
      <div className="living-overworld-sky" /><div className="living-overworld-stars"><AtmosphereParticles kind="star" count={104} /></div>
      <div className="living-overworld-sky-events"><i className="living-overworld-comet" /><i className="living-overworld-meteor" /></div>
      <div className="living-overworld-sun" style={{ top: `${celestialTop}%` }} />
      <div className={`living-overworld-moon phase-${moonPhase}`} style={{ top: `${celestialTop}%` }}><img src={`${assetRoot}/moon-detailed.png`} alt="" /></div>
      {['a', 'b', 'c', 'd', 'e', 'f'].map((cloud) => <div key={cloud} className={`living-overworld-cloud cloud-${cloud}`}><i /><i /><i /></div>)}
      <div className="living-overworld-storm-canopy"><i /><i /><i /><i /></div>
      <SeasonArtwork artwork={primaryIllustration} />
      {adjacentIllustration && adjacentIllustration !== primaryIllustration && <SeasonArtwork artwork={adjacentIllustration} adjacentOpacity={blend.adjacentOpacity} />}
      <div className="living-overworld-rain rain-far"><AtmosphereParticles kind="rain-far" count={86} /></div>
      <div className="living-overworld-rain rain-near"><AtmosphereParticles kind="rain-near" count={52} /></div>
      <div className="living-overworld-snow snow-far"><AtmosphereParticles kind="snow-far" count={88} /></div>
      <div className="living-overworld-snow snow-near"><AtmosphereParticles kind="snow-near" count={54} /></div>
      <div className="living-overworld-fog"><i /><i /><i /><i /><i /></div><div className="living-overworld-daylight" />
    </div>
  </section>{toolbar}</>;
}
