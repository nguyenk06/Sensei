import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 2600, height: 2200 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(pathToFileURL(path.resolve('docs/prototypes/living-overworld-asset-coordinate-map.html')).href, { waitUntil: 'load' });

const result = await page.evaluate(() => ({
  images: [...document.images].map((image) => ({ src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight, loaded: image.complete && image.naturalWidth > 0 })),
  o1: document.querySelector('.o1').getBoundingClientRect().toJSON(),
  o2: document.querySelector('.o2').getBoundingClientRect().toJSON(),
  w1: document.querySelector('.w1').getBoundingClientRect().toJSON(),
  l1: document.querySelector('.lake-ref').getBoundingClientRect().toJSON(),
  map: window.coordinateMap,
  bodyWidth: document.body.scrollWidth,
  bodyHeight: document.body.scrollHeight
}));

if (errors.length || result.images.some((image) => !image.loaded) || result.images.some((image) => image.width !== 2172 || image.height !== 724)) {
  throw new Error(JSON.stringify({ errors, images: result.images }, null, 2));
}
if (Math.abs(result.o1.x - 277) > .2 || Math.abs(result.o2.x - 511) > .2 || Math.abs(result.w1.x - 667) > .2) {
  throw new Error(`Unexpected diagnostic sheet placement: ${JSON.stringify({ o1: result.o1, o2: result.o2, w1: result.w1 })}`);
}

await page.screenshot({ path: path.resolve('docs/assets/screenshots/living-overworld-asset-coordinate-anchor-map.png'), fullPage: true });
console.log(JSON.stringify({ sheet: [result.bodyWidth, result.bodyHeight], assets: result.images.length, errors, sceneGeometry: { o1: result.o1, o2: result.o2, w1: result.w1, l1: result.l1 } }, null, 2));
await browser.close();
