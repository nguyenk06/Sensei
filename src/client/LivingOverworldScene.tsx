import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OverworldWeatherResponse } from '../shared/types';

type ProofWeather = 'clear' | 'rain';
export type LivingSeason = 'spring' | 'summer' | 'autumn' | 'winter';
export type LivingLight = 'morning' | 'day' | 'evening' | 'night';
type Override<T extends string> = T | 'auto';
export type MoonPhase = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';
type MoonOverride = MoonPhase | 'auto';

const assetRoot = '/assets/living-overworld';
const motionStorageKey = 'sensei-living-overworld-motion';
const seasons: LivingSeason[] = ['spring', 'summer', 'autumn', 'winter'];
const lightPeriods: LivingLight[] = ['morning', 'day', 'evening', 'night'];
const moonPhases: MoonPhase[] = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
const newMoonEpoch = Date.parse('2000-01-06T18:14:00Z');
const synodicMonthDays = 29.530588853;

type SceneAssets = readonly [mountains: string, terrain: string, water: string, retreat: string, vegetation: string];
const summerAssets: SceneAssets = [`${assetRoot}/distant-mountains-v2.png`, `${assetRoot}/terrain.png`, `${assetRoot}/water.png`, `${assetRoot}/retreat.png`, `${assetRoot}/foreground-vegetation.png`];

export const livingOverworldAssets: Record<LivingSeason, SceneAssets> = {
  spring: [summerAssets[0], `${assetRoot}/seasons/spring/terrain.png`, summerAssets[2], summerAssets[3], `${assetRoot}/seasons/spring/foreground-vegetation.png`],
  summer: summerAssets,
  autumn: [summerAssets[0], `${assetRoot}/seasons/autumn/terrain.png`, summerAssets[2], summerAssets[3], `${assetRoot}/seasons/autumn/foreground-vegetation.png`],
  winter: [`${assetRoot}/seasons/winter/distant-mountains.png`, `${assetRoot}/seasons/winter/terrain.png`, `${assetRoot}/seasons/winter/water.png`, `${assetRoot}/seasons/winter/retreat.png`, `${assetRoot}/seasons/winter/foreground-vegetation.png`]
};

function pacificParts(date: Date): { month: number; hour: number; minute: number } {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', month: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return values as { month: number; hour: number; minute: number };
}

export function livingSeasonFor(date: Date): LivingSeason {
  const month = pacificParts(date).month;
  return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
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

async function loadSunTimes(): Promise<OverworldWeatherResponse> {
  const response = await fetch('/api/overworld/weather');
  if (!response.ok) throw new Error('Sun times unavailable');
  return response.json() as Promise<OverworldWeatherResponse>;
}

function storedMotionPreference(): boolean {
  try {
    return localStorage.getItem(motionStorageKey) !== 'off';
  } catch {
    return true;
  }
}

export function moonPhaseFor(date: Date): MoonPhase {
  const elapsedDays = (date.getTime() - newMoonEpoch) / 86_400_000;
  const cycle = ((elapsedDays % synodicMonthDays) + synodicMonthDays) % synodicMonthDays;
  return moonPhases[Math.floor((cycle / synodicMonthDays) * 8 + .5) % 8];
}

function title(value: string): string {
  return value.replace(/(^|-)(\w)/g, (_match, dash: string, letter: string) => `${dash ? ' ' : ''}${letter.toUpperCase()}`);
}

export function LivingOverworldScene() {
  const [weather, setWeather] = useState<ProofWeather>('clear');
  const [seasonOverride, setSeasonOverride] = useState<Override<LivingSeason>>('auto');
  const [lightOverride, setLightOverride] = useState<Override<LivingLight>>('auto');
  const [moonOverride, setMoonOverride] = useState<MoonOverride>('auto');
  const [sunTimes, setSunTimes] = useState<OverworldWeatherResponse | null>(null);
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
    return () => {
      query.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => void loadSunTimes().then((result) => { if (active) setSunTimes(result); }).catch(() => undefined);
    refresh();
    const weatherTimer = window.setInterval(refresh, 30 * 60 * 1000);
    const clockTimer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => { active = false; window.clearInterval(weatherTimer); window.clearInterval(clockTimer); };
  }, []);

  const moving = motionEnabled && !reducedMotion && pageVisible;
  const season = seasonOverride === 'auto' ? livingSeasonFor(now) : seasonOverride;
  const light = lightOverride === 'auto' ? livingLightFor(now, sunTimes?.sunrise ?? null, sunTimes?.sunset ?? null) : lightOverride;
  const moonPhase = moonOverride === 'auto' ? moonPhaseFor(now) : moonOverride;
  const sceneAssets = livingOverworldAssets[season];

  function toggleMotion() {
    const next = !motionEnabled;
    setMotionEnabled(next);
    try {
      localStorage.setItem(motionStorageKey, next ? 'on' : 'off');
    } catch {
      // The preference still applies for this page when storage is unavailable.
    }
  }

  const header = document.querySelector<HTMLElement>('.topbar');
  const headerTools = <div className="living-overworld-header-tools">
    <span className="living-overworld-status">{title(season)} · {title(light)}</span>
    <details className="living-overworld-proof-controls">
      <summary>Scene proof</summary>
      <div>
        <label>Season
          <select aria-label="Living Overworld season" value={seasonOverride}
            onChange={(event) => setSeasonOverride(event.target.value as Override<LivingSeason>)}>
            <option value="auto">Auto</option>
            {seasons.map((value) => <option key={value} value={value}>{title(value)}</option>)}
          </select>
        </label>
        <label>Light
          <select aria-label="Living Overworld light proof" value={lightOverride}
            onChange={(event) => setLightOverride(event.target.value as Override<LivingLight>)}>
            <option value="auto">Auto</option>
            {lightPeriods.map((value) => <option key={value} value={value}>{title(value)}</option>)}
          </select>
        </label>
        <label>Weather
          <select aria-label="Living Overworld weather proof" value={weather}
            onChange={(event) => setWeather(event.target.value as ProofWeather)}>
            <option value="clear">Clear</option>
            <option value="rain">Rain</option>
          </select>
        </label>
        <label>Moon
          <select aria-label="Living Overworld moon phase" value={moonOverride}
            onChange={(event) => setMoonOverride(event.target.value as MoonOverride)}>
            <option value="auto">Auto</option>
            {moonPhases.map((phase) => <option key={phase} value={phase}>{title(phase)}</option>)}
          </select>
        </label>
        <button type="button" aria-pressed={!motionEnabled} onClick={toggleMotion}>
          {motionEnabled ? 'Pause motion' : 'Resume motion'}
        </button>
      </div>
    </details>
  </div>;

  return <section className={`living-overworld-banner season-${season} light-${light} weather-${weather} moon-${moonPhase} ${moving ? 'motion-on' : 'motion-off'}`}
    aria-label={`Living Overworld ${season} retreat scene during ${light}`}>
    <div className="living-overworld-scene" aria-hidden="true">
      <div className="living-overworld-sky" />
      <div className="living-overworld-sun" />
      <div className={`living-overworld-moon phase-${moonPhase}`}><i /><i /><i /></div>
      <div className="living-overworld-cloud cloud-a"><i /><i /><i /></div>
      <div className="living-overworld-cloud cloud-b"><i /><i /><i /></div>
      <div className="living-overworld-world">
        <img className="living-overworld-layer layer-mountains" src={sceneAssets[0]} alt="" />
        <img className="living-overworld-layer layer-terrain" src={sceneAssets[1]} alt="" />
        <img className="living-overworld-layer layer-water" src={sceneAssets[2]} alt="" />
        <img className="living-overworld-layer layer-retreat" src={sceneAssets[3]} alt="" />
        <div className="living-overworld-window-glow" />
        <div className="living-overworld-smoke"><i /><i /><i /></div>
        <img className="living-overworld-layer layer-vegetation" src={sceneAssets[4]} alt="" />
      </div>
      <div className="living-overworld-rain rain-far" />
      <div className="living-overworld-rain rain-near" />
      <div className="living-overworld-daylight" />
    </div>
    {header && createPortal(headerTools, header)}
  </section>;
}
