import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true
});
const source = pathToFileURL(path.resolve('docs/prototypes/living-overworld-autumn-structural.html')).href;
const output = path.resolve('docs/assets/screenshots');
const views = [
  ['mobile', 390, 844],
  ['desktop-1100', 1100, 720],
  ['desktop-1920', 1920, 900],
  ['ultrawide-32x9', 2560, 720]
];

for (const [name, width, height] of views) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(source, { waitUntil: 'load' });
  await page.screenshot({
    path: path.join(output, `living-overworld-autumn-structural-${name}.png`),
    fullPage: false
  });
  await page.close();
}

await browser.close();
