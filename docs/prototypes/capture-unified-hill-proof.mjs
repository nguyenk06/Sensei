import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 2020, height: 1600 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(pathToFileURL(path.resolve('docs/prototypes/living-overworld-unified-hill-proof.html')).href, { waitUntil: 'load' });

const state = await page.evaluate(() => {
  const proof = document.querySelector('#annotated-proof');
  const o1 = proof.querySelector('.o1').getBoundingClientRect();
  const o2 = proof.querySelector('.o2').getBoundingClientRect();
  const proofBounds = proof.getBoundingClientRect();
  const relative = (rect) => ({ x: rect.x - proofBounds.x, y: rect.y - proofBounds.y, width: rect.width, height: rect.height });
  const o1Relative = relative(o1);
  const o2Relative = relative(o2);
  const scale = 650 / 2172;
  const o1Join = { x: o1Relative.x + (2172 - 250) * scale, y: o1Relative.y + 150 * scale };
  const o2Join = { x: o2Relative.x + 250 * scale, y: o2Relative.y + 150 * scale };
  return {
    imageCount: proof.querySelectorAll('img').length,
    images: [...document.images].map((image) => ({ loaded: image.complete && image.naturalWidth === 2172 && image.naturalHeight === 724, src: image.getAttribute('src') })),
    o1: o1Relative,
    o2: o2Relative,
    o1Mirrored: getComputedStyle(proof.querySelector('.o1')).transform.startsWith('matrix(-1'),
    o2Mirrored: getComputedStyle(proof.querySelector('.o2')).transform.startsWith('matrix(-1'),
    o1Join,
    o2Join,
    tolerance: Math.hypot(o1Join.x - o2Join.x, o1Join.y - o2Join.y)
  };
});

if (errors.length || state.imageCount !== 2 || state.images.some((image) => !image.loaded) || !state.o1Mirrored || state.o2Mirrored || state.tolerance > .1 ||
  Math.abs(state.o1.width - state.o2.width) > .1 || Math.abs(state.o1.height - state.o2.height) > .1 || Math.abs(state.o1.y - state.o2.y) > .1) {
  throw new Error(JSON.stringify({ errors, state }, null, 2));
}

const output = path.resolve('docs/assets/screenshots');
await page.evaluate(() => {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
});
await page.locator('#transparent-capture').screenshot({ path: path.join(output, 'living-overworld-unified-hill-transparent.png'), omitBackground: true });
await page.evaluate(() => {
  document.documentElement.style.background = '#11171c';
  document.body.style.background = '#11171c';
});
await page.locator('#annotated-proof').screenshot({ path: path.join(output, 'living-overworld-unified-hill-annotated.png') });
await page.locator('#before-after').screenshot({ path: path.join(output, 'living-overworld-unified-hill-before-after.png') });
console.log(JSON.stringify({ errors, state }, null, 2));
await browser.close();
