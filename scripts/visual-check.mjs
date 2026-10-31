import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const outputDir = path.resolve('.qa');
fs.mkdirSync(outputDir, { recursive: true });
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = process.env.SENSEI_QA_URL ?? 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath, headless: true });

async function verifyPage(name, viewport, fullPage) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByText('Clear dishes').first().waitFor();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  if (dimensions.content > dimensions.viewport) {
    throw new Error(`${name} has horizontal overflow: ${dimensions.content}px > ${dimensions.viewport}px`);
  }
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage });
  return { name, ...dimensions };
}

const desktop = await verifyPage('desktop', { width: 1440, height: 1000 }, false);
const parentPage = await browser.newPage({ viewport: { width: 1024, height: 900 } });
await parentPage.goto(baseUrl, { waitUntil: 'networkidle' });
await parentPage.getByRole('button', { name: 'Parent Mode' }).click();
await parentPage.getByRole('heading', { name: 'Household controls' }).waitFor();
await parentPage.screenshot({ path: path.join(outputDir, 'parent-mode.png'), fullPage: true });
const mobile = await verifyPage('mobile', { width: 390, height: 844 }, true);

await browser.close();
console.log(JSON.stringify({ desktop, mobile, parentMode: 'rendered' }));
