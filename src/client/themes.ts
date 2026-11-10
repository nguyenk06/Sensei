export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  tokens: Record<string, string>;
}

export const themes: ThemeDefinition[] = [
  {
    id: 'novapay',
    name: 'NovaPay',
    description: 'Deep slate, sky accents, crisp financial dashboard surfaces.',
    tokens: {
      '--page': '#07151c',
      '--page-soft': '#0b202a',
      '--surface': '#102b37',
      '--surface-raised': '#163743',
      '--surface-subtle': '#0d252f',
      '--ink': '#f2f7f8',
      '--muted': '#98adb5',
      '--brand': '#57b9e8',
      '--brand-strong': '#2598d0',
      '--accent': '#b8f36a',
      '--accent-soft': '#243d35',
      '--border': '#284651',
      '--danger': '#ff8b7b',
      '--warning-surface': '#2d3026',
      '--warning-ink': '#e4f3b8',
      '--shadow': 'rgba(0, 0, 0, .28)',
      '--grid-line': 'rgba(87, 185, 232, .055)',
      '--font-body': '"Segoe UI", system-ui, sans-serif',
      '--font-display': 'Georgia, serif',
      '--radius-card': '5px',
      '--radius-control': '5px',
      '--radius-pill': '999px',
      '--radius-mark': '12px',
      '--shadow-card': '0 18px 55px var(--shadow)',
      '--heading-shadow': 'none',
      '--grid-size': '38px'
    }
  },
  {
    id: 'classic',
    name: 'Sensei Classic',
    description: 'Warm paper, evergreen ink, and calm clay accents.',
    tokens: {
      '--page': '#f4f0e7',
      '--page-soft': '#f8f5ed',
      '--surface': '#fffdf8',
      '--surface-raised': '#ffffff',
      '--surface-subtle': '#f3f1e9',
      '--ink': '#17322e',
      '--muted': '#6c7974',
      '--brand': '#1f5c4e',
      '--brand-strong': '#173f37',
      '--accent': '#c27342',
      '--accent-soft': '#f5e9d7',
      '--border': '#d8d9d2',
      '--danger': '#9b3d2d',
      '--warning-surface': '#f5e9d7',
      '--warning-ink': '#695c4d',
      '--shadow': 'rgba(35, 52, 47, .12)',
      '--grid-line': 'rgba(23, 63, 55, .035)',
      '--font-body': '"Segoe UI", system-ui, sans-serif',
      '--font-display': 'Georgia, serif',
      '--radius-card': '1px',
      '--radius-control': '2px',
      '--radius-pill': '2px',
      '--radius-mark': '2px',
      '--shadow-card': '7px 9px 0 var(--shadow)',
      '--heading-shadow': 'none',
      '--grid-size': '38px'
    }
  },
  {
    id: 'minecraft',
    name: 'Overworld Adventure',
    description: 'A cheerful block-world landscape with grass, oak, stone, and emerald details.',
    tokens: {
      '--page': '#eef6df',
      '--page-soft': '#f8f4dc',
      '--surface': '#fffdf3',
      '--surface-raised': '#aab3b6',
      '--surface-subtle': '#e1edd3',
      '--ink': '#213329',
      '--muted': '#56695d',
      '--brand': '#61a43c',
      '--brand-strong': '#3f7627',
      '--accent': '#15966a',
      '--accent-soft': '#d8edc4',
      '--border': '#6f5638',
      '--danger': '#a33b2f',
      '--warning-surface': '#f4dfae',
      '--warning-ink': '#594629',
      '--shadow': 'rgba(48, 58, 39, .28)',
      '--grid-line': 'rgba(83, 133, 55, .08)',
      '--font-body': '"Trebuchet MS", "Segoe UI", sans-serif',
      '--font-display': '"Arial Black", "Trebuchet MS", sans-serif',
      '--radius-card': '2px',
      '--radius-control': '2px',
      '--radius-pill': '2px',
      '--radius-mark': '2px',
      '--shadow-card': '5px 5px 0 var(--shadow)',
      '--heading-shadow': '2px 2px 0 rgba(255, 255, 255, .72)',
      '--grid-size': '24px'
    }
  },
  {
    id: 'living-overworld',
    name: 'Living Overworld',
    description: 'A quiet layered block-world retreat with independently animated scenery.',
    tokens: {
      '--page': '#e9f2dc',
      '--page-soft': '#f5f1dc',
      '--surface': '#fffdf2',
      '--surface-raised': '#d8e2cf',
      '--surface-subtle': '#e4ecd6',
      '--ink': '#203229',
      '--muted': '#5a6b60',
      '--brand': '#538e3b',
      '--brand-strong': '#315f2b',
      '--accent': '#168c70',
      '--accent-soft': '#d5ead5',
      '--border': '#6c583d',
      '--danger': '#a33b2f',
      '--warning-surface': '#f4dfae',
      '--warning-ink': '#594629',
      '--shadow': 'rgba(44, 58, 38, .25)',
      '--grid-line': 'rgba(76, 124, 56, .065)',
      '--font-body': '"Trebuchet MS", "Segoe UI", sans-serif',
      '--font-display': '"Arial Black", "Trebuchet MS", sans-serif',
      '--radius-card': '3px',
      '--radius-control': '3px',
      '--radius-pill': '3px',
      '--radius-mark': '3px',
      '--shadow-card': '5px 6px 0 var(--shadow)',
      '--heading-shadow': '2px 2px 0 rgba(255, 255, 255, .68)',
      '--grid-size': '24px'
    }
  }
];

export function applyTheme(themeId: string): ThemeDefinition {
  const theme = themes.find((item) => item.id === themeId) ?? themes[0];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  for (const [name, value] of Object.entries(theme.tokens)) root.style.setProperty(name, value);
  return theme;
}

const deviceThemeStorageKey = 'sensei-device-theme';

export function getDeviceThemeId(): string {
  try {
    const stored = window.localStorage.getItem(deviceThemeStorageKey);
    return themes.some((theme) => theme.id === stored) ? stored! : themes[0].id;
  } catch {
    return themes[0].id;
  }
}

export function saveDeviceTheme(themeId: string): ThemeDefinition {
  const theme = applyTheme(themeId);
  try {
    window.localStorage.setItem(deviceThemeStorageKey, theme.id);
  } catch {
    // The theme still applies for this page when storage is unavailable.
  }
  return theme;
}
