import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pageUrl = pathToFileURL(path.resolve('docs/prototypes/living-overworld-winter-composition-proof.html')).href;
const out = path.resolve('docs/assets/living-overworld-winter-proof');
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(pageUrl, { waitUntil: 'load' });
await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
await page.screenshot({ path: path.join(out, 'winter-composition-review-sheet.png'), fullPage: true });
for (const [id, file] of [
  ['winter-mobile-clean','winter-mobile-clean.png'],['winter-desktop-clean','winter-desktop-clean.png'],
  ['winter-mobile-annotated','winter-mobile-annotated.png'],['winter-desktop-annotated','winter-desktop-annotated.png'],
  ['winter-mobile-transparency','winter-mobile-transparency.png'],['winter-desktop-transparency','winter-desktop-transparency.png']
]) await page.locator(`#${id}`).screenshot({ path: path.join(out, file) });
if (errors.length) throw new Error(`Browser console errors: ${errors.join(' | ')}`);
await browser.close();
