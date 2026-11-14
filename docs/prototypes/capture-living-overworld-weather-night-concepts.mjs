import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pageUrl = pathToFileURL(path.resolve('docs/prototypes/living-overworld-weather-night-concepts.html')).href;
const out = path.resolve('docs/assets/living-overworld-atmosphere-concepts');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1050 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(pageUrl, { waitUntil: 'load' });
await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
await page.screenshot({ path: path.join(out, 'atmosphere-concept-review-sheet.png'), fullPage: true });
for (const [id, file] of [['cloud-density', 'cloud-density-options.png'], ['weather-treatments', 'weather-treatment-options.png'], ['night-sky', 'night-sky-options.png']]) {
  await page.locator(`#${id}`).screenshot({ path: path.join(out, file) });
}
if (await page.locator('.partial .cloud').count() !== 2 || await page.locator('.cloudy .cloud').count() !== 6) throw new Error('Cloud density proof is incorrect.');
if (await page.locator('.rain-subtle .drop').count() !== 54 || await page.locator('.rain-visible .drop').count() !== 34) throw new Error('Rain droplet proof is incorrect.');
if (await page.locator('.snow .flake').count() !== 46) throw new Error('Soft snow proof is incomplete.');
if (await page.locator('.fog-cloud').count() !== 3) throw new Error('Ground fog proof is incomplete.');
if (await page.locator('.night .star').count() < 100) throw new Error('Night star proof is incomplete.');
if (await page.locator('.comet').count() !== 1 || await page.locator('.meteor').count() !== 1) throw new Error('Rare-event proof is incomplete.');
const rotation = await page.locator('.night .starfield').first().evaluate((element) => getComputedStyle(element).animationName);
if (rotation !== 'star-turn') throw new Error(`Star rotation is inactive: ${rotation}`);
if (errors.length) throw new Error(`Console errors: ${errors.join(' | ')}`);
await browser.close();
