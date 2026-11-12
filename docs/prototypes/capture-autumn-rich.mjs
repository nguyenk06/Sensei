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
  const state = await page.evaluate(() => {
    const scene = document.querySelector('.scene').getBoundingClientRect();
    const originalOutcropElement = document.querySelector('.waterfall-system .outcrop.original');
    const mirroredOutcropElement = document.querySelector('.waterfall-system .outcrop.mirror');
    const waterElement = document.querySelector('.waterfall-system .water');
    const originalOutcropBounds = originalOutcropElement.getBoundingClientRect();
    const mirroredOutcropBounds = mirroredOutcropElement.getBoundingClientRect();
    const waterBounds = waterElement.getBoundingClientRect();
    const visibleObjects = [...document.querySelectorAll('.scene-object')]
      .filter((element) => getComputedStyle(element).display !== 'none');
    const unsupportedObjects = visibleObjects.filter((element) => {
      const bounds = element.getBoundingClientRect();
      const baseX = (bounds.left + bounds.right) / 2;
      return baseX < scene.left || baseX > scene.right || bounds.bottom < scene.top || bounds.bottom > scene.bottom + 1;
    }).map((element) => ({
      src: element.getAttribute('src'),
      x: element.style.getPropertyValue('--x'),
      bottom: element.style.getPropertyValue('--b')
    }));
    const lakeTrees = visibleObjects.filter((element) => {
      if (!element.getAttribute('src').includes('tree')) return false;
      const baseXRatio = Number.parseFloat(element.style.getPropertyValue('--x')) / 100;
      return baseXRatio > 0.34 && baseXRatio < 0.68;
    }).map((element) => element.getAttribute('src'));
    const originalOutcropAnchored = getComputedStyle(originalOutcropElement).transform === 'none';
    const outcropCloneMirrored = getComputedStyle(mirroredOutcropElement).transform.startsWith('matrix(-1');
    const outcropFramesMatch =
      Math.abs(originalOutcropBounds.left - mirroredOutcropBounds.left) < 0.1 &&
      Math.abs(originalOutcropBounds.top - mirroredOutcropBounds.top) < 0.1 &&
      Math.abs(originalOutcropBounds.width - mirroredOutcropBounds.width) < 0.1 &&
      Math.abs(originalOutcropBounds.height - mirroredOutcropBounds.height) < 0.1;
    const cascadeShiftRatio = (waterBounds.left - originalOutcropBounds.left) / originalOutcropBounds.width;
    const waterfallGeometryCorrected = originalOutcropAnchored && outcropCloneMirrored && outcropFramesMatch &&
      Math.abs(cascadeShiftRatio - 0.30) < 0.01 &&
      Math.abs(originalOutcropBounds.top - waterBounds.top) < 0.1 &&
      Math.abs(originalOutcropBounds.width - waterBounds.width) < 0.1 &&
      Math.abs(originalOutcropBounds.height - waterBounds.height) < 0.1;
    const sun = document.querySelector('.sun').getBoundingClientRect();
    const sunCenterRatio = (((sun.left + sun.right) / 2) - scene.left) / scene.width;
    return {
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      sceneHeight: Math.round(scene.height),
      brokenAssets: [...document.images]
        .filter((asset) => !asset.complete || asset.naturalWidth === 0)
        .map((asset) => asset.getAttribute('src')),
      unsupportedObjects,
      lakeTrees,
      originalOutcropAnchored,
      outcropCloneMirrored,
      outcropFramesMatch,
      cascadeShiftRatio,
      waterfallGeometryCorrected,
      sunCenterRatio
    };
  });
  if (state.contentWidth > state.viewportWidth || state.sceneHeight !== expectedSceneHeight || state.brokenAssets.length || state.unsupportedObjects.length || state.lakeTrees.length || !state.waterfallGeometryCorrected || Math.abs(state.sunCenterRatio - 0.51) > 0.02 || browserErrors.length) {
    throw new Error(`${name} proof validation failed: ${JSON.stringify({ state, browserErrors })}`);
  }
  await page.screenshot({ path: path.join(output, `living-overworld-autumn-rich-${name}.png`), fullPage: false });
  if (name === 'desktop-1920') {
    await page.screenshot({
      path: path.join(output, 'living-overworld-autumn-rich-waterfall-closeup.png'),
      clip: { x: 330, y: 72, width: 700, height: 215 }
    });
  }
  console.log(`${name}: ${state.viewportWidth}px wide, ${state.sceneHeight}px scene, original outcrop plus mirrored clone with centered cascades, grounded objects, open lake, no overflow`);
  await page.close();
}

await browser.close();
