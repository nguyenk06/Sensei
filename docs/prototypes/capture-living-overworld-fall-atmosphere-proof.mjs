import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pageUrl = pathToFileURL(path.resolve('docs/prototypes/living-overworld-fall-atmosphere-proof.html')).href;
const out = path.resolve('docs/assets/living-overworld-fall-proof');
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(pageUrl, { waitUntil: 'load' });
await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
await page.screenshot({ path: path.join(out, 'fall-atmosphere-review-sheet-sun-adjusted.png'), fullPage: true });
for (const [id, file] of [
  ['lighting-treatments', 'fall-lighting-treatments-sun-adjusted.png'],
  ['weather-examples', 'fall-weather-examples-sun-adjusted.png'],
  ['dynamic-cloud-reference', 'fall-dynamic-cloud-reference-sun-adjusted.png']
]) await page.locator(`#${id}`).screenshot({ path: path.join(out, file) });
const reducedAnimation = await page.locator('.cloud.a').first().evaluate((element) => getComputedStyle(element).animationName);
if (reducedAnimation !== 'none') throw new Error(`Reduced motion did not stop cloud animation: ${reducedAnimation}`);
await page.emulateMedia({ reducedMotion: 'no-preference' });
const activeAnimation = await page.locator('.cloud.a').first().evaluate((element) => getComputedStyle(element).animationName);
if (activeAnimation === 'none') throw new Error('Cloud animation is not active when motion is allowed.');
if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);
await browser.close();
