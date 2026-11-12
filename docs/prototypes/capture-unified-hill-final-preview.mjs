import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1320, height: 1400 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(pathToFileURL(path.resolve('docs/prototypes/living-overworld-hill-final-preview.html')).href, { waitUntil: 'load' });

const state = await page.evaluate(() => ({
  images: [...document.images].map((image) => ({ src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight, loaded: image.complete && image.naturalWidth > 0 })),
  marker: (() => {
    const stage = document.querySelector('#annotated-preview').getBoundingClientRect();
    const marker = document.querySelector('#annotated-preview .marker').getBoundingClientRect();
    return { x: (marker.left + marker.right) / 2 - stage.left, y: (marker.top + marker.bottom) / 2 - stage.top };
  })()
}));
if (errors.length || state.images.some((image) => !image.loaded) || state.images.filter((image) => image.src.includes('living-overworld-hill')).some((image) => image.width !== 3844 || image.height !== 724) ||
  Math.abs(state.marker.x - 2142 * 1200 / 3844) > .1 || Math.abs(state.marker.y - (17 + 116 * 1200 / 3844)) > .1) {
  throw new Error(JSON.stringify({ errors, state }, null, 2));
}

const output = path.resolve('docs/assets/screenshots');
await page.locator('#neutral-preview').screenshot({ path: path.join(output, 'living-overworld-hill-final-neutral.png') });
await page.locator('#annotated-preview').screenshot({ path: path.join(output, 'living-overworld-hill-final-annotated.png') });
await page.locator('#approved-comparison').screenshot({ path: path.join(output, 'living-overworld-hill-final-comparison.png') });
console.log(JSON.stringify({ errors, state }, null, 2));
await browser.close();
