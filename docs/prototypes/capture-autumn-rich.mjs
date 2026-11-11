import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const source = pathToFileURL(path.resolve('docs/prototypes/living-overworld-autumn-rich.html')).href;
const output = path.resolve('docs/assets/screenshots');
const views = [
  ['mobile', 390, 844],
  ['desktop-1100', 1100, 720],
  ['desktop-1920', 1920, 900],
  ['ultrawide-32x9', 2560, 720]
];

for (const [name, width, height] of views) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.goto(source, { waitUntil: 'load' });
  const expectedSceneHeight = width <= 700 ? 175 : 300;
  const state = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    sceneHeight: Math.round(document.querySelector('.scene').getBoundingClientRect().height),
    brokenAssets: [...document.images]
      .filter((asset) => !asset.complete || asset.naturalWidth === 0)
      .map((asset) => asset.getAttribute('src'))
  }));
  if (state.contentWidth > state.viewportWidth || state.sceneHeight !== expectedSceneHeight || state.brokenAssets.length || browserErrors.length) {
    throw new Error(`${name} proof validation failed: ${JSON.stringify({ state, browserErrors })}`);
  }
  await page.screenshot({ path: path.join(output, `living-overworld-autumn-rich-${name}.png`), fullPage: false });
  console.log(`${name}: ${state.viewportWidth}px wide, ${state.sceneHeight}px scene, no overflow, all assets loaded`);
  await page.close();
}

await browser.close();
