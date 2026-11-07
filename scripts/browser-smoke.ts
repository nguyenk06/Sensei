import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { buildApp } from '../src/server/app.js';

const mutationHeaders = { 'x-sensei-request': '1' };
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sensei-browser-'));
const databasePath = path.join(tempDir, 'sensei.sqlite');
const qaDir = path.resolve('.qa');
const staticDir = process.env.SENSEI_QA_STATIC_DIR ? path.resolve(process.env.SENSEI_QA_STATIC_DIR) : path.resolve('dist/client');
fs.mkdirSync(qaDir, { recursive: true });
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const app = await buildApp({
  databasePath,
  host: '127.0.0.1',
  port: 0,
  staticDir
});
const address = await app.listen({ host: '127.0.0.1', port: 0 });
const browser = await chromium.launch({ executablePath: chromePath, headless: true });

try {
  const childOne = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const childTwo = await browser.newPage({ viewport: { width: 390, height: 844 } });
  childOne.setDefaultTimeout(12_000);
  childTwo.setDefaultTimeout(12_000);
  const browserErrors: string[] = [];
  for (const page of [childOne, childTwo]) {
    page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
    page.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
    page.on('requestfailed', (request) => browserErrors.push(`request: ${request.url()} (${request.failure()?.errorText ?? 'failed'})`));
  }
  await Promise.all([
    childOne.goto(address, { waitUntil: 'networkidle' }),
    childTwo.goto(address, { waitUntil: 'networkidle' })
  ]);
  const [htmlResponse, checklistResponse] = await Promise.all([
    childOne.request.get(address),
    childOne.request.get(`${address}/api/checklist`)
  ]);
  if (!htmlResponse.headers()['cache-control']?.includes('no-store')) throw new Error('HTML can be served from a stale cache');
  if (!checklistResponse.headers()['cache-control']?.includes('no-store')) throw new Error('API responses can be served from a stale cache');
  const initialChecklist = await checklistResponse.json() as {
    today: string;
    days: Array<{ occurrences: Array<{ state: string; eligible: boolean; future: boolean }> }>;
  };
  const expectedMissed = initialChecklist.days.flatMap((day) => day.occurrences)
    .filter((item) => item.state === 'unclaimed' && !item.eligible && !item.future).length;
  if (await childOne.locator('.weeksheet-chore.state-missed').count() !== expectedMissed) {
    throw new Error('Past unavailable chores are not presented as missed');
  }
  async function assertHeaderActions(page: Page, label: string) {
    const layout = await page.locator('.topbar').evaluate((header) => {
      const theme = header.querySelector('.theme-quick-control')!.getBoundingClientRect();
      const parent = header.querySelector('.parent-button')!.getBoundingClientRect();
      const bar = header.getBoundingClientRect();
      return { themeRight: theme.right, parentLeft: parent.left, rightGap: bar.right - parent.right };
    });
    if (layout.themeRight > layout.parentLeft || layout.rightGap > 24) {
      throw new Error(`${label} header controls are not ordered and right-aligned: ${JSON.stringify(layout)}`);
    }
  }
  await assertHeaderActions(childOne, 'NovaPay desktop');
  await assertHeaderActions(childTwo, 'NovaPay mobile');

  const mobileRail = childTwo.locator('.mobile-day-rail button');
  if (await mobileRail.count() !== 7) throw new Error('Mobile day rail does not contain seven days');
  const selectedRailDay = childTwo.locator('.mobile-day-rail button[aria-pressed="true"]');
  if (await selectedRailDay.count() !== 1 || await selectedRailDay.getAttribute('aria-current') !== 'date') {
    throw new Error('Mobile view did not open with Today selected');
  }
  await childTwo.getByRole('button', { name: /View entire week/ }).click();
  const weekOverviewDays = childTwo.locator('.mobile-week-overview > div > button');
  if (await weekOverviewDays.count() !== 7) throw new Error('Mobile entire-week overview does not contain seven days');
  await weekOverviewDays.nth(0).click();
  if (!(await mobileRail.nth(0).getAttribute('aria-pressed') === 'true') || !(await childTwo.locator('.mobile-selected-day').isVisible())) {
    throw new Error('Selecting a mobile week summary did not open its checklist');
  }
  await childTwo.locator('.mobile-day-rail button[aria-current="date"]').click();

  const todayCard = childOne.locator('.week-day-column.today');
  const checkboxOne = todayCard.getByRole('checkbox').first();
  const firstDetailTrigger = todayCard.locator('.weeksheet-detail-trigger').first();
  await firstDetailTrigger.click();
  const initialDetail = childOne.getByRole('dialog', { name: /Clear dishes/ });
  await initialDetail.waitFor();
  if (await checkboxOne.isChecked()) throw new Error('Opening chore details changed the claim state');
  if (!await initialDetail.evaluate((element) => element === document.activeElement)) throw new Error('Chore details did not receive initial focus');
  await childOne.keyboard.press('Shift+Tab');
  if (!await initialDetail.getByRole('button', { name: 'Close chore details' }).evaluate((element) => element === document.activeElement)) {
    throw new Error('Chore detail dialog did not contain keyboard focus');
  }
  await initialDetail.getByRole('button', { name: 'Close chore details' }).click();
  if (!await firstDetailTrigger.evaluate((element) => element === document.activeElement)) throw new Error('Chore details did not restore opener focus');
  const firstClaim = childOne.waitForResponse((response) => response.url().includes('/api/occurrences/') && response.url().endsWith('/claim') && response.request().method() === 'POST');
  await todayCard.locator('.weeksheet-checkbox').first().click();
  await firstClaim;
  await childOne.waitForFunction(() => (document.querySelector('.week-day-column.today input[type="checkbox"]') as HTMLInputElement | null)?.checked === true);

  await childTwo.reload({ waitUntil: 'networkidle' });
  const checkboxTwo = childTwo.locator('.mobile-selected-day').getByRole('checkbox').first();
  if (!(await checkboxTwo.isChecked())) throw new Error('Claim was not shared with the second client');
  const mobileDetailTrigger = childTwo.locator('.mobile-selected-day .weeksheet-detail-trigger').first();
  await mobileDetailTrigger.click();
  const mobileDetail = childTwo.getByRole('dialog', { name: /Clear dishes/ });
  await mobileDetail.waitFor();
  const mobileDetailWidth = await mobileDetail.evaluate((element) => ({
    viewport: document.documentElement.clientWidth, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right
  }));
  if (mobileDetailWidth.left < 0 || mobileDetailWidth.right > mobileDetailWidth.viewport) {
    throw new Error(`Chore details overflow mobile viewport: ${JSON.stringify(mobileDetailWidth)}`);
  }
  if (!(await checkboxTwo.isChecked())) throw new Error('Opening mobile details changed the claim state');
  await mobileDetail.screenshot({ path: path.join(qaDir, 'independent-chore-details-mobile.png') });
  await mobileDetail.getByRole('button', { name: 'Close chore details' }).click();
  const sharedUndo = childTwo.waitForResponse((response) => response.url().includes('/api/occurrences/') && response.url().endsWith('/claim') && response.request().method() === 'DELETE');
  await childTwo.locator('.mobile-selected-day .weeksheet-checkbox').first().click();
  await sharedUndo;
  await childOne.reload({ waitUntil: 'networkidle' });
  await childOne.waitForFunction(() => (document.querySelector('.week-day-column.today input[type="checkbox"]') as HTMLInputElement | null)?.checked === false);

  await childOne.locator('.history-summary').click();
  const originalMonth = await childOne.locator('.month-controls strong').textContent();
  const expectedMonth = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${initialChecklist.today.slice(0, 7)}-01T00:00:00Z`));
  if (originalMonth !== expectedMonth || !((await childOne.locator('.history-summary').innerText()).includes(expectedMonth.split(' ')[0]))) {
    throw new Error(`History month is not aligned with the household date: ${originalMonth} versus ${expectedMonth}`);
  }
  await childOne.locator('.month-controls button').last().click();
  await childOne.waitForFunction((month) => document.querySelector('.month-controls strong')?.textContent !== month, originalMonth);
  await childOne.locator('.month-controls button').first().click();
  await childOne.waitForFunction((month) => document.querySelector('.month-controls strong')?.textContent === month, originalMonth);

  const approvalClaim = childOne.waitForResponse((response) => response.url().includes('/api/occurrences/') && response.url().endsWith('/claim') && response.request().method() === 'POST');
  await childOne.locator('.week-day-column.today .weeksheet-checkbox').first().click();
  await approvalClaim;
  await childOne.waitForFunction(() => (document.querySelector('.week-day-column.today input[type="checkbox"]') as HTMLInputElement | null)?.checked === true);
  const checklist = await (await childOne.request.get(`${address}/api/checklist`)).json() as { today: string };

  const pendingDetailTrigger = childOne.locator('.week-day-column.today .weeksheet-detail-trigger').first();
  await pendingDetailTrigger.click();
  const pendingDetail = childOne.getByRole('dialog', { name: /Clear dishes/ });
  await pendingDetail.getByRole('button', { name: 'Review claim' }).click();
  await pendingDetail.getByLabel('Parent PIN').fill('739154');
  await pendingDetail.getByRole('button', { name: 'Continue' }).click();
  await pendingDetail.getByRole('button', { name: /Approve/ }).waitFor();
  if (!((await pendingDetail.getByRole('heading').textContent()) ?? '').includes('Clear dishes')) {
    throw new Error('PIN authorization did not retain the selected chore');
  }
  await pendingDetail.getByLabel('Award amount ($)').fill('1.25');
  await pendingDetail.getByLabel('Parent comment (optional)').fill('Great extra effort');
  await pendingDetail.screenshot({ path: path.join(qaDir, 'independent-chore-review-desktop.png') });
  const individualApprove = childOne.waitForResponse((response) => response.url().includes('/api/parent/occurrences/') && response.url().endsWith('/approve'));
  await pendingDetail.getByRole('button', { name: /Approve/ }).click();
  const individualApprovalResponse = await individualApprove;
  const individualApproval = await individualApprovalResponse.json() as { occurrenceId: string; creditedCents: number };
  await childOne.getByRole('status').filter({ hasText: 'Chore approved' }).waitFor();
  if (individualApproval.creditedCents !== 125) throw new Error('Individual approval did not credit the adjusted reward');
  if (!await pendingDetailTrigger.evaluate((element) => element === document.activeElement)) throw new Error('Individual review did not return to its originating row');
  await pendingDetailTrigger.click();
  const adjustedDetail = childOne.getByRole('dialog', { name: /Clear dishes/ });
  await adjustedDetail.getByText('Final awarded amount').waitFor();
  await adjustedDetail.getByText('$1.25', { exact: true }).waitFor();
  await adjustedDetail.getByText('Great extra effort').waitFor();
  await adjustedDetail.getByRole('button', { name: 'Close chore details' }).click();
  const retry = await childOne.request.post(`${address}/api/parent/occurrences/${individualApproval.occurrenceId}/approve`, {
    headers: mutationHeaders
  });
  if (!(await retry.json() as { idempotent: boolean }).idempotent) throw new Error('Individual approval retry was not idempotent');
  const afterRetry = await (await childOne.request.get(`${address}/api/allowance`)).json() as { approvedBalanceCents: number };
  if (afterRetry.approvedBalanceCents !== 125) throw new Error('Individual approval retry duplicated allowance credit');

  await childOne.getByRole('button', { name: 'Parent Mode' }).click();
  const parentDialog = childOne.getByRole('dialog', { name: 'Household controls' });
  await parentDialog.waitFor();
  if (!await parentDialog.evaluate((element) => element === document.activeElement)) {
    throw new Error('Parent dialog did not receive initial focus');
  }
  await childOne.keyboard.press('Shift+Tab');
  if (!await parentDialog.evaluate((element) => element.contains(document.activeElement))) {
    throw new Error('Parent dialog did not contain backward keyboard focus');
  }
  await childOne.keyboard.press('Tab');
  if (!await parentDialog.getByRole('button', { name: 'Close Parent Mode' }).evaluate((element) => element === document.activeElement)) {
    throw new Error('Parent dialog did not wrap keyboard focus');
  }
  await childOne.getByRole('button', { name: 'chores' }).click();
  await childOne.getByRole('heading', { name: 'Managed chores' }).waitFor();
  await childOne.getByLabel('Chore name').fill('Browser QA chore');
  await childOne.getByLabel('Reward ($)').fill('2.25');
  await childOne.getByLabel('Schedule').selectOption('one_time');
  await childOne.getByLabel('Chore date').fill(checklist.today);
  await childOne.getByRole('button', { name: 'Add chore' }).click();
  await childOne.getByText('Browser QA chore').last().waitFor();
  await childOne.getByLabel('Chore name').fill('Browser QA individual reject');
  await childOne.getByLabel('Reward ($)').fill('1.50');
  await childOne.getByLabel('Schedule').selectOption('one_time');
  await childOne.getByLabel('Chore date').fill(checklist.today);
  await childOne.getByRole('button', { name: 'Add chore' }).click();
  await childOne.getByText('Browser QA individual reject').last().waitFor();

  await childOne.getByRole('button', { name: 'Close Parent Mode' }).click();
  if (!await childOne.getByRole('button', { name: 'Parent Mode' }).evaluate((element) => element === document.activeElement)) {
    throw new Error('Closing Parent Mode did not restore opener focus');
  }
  const browserQaEntry = childOne.locator('.week-day-column.today .weeksheet-chore').filter({ hasText: 'Browser QA chore' });
  const secondClaim = childOne.waitForResponse((response) => response.url().includes('/api/occurrences/') && response.url().endsWith('/claim') && response.request().method() === 'POST');
  await browserQaEntry.locator('.weeksheet-checkbox').click();
  await secondClaim;
  const individualRejectEntry = childOne.locator('.week-day-column.today .weeksheet-chore').filter({ hasText: 'Browser QA individual reject' });
  const thirdClaim = childOne.waitForResponse((response) => response.url().includes('/api/occurrences/') && response.url().endsWith('/claim') && response.request().method() === 'POST');
  await individualRejectEntry.locator('.weeksheet-checkbox').click();
  await thirdClaim;
  await childOne.getByRole('button', { name: /Review 2 pending/ }).waitFor();
  await individualRejectEntry.locator('.weeksheet-detail-trigger').click();
  const rejectDetail = childOne.getByRole('dialog', { name: 'Browser QA individual reject' });
  await rejectDetail.getByRole('button', { name: 'Review claim' }).click();
  const awardInput = rejectDetail.getByLabel('Award amount ($)');
  if (await awardInput.getAttribute('step') !== '0.25') throw new Error('Individual award input does not enforce quarter-dollar steps');
  await awardInput.fill('1.00');
  await rejectDetail.getByRole('button', { name: /Approve/ }).click();
  await rejectDetail.getByRole('alert').filter({ hasText: 'Explain why the award is lower' }).waitFor();
  await rejectDetail.getByLabel('Parent explanation (required)').fill('Handled independently in browser QA');
  const individualReject = childOne.waitForResponse((response) => response.url().includes('/api/parent/occurrences/') && response.url().endsWith('/reject'));
  await rejectDetail.getByRole('button', { name: /Reject/ }).click();
  await individualReject;
  await childOne.getByRole('status').filter({ hasText: 'Chore rejected' }).waitFor();
  await childOne.getByRole('button', { name: /Review 1 pending/ }).waitFor();
  if (!((await browserQaEntry.innerText()).includes('Waiting for review'))) throw new Error('Individual review changed another pending claim');
  await childOne.screenshot({ path: path.join(qaDir, 'individual-approval-actions.png'), fullPage: true });
  await childOne.screenshot({ path: path.join(qaDir, 'showcase-novapay.png') });
  await childOne.getByLabel('Device theme').selectOption('classic');
  if (await childOne.locator('html').getAttribute('data-theme') !== 'classic') throw new Error('Classic theme did not apply');
  await assertHeaderActions(childOne, 'Classic desktop');
  if (await childOne.locator('.overworld-banner').count() !== 0) throw new Error('Classic theme exposed Overworld visuals');
  await childOne.screenshot({ path: path.join(qaDir, 'classic-theme.png'), fullPage: true });
  await childOne.screenshot({ path: path.join(qaDir, 'showcase-classic.png') });
  await childOne.reload({ waitUntil: 'networkidle' });
  if (await childOne.locator('html').getAttribute('data-theme') !== 'classic') throw new Error('Device theme did not persist after refresh');
  await childTwo.reload({ waitUntil: 'networkidle' });
  if (await childTwo.locator('html').getAttribute('data-theme') !== 'novapay') throw new Error('Theme leaked to another device');
  await childOne.getByLabel('Device theme').selectOption('minecraft');
  if (await childOne.locator('html').getAttribute('data-theme') !== 'minecraft') throw new Error('Minecraft theme did not apply');
  await assertHeaderActions(childOne, 'Overworld desktop');
  const bannerStyle = await childOne.locator('.overworld-banner').evaluate((element) => {
    return { display: getComputedStyle(element).display, height: element.getBoundingClientRect().height };
  });
  if (bannerStyle.display === 'none' || bannerStyle.height < 300 || bannerStyle.height > 420) {
    throw new Error(`Desktop Overworld banner is invalid: ${JSON.stringify(bannerStyle)}`);
  }
  const landscapeWidth = await childOne.locator('.overworld-landscape').first().evaluate((element) => (element as HTMLImageElement).naturalWidth);
  if (landscapeWidth !== 2172) throw new Error(`Overworld master did not load: ${landscapeWidth}`);
  const animalAnimation = await childOne.locator('.overworld-animal').first().evaluate((element) => getComputedStyle(element).animationName);
  if (!animalAnimation.includes('overworld-animal-frames') || !animalAnimation.includes('overworld-animal-wander')) {
    throw new Error(`Overworld animal movement is not active: ${animalAnimation}`);
  }
  const chickenAnimation = await childOne.locator('.overworld-animal.chicken').evaluate((element) => getComputedStyle(element).animationName);
  if (!chickenAnimation.includes('overworld-animal-wander-reverse')) {
    throw new Error(`Chicken facing direction is invalid: ${chickenAnimation}`);
  }
  await childOne.locator('.overworld-lab summary').click();
  await childOne.getByLabel('Season').selectOption('winter');
  await childOne.getByLabel('Light').selectOption('night');
  await childOne.getByLabel('Weather').selectOption('snow');
  if (!((await childOne.locator('.overworld-landscape').first().getAttribute('src')) ?? '').endsWith('/winter.webp')) throw new Error('Winter scene override failed');
  if (!((await childOne.locator('.overworld-light').getAttribute('src')) ?? '').endsWith('/night.png')) throw new Error('Night light override failed');
  if (!((await childOne.locator('.overworld-weather').getAttribute('src')) ?? '').endsWith('/snow.svg')) throw new Error('Snow weather override failed');
  const sceneLayers = await childOne.locator('.overworld-scene').evaluate((scene) => {
    const axolotl = scene.querySelector('.axolotl')!.getBoundingClientRect();
    const bounds = scene.getBoundingClientRect();
    return {
      foreground: Number(getComputedStyle(scene.querySelector('.overworld-foreground')!).zIndex),
      animal: Number(getComputedStyle(scene.querySelector('.overworld-animal')!).zIndex),
      light: Number(getComputedStyle(scene.querySelector('.overworld-light')!).zIndex),
      nightDisplay: getComputedStyle(scene.querySelector('.overworld-night-sky')!).display,
      cometAnimation: getComputedStyle(scene.querySelector('.overworld-comet')!).animationName,
      weather: Number(getComputedStyle(scene.querySelector('.overworld-weather')!).zIndex),
      axolotlBottomGap: Math.round(bounds.bottom - axolotl.bottom)
    };
  });
  if (!(sceneLayers.foreground < sceneLayers.animal && sceneLayers.animal < sceneLayers.light && sceneLayers.light < sceneLayers.weather)) {
    throw new Error(`Overworld layer order is invalid: ${JSON.stringify(sceneLayers)}`);
  }
  if (sceneLayers.nightDisplay === 'none' || !sceneLayers.cometAnimation.includes('overworld-comet')) {
    throw new Error(`Night sky motion is not active: ${JSON.stringify(sceneLayers)}`);
  }
  if (sceneLayers.axolotlBottomGap > 24) throw new Error(`Axolotl is too high: ${sceneLayers.axolotlBottomGap}px`);
  await childOne.getByRole('button', { name: 'Pause motion' }).click();
  if (!(await childOne.locator('.overworld-banner').getAttribute('class'))?.includes('motion-off')) throw new Error('Motion control did not pause the scene');
  const minecraftWidth = await childOne.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  if (minecraftWidth.content > minecraftWidth.viewport) throw new Error('Minecraft theme has horizontal overflow');
  await childOne.locator('.overworld-lab summary').click();
  await childOne.screenshot({ path: path.join(qaDir, 'showcase-overworld.png') });
  await childOne.screenshot({ path: path.join(qaDir, 'minecraft-theme.png'), fullPage: true });
  await childTwo.getByLabel('Device theme').selectOption('minecraft');
  await childTwo.reload({ waitUntil: 'networkidle' });
  if (await childTwo.locator('html').getAttribute('data-theme') !== 'minecraft') throw new Error('Mobile device theme did not persist');
  await assertHeaderActions(childTwo, 'Overworld mobile');
  const mobileBannerHeight = await childTwo.locator('.overworld-banner').evaluate((element) => element.getBoundingClientRect().height);
  if (mobileBannerHeight < 220 || mobileBannerHeight > 270) throw new Error(`Mobile Overworld banner height is invalid: ${mobileBannerHeight}`);
  const minecraftMobileWidth = await childTwo.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  if (minecraftMobileWidth.content > minecraftMobileWidth.viewport) throw new Error('Minecraft mobile theme has horizontal overflow');
  await childTwo.screenshot({ path: path.join(qaDir, 'minecraft-theme-mobile.png'), fullPage: true });
  const reducedPage = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await reducedPage.goto(address, { waitUntil: 'networkidle' });
  await reducedPage.getByLabel('Device theme').selectOption('minecraft');
  const reducedAnimation = await reducedPage.locator('.overworld-animal').first().evaluate((element) => getComputedStyle(element).animationName);
  if (reducedAnimation !== 'none') throw new Error(`Reduced motion did not disable animal animation: ${reducedAnimation}`);
  await reducedPage.close();
  await childOne.getByRole('button', { name: /Review 1 pending/ }).click();
  const bulkDialog = childOne.getByRole('dialog', { name: '1 claims need a decision' });
  await bulkDialog.waitFor();
  if (!await bulkDialog.evaluate((element) => element === document.activeElement)) {
    throw new Error('Parent review dialog did not receive initial focus');
  }
  if ((await bulkDialog.locator('.bulk-review-list > article').count()) !== 1) throw new Error('Parent review did not exclude individually reviewed claims');
  const rejectedReviewItem = bulkDialog.locator('.bulk-review-list > article').filter({ hasText: 'Browser QA chore' });
  await rejectedReviewItem.getByRole('button', { name: 'Reject' }).click();
  if (await rejectedReviewItem.getByRole('button', { name: 'Reject' }).getAttribute('aria-pressed') !== 'true'
    || await rejectedReviewItem.getByRole('button', { name: 'Approve' }).getAttribute('aria-pressed') !== 'false') {
    throw new Error('Parent review decision is not exposed as a pressed state');
  }
  await rejectedReviewItem.getByLabel('Optional note').fill('Discussed during browser QA');
  await childOne.screenshot({ path: path.join(qaDir, 'bulk-approval-review.png'), fullPage: true });
  await childOne.setViewportSize({ width: 390, height: 844 });
  const bulkMobileWidth = await childOne.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  if (bulkMobileWidth.content > bulkMobileWidth.viewport) throw new Error('Bulk approval dialog has horizontal overflow on mobile');
  await childOne.screenshot({ path: path.join(qaDir, 'bulk-approval-review-mobile.png'), fullPage: true });
  await childOne.setViewportSize({ width: 1100, height: 800 });
  await bulkDialog.getByText('0 approved · 1 rejected').waitFor();
  await bulkDialog.getByRole('button', { name: 'Finish review' }).click();
  const completeDialog = childOne.getByRole('dialog', { name: 'This week is reviewed' });
  await completeDialog.waitFor();
  await completeDialog.getByRole('button', { name: 'Done' }).click();
  const approvedSummary = await (await childOne.request.get(`${address}/api/allowance`)).json() as { approvedBalanceCents: number };
  if (approvedSummary.approvedBalanceCents !== 125) throw new Error(`Independent and bulk review produced ${approvedSummary.approvedBalanceCents} cents instead of 125`);

  const remainingClaim = childOne.locator('.week-day-column.today .weeksheet-chore').filter({ hasText: 'Browser QA chore' });
  await remainingClaim.getByText('Rejected · $0 gained').waitFor();
  await remainingClaim.getByText('Discussed during browser QA').waitFor();
  const calendarSection = childOne.locator('.calendar-section');
  if (!(await calendarSection.isVisible())) await childOne.locator('.history-summary').click();
  const earnedMarker = calendarSection.locator('.calendar-day-status.earned');
  await earnedMarker.waitFor();
  if (!((await earnedMarker.textContent()) ?? '').includes('$1.25')) throw new Error('Calendar approved marker does not show $1.25');
  await earnedMarker.locator('xpath=ancestor::button').click();
  const calendarDayDialog = childOne.getByRole('dialog', { name: /Chores for/ });
  await calendarDayDialog.waitFor();
  const calendarDetailTrigger = calendarDayDialog.getByRole('button', { name: 'View details for Clear dishes' });
  await calendarDetailTrigger.click();
  const calendarChoreDialog = childOne.getByRole('dialog', { name: 'Clear dishes' });
  await calendarChoreDialog.waitFor();
  await childOne.waitForFunction(() => Boolean(document.activeElement?.closest('.chore-detail-dialog')));
  await childOne.keyboard.press('Escape');
  await calendarDayDialog.waitFor();
  await childOne.waitForFunction(() => document.activeElement?.getAttribute('data-calendar-chore-detail-id') !== null);
  await calendarDayDialog.getByRole('button', { name: 'Close day details' }).click();
  await calendarSection.locator('.calendar-day-status.missed').first().waitFor();
  await calendarSection.screenshot({ path: path.join(qaDir, 'calendar-outcome-markers.png') });
  await childOne.setViewportSize({ width: 390, height: 844 });
  const calendarMobileWidth = await calendarSection.evaluate((element) => ({ viewport: document.documentElement.clientWidth, right: element.getBoundingClientRect().right }));
  if (calendarMobileWidth.right > calendarMobileWidth.viewport) throw new Error('Calendar outcome markers cause horizontal overflow on mobile');
  await calendarSection.screenshot({ path: path.join(qaDir, 'calendar-outcome-markers-mobile.png') });
  await childOne.setViewportSize({ width: 1100, height: 800 });
  await childOne.getByRole('button', { name: 'View detailed activity' }).click();
  const activityDialog = childOne.getByRole('dialog', { name: 'Money history' });
  await activityDialog.waitFor();
  await activityDialog.getByText('Lifetime earned', { exact: true }).waitFor();
  await activityDialog.getByText('Lifetime paid', { exact: true }).waitFor();
  await activityDialog.getByText(/earned$/).first().waitFor();
  if (await activityDialog.getByText('Browser QA chore').count()) throw new Error('Rejected chores appeared in the allowance activity ledger');
  await activityDialog.screenshot({ path: path.join(qaDir, 'allowance-activity-panel.png') });
  await childOne.setViewportSize({ width: 390, height: 844 });
  const activityMobileWidth = await activityDialog.evaluate((element) => ({
    viewport: document.documentElement.clientWidth, right: element.getBoundingClientRect().right
  }));
  if (activityMobileWidth.right > activityMobileWidth.viewport) throw new Error('Money History totals overflow on mobile');
  await activityDialog.screenshot({ path: path.join(qaDir, 'allowance-activity-panel-mobile.png') });
  await childOne.setViewportSize({ width: 1100, height: 800 });
  await activityDialog.getByRole('button', { name: 'Close allowance activity' }).click();

  await childOne.getByRole('button', { name: 'Parent Mode' }).click();
  await childOne.getByRole('button', { name: 'allowance' }).click();
  await childOne.evaluate(() => Object.defineProperty(window.crypto, 'randomUUID', {
    value: undefined, configurable: true
  }));
  await childOne.getByLabel('Amount ($)').fill('0.40');
  await childOne.getByLabel('Note').fill('Browser QA payment');
  await childOne.getByRole('button', { name: 'Record payment' }).click();
  await childOne.getByText('$0.85', { exact: true }).first().waitFor();
  const firstApprovalHistory = childOne.locator('.approval-line').filter({ hasText: 'Clear dishes' }).first();
  await firstApprovalHistory.locator('summary').click();
  await firstApprovalHistory.getByRole('button', { name: 'Correct' }).click();
  await childOne.getByLabel('Corrected reward ($)').fill('0');
  await childOne.getByLabel('Reason').fill('Browser QA correction');
  await childOne.getByRole('button', { name: 'Save correction' }).click();
  await childOne.getByText('$0.00', { exact: true }).first().waitFor();
  await childOne.screenshot({ path: path.join(qaDir, 'allowance-view.png'), fullPage: true });

  const downloadPromise = childOne.waitForEvent('download');
  await childOne.getByRole('button', { name: 'Download database export' }).click();
  const download = await downloadPromise;
  if (!download.suggestedFilename().endsWith('.sqlite')) throw new Error('Database export filename is invalid');
  await childOne.getByRole('button', { name: 'Sign out' }).click();
  await childOne.getByText('Enter your parent PIN').waitFor();
  await childOne.getByRole('button', { name: 'Close Parent Mode' }).click();
  await childOne.getByLabel('Device theme').selectOption('novapay');
  if (await childOne.locator('html').getAttribute('data-theme') !== 'novapay') throw new Error('NovaPay theme did not apply');
  await assertHeaderActions(childOne, 'NovaPay desktop after theme switch');
  if (await childOne.locator('.overworld-banner').count() !== 0) throw new Error('NovaPay exposed Overworld visuals');
  await childOne.getByText('Browser QA chore', { exact: true }).first().waitFor();
  if (browserErrors.length) throw new Error(`Browser errors detected: ${browserErrors.join(' | ')}`);

  console.log(JSON.stringify({
    twoClientClaimAndUndo: 'passed',
    mobileSevenDayOverview: 'passed',
    missedUnavailablePresentation: 'passed',
    householdCalendarMonth: 'passed',
    dialogFocusContainmentAndRestoration: 'passed',
    accessibleSelectionStates: 'passed',
    refreshPersistence: 'passed',
    parentSetup: 'passed',
    oneTimeChore: 'passed',
    individualApprovalActions: 'passed',
    individualRejection: 'passed',
    independentDetailAuthorizationContinuation: 'passed',
    independentReviewBulkCoexistence: 'passed',
    independentReviewIdempotency: 'passed',
    weeklyBulkApproval: 'passed',
    partialPayment: 'passed',
    postPaymentCorrection: 'passed',
    databaseExport: 'passed',
    themeSwitching: 'passed',
    minecraftTheme: 'passed',
    deviceThemePersistence: 'passed',
    deviceThemeIsolation: 'passed',
    landscapeCrop: 'passed',
    sceneVariations: 'passed',
    animalAnimation: 'passed',
    reducedMotion: 'passed',
    calendarNavigation: 'passed',
    rejectedExcludedFromLedger: 'passed',
    activityPanel: 'passed',
    consoleAndAssets: 'passed',
    signOut: 'passed'
  }));
} finally {
  await browser.close();
  await app.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}
