import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ProofWeather = 'clear' | 'rain';
type ProofLight = 'day' | 'night';
export type MoonPhase = 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';
type MoonOverride = MoonPhase | 'auto';

const assetRoot = '/assets/living-overworld';
const motionStorageKey = 'sensei-living-overworld-motion';
const moonPhases: MoonPhase[] = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
const newMoonEpoch = Date.parse('2000-01-06T18:14:00Z');
const synodicMonthDays = 29.530588853;

export const livingOverworldAssets = [
  `${assetRoot}/distant-mountains-v2.png`,
  `${assetRoot}/terrain.png`,
  `${assetRoot}/water.png`,
  `${assetRoot}/retreat.png`,
  `${assetRoot}/foreground-vegetation.png`
] as const;

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
  const [light, setLight] = useState<ProofLight>('day');
  const [moonOverride, setMoonOverride] = useState<MoonOverride>('auto');
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

  const moving = motionEnabled && !reducedMotion && pageVisible;
  const moonPhase = moonOverride === 'auto' ? moonPhaseFor(new Date()) : moonOverride;

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
    <span className="living-overworld-status">Summer · {title(light)}</span>
    <details className="living-overworld-proof-controls">
      <summary>Scene proof</summary>
      <div>
        <label>Light
          <select aria-label="Living Overworld light proof" value={light}
            onChange={(event) => setLight(event.target.value as ProofLight)}>
            <option value="day">Day</option>
            <option value="night">Night</option>
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

  return <section className={`living-overworld-banner light-${light} weather-${weather} moon-${moonPhase} ${moving ? 'motion-on' : 'motion-off'}`}
    aria-label="Living Overworld summer retreat scene">
    <div className="living-overworld-scene" aria-hidden="true">
      <div className="living-overworld-sky" />
      <div className="living-overworld-sun" />
      <div className={`living-overworld-moon phase-${moonPhase}`}><i /><i /><i /></div>
      <div className="living-overworld-cloud cloud-a"><i /><i /><i /></div>
      <div className="living-overworld-cloud cloud-b"><i /><i /><i /></div>
      <div className="living-overworld-world">
        <img className="living-overworld-layer layer-mountains" src={livingOverworldAssets[0]} alt="" />
        <img className="living-overworld-layer layer-terrain" src={livingOverworldAssets[1]} alt="" />
        <img className="living-overworld-layer layer-water" src={livingOverworldAssets[2]} alt="" />
        <img className="living-overworld-layer layer-retreat" src={livingOverworldAssets[3]} alt="" />
        <div className="living-overworld-window-glow" />
        <div className="living-overworld-smoke"><i /><i /><i /></div>
        <img className="living-overworld-layer layer-vegetation" src={livingOverworldAssets[4]} alt="" />
      </div>
      <div className="living-overworld-rain rain-far" />
      <div className="living-overworld-rain rain-near" />
      <div className="living-overworld-daylight" />
    </div>
    {header && createPortal(headerTools, header)}
  </section>;
}
