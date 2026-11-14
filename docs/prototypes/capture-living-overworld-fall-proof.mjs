import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pageUrl = pathToFileURL(path.resolve('docs/prototypes/living-overworld-fall-composition-proof.html')).href;
const out = path.resolve('docs/assets/living-overworld-fall-proof');
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
await page.goto(pageUrl, { waitUntil: 'load' });
await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
await page.screenshot({ path: path.join(out, 'fall-composition-review-sheet.png'), fullPage: true });
for (const [id, file] of [
  ['mobile-clean', 'fall-mobile-clean.png'], ['desktop-clean', 'fall-desktop-clean.png'],
  ['mobile-annotated', 'fall-mobile-annotated.png'], ['desktop-annotated', 'fall-desktop-annotated.png'],
  ['mobile-checker', 'fall-mobile-transparency.png'], ['desktop-checker', 'fall-desktop-transparency.png']
]) await page.locator(`#${id}`).screenshot({ path: path.join(out, file) });
await browser.close();
