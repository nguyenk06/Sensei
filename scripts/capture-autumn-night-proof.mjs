import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve('.');
const pagePath = path.join(root, 'docs', 'prototypes', 'living-overworld-autumn-night-proof.html');
const output = path.join(root, 'docs', 'assets', 'living-overworld-night-proof');
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 2048, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(pagePath).href, { waitUntil: 'networkidle' });
  await page.locator('#desktop-proof').screenshot({ path: path.join(output, 'autumn-night-desktop-scene-proof.png') });
  await page.locator('#mobile-proof').screenshot({ path: path.join(output, 'autumn-night-mobile-scene-proof.png') });
  await page.screenshot({ path: path.join(output, 'autumn-night-review-sheet.png'), fullPage: true });
} finally {
  await browser.close();
}
