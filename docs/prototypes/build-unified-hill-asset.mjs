import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const sourceWidth = 2172;
const sourceHeight = 724;
const rightOutcropX = 1672;
const finalWidth = rightOutcropX + sourceWidth;
const finalHeight = sourceHeight;
const sourceUrl = pathToFileURL(path.resolve('public/assets/living-overworld/autumn-structural/waterfall-outcrop.png')).href;
const outputPath = path.resolve('public/assets/living-overworld/autumn-structural/living-overworld-hill.png');

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--allow-file-access-from-files']
});
const page = await browser.newPage();
await page.goto(pathToFileURL(path.resolve('docs/prototypes/living-overworld-unified-hill-proof.html')).href, { waitUntil: 'load' });

const pngDataUrl = await page.evaluate(({ sourceWidth, sourceHeight, rightOutcropX, finalWidth, finalHeight }) => {
  const source = document.querySelector('#annotated-proof .o2');
  if (!source || source.naturalWidth !== sourceWidth || source.naturalHeight !== sourceHeight) throw new Error('Unexpected source dimensions');
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.save();
  context.translate(sourceWidth, 0);
  context.scale(-1, 1);
  context.drawImage(source, 0, 0, sourceWidth, sourceHeight);
  context.restore();
  context.drawImage(source, rightOutcropX, 0, sourceWidth, sourceHeight);
  return canvas.toDataURL('image/png');
}, { sourceWidth, sourceHeight, rightOutcropX, finalWidth, finalHeight });

await fs.writeFile(outputPath, Buffer.from(pngDataUrl.split(',')[1], 'base64'));

const finalUrl = pathToFileURL(outputPath).href;
const verification = await page.evaluate(async ({ sourceUrl, finalUrl, sourceWidth, sourceHeight, rightOutcropX, finalWidth, finalHeight }) => {
  const load = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
  const [source, finalImage] = await Promise.all([load(sourceUrl), load(finalUrl)]);
  const expectedCanvas = document.createElement('canvas');
  expectedCanvas.width = finalWidth;
  expectedCanvas.height = finalHeight;
  const expected = expectedCanvas.getContext('2d');
  expected.imageSmoothingEnabled = false;
  expected.save();
  expected.translate(sourceWidth, 0);
  expected.scale(-1, 1);
  expected.drawImage(source, 0, 0, sourceWidth, sourceHeight);
  expected.restore();
  expected.drawImage(source, rightOutcropX, 0, sourceWidth, sourceHeight);

  const actualCanvas = document.createElement('canvas');
  actualCanvas.width = finalWidth;
  actualCanvas.height = finalHeight;
  const actual = actualCanvas.getContext('2d');
  actual.drawImage(finalImage, 0, 0);

  const expectedPixels = expected.getImageData(0, 0, finalWidth, finalHeight).data;
  const actualPixels = actual.getImageData(0, 0, finalWidth, finalHeight).data;
  let mismatchedChannels = 0;
  let maxChannelDelta = 0;
  for (let index = 0; index < expectedPixels.length; index += 1) {
    const delta = Math.abs(expectedPixels[index] - actualPixels[index]);
    if (delta) mismatchedChannels += 1;
    if (delta > maxChannelDelta) maxChannelDelta = delta;
  }
  return {
    source: [source.naturalWidth, source.naturalHeight],
    final: [finalImage.naturalWidth, finalImage.naturalHeight],
    mismatchedChannels,
    maxChannelDelta,
    transparentCornerAlpha: actualPixels[3]
  };
}, { sourceUrl, finalUrl, sourceWidth, sourceHeight, rightOutcropX, finalWidth, finalHeight });

if (verification.final[0] !== finalWidth || verification.final[1] !== finalHeight || verification.mismatchedChannels || verification.transparentCornerAlpha !== 0) {
  throw new Error('Final hill verification failed: ' + JSON.stringify(verification));
}

console.log(JSON.stringify({
  outputPath,
  dimensions: [finalWidth, finalHeight],
  composition: { o1: { x: 0, mirrored: true }, o2: { x: rightOutcropX, mirrored: false } },
  anchors: { waterfallSource: [2142, 116], join: [1922, 150] },
  verification
}, null, 2));
await browser.close();
