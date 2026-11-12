import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1676, height: 593 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(pathToFileURL(path.resolve('docs/prototypes/living-overworld-waterfall-assembly.html')).href, { waitUntil: 'load' });
const state = await page.evaluate(() => ({
  outcrops: document.querySelectorAll('.outcrop').length,
  waterfalls: document.querySelectorAll('.water').length,
  brokenAssets: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
}));
if (state.outcrops !== 2 || state.waterfalls !== 1 || state.brokenAssets || state.overflow || errors.length) {
  throw new Error(`assembly validation failed: ${JSON.stringify({ state, errors })}`);
}
await page.screenshot({ path: path.resolve('docs/assets/screenshots/living-overworld-waterfall-isolated-assembly.png') });
console.log('isolated assembly: two outcrops, one complete waterfall, no clipping, all assets loaded');
await browser.close();
