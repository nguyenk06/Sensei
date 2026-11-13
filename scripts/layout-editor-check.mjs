import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.LAYOUT_EDITOR_URL || "http://127.0.0.1:4174/tools/living-overworld-editor/";
const screenshot = path.resolve("docs/assets/screenshots/living-overworld-layout-editor.png");
const importScreenshot = path.resolve("docs/assets/screenshots/living-overworld-layout-editor-planner-import.png");
await fs.mkdir(path.dirname(screenshot), { recursive: true });

const executablePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.editorReady === "true");

  const plannerUiDocument = {
    format: "sensei-living-overworld-planner-import",
    schemaVersion: 1,
    layoutName: "UI planner preview",
    referenceCanvas: { width: 1920, height: 300 },
    instances: [{ assetId: "autumn.rock", displayLabel: "Planner rock", x: 700, y: 270, placementAnchor: "bottom-center", scale: 0.2 }],
  };
  await page.locator("#open-planner-import").click();
  await page.locator("#planner-import-json").fill(JSON.stringify(plannerUiDocument));
  await page.locator("#preview-planner-import").click();
  assert.equal(await page.locator("#apply-planner-import").isEnabled(), true, "planner import preview did not enable reviewed application");
  assert.equal(await page.evaluate(async () => (await fetch("/tools/living-overworld-editor/planner-starter/living-overworld-planner-starter-v1.zip")).ok), true, "planner starter package is not downloadable");
  await page.screenshot({ path: importScreenshot, fullPage: true });
  await page.locator("#close-planner-import").click();

  const result = await page.evaluate(() => {
    const api = window.editorApi;
    const initial = api.getState();
    const lockedInitial = initial.instances.length > 0 && initial.instances.every((item) => item.locked);
    const initialLockedCount = initial.instances.filter((item) => item.locked).length;
    const plannerDocument = {
      format: "sensei-living-overworld-planner-import", schemaVersion: 1,
      layoutName: "Automated planner pass", referenceCanvas: { width: 1920, height: 300 }, plannerNotes: "QA planner pass",
      instances: [{ id: "planner-rock-1", assetId: "autumn.rock", displayLabel: "Planner rock", x: 777, y: 266, placementAnchor: "bottom-center", scale: 0.15 }],
    };
    const plannerPreview = api.previewPlannerImport(plannerDocument, "replace-editable");
    const lockedId = initial.instances[0].id;
    const blockedPlannerPreview = api.previewPlannerImport({ ...plannerDocument, instances: [{ ...plannerDocument.instances[0], id: lockedId }] }, "merge");
    api.applyPlannerImport(plannerDocument, "replace-editable");
    const plannerState = api.getState();
    const plannerImportCorrect = plannerPreview.valid && !blockedPlannerPreview.valid && plannerState.instances.filter((item) => item.locked).length === initialLockedCount && plannerState.instances.some((item) => item.id === "planner-rock-1") && plannerState.plannerImport?.plannerNotes === "QA planner pass";
    api.reset();
    const collisionDocument = { ...plannerDocument, instances: [
      { assetId: "autumn.rock", x: 600, y: 260 },
      { id: "inst-0001", assetId: "autumn.bush", x: 650, y: 265 },
    ] };
    api.applyPlannerImport(collisionDocument, "replace-editable");
    const collisionIds = api.getState().instances.filter((item) => !item.locked).map((item) => item.id);
    const plannerGeneratedIdsUnique = new Set(collisionIds).size === collisionIds.length;
    api.reset();
    const copies = Array.from({ length: 4 }, (_, index) => api.addAsset("autumn.tree", { x: 250 + index * 100, y: 250, locked: false }));
    const ids = copies.map((item) => item.id);
    const untouchedBefore = api.getState().instances.find((item) => item.id === ids[1]);
    const changed = api.update(ids[0], { x: 425, y: 210, scale: 0.31, rotation: 17, flipX: true });
    const untouchedAfter = api.getState().instances.find((item) => item.id === ids[1]);
    const independent = JSON.stringify(untouchedBefore) === JSON.stringify(untouchedAfter);
    const orderBefore = api.getState().instances.map((item) => item.id);
    const reordered = api.reorder(ids[0], "back");
    const orderAfter = api.getState().instances.map((item) => item.id);
    api.update(ids[0], { locked: true });
    const blocked = api.update(ids[0], { x: 9999 }) === false;
    api.update(ids[1], { placeholder: true, notes: "Future red maple replacement" });

    const hill = api.addAsset("autumn.unified-hill", { x: 900, y: 250, scale: 0.2, rotation: 12, flipX: true, locked: false, anchor: "bottom-center" });
    const reportedAnchor = api.worldAnchor(hill.id, "H-WATERFALL-SOURCE");
    const source = [2142, 116], origin = [1922, 724], radians = 12 * Math.PI / 180;
    const dx = -(source[0] - origin[0]) * 0.2, dy = (source[1] - origin[1]) * 0.2;
    const expectedAnchor = [Number((900 + dx * Math.cos(radians) - dy * Math.sin(radians)).toFixed(2)), Number((250 + dx * Math.sin(radians) + dy * Math.cos(radians)).toFixed(2))];
    const anchorCorrect = reportedAnchor.every((value, index) => Math.abs(value - expectedAnchor[index]) < 0.02);

    const serialized = api.serialize();
    const parsed = JSON.parse(serialized);
    const order = parsed.instances.map((item) => item.id);
    api.reset();
    api.load(parsed);
    const restored = api.getState();
    const persistenceCorrect = JSON.stringify(restored.instances.map((item) => item.id)) === JSON.stringify(order) && restored.instances.find((item) => item.id === ids[1])?.placeholder === true;
    const exported = api.exportLayout();
    api.reset();
    api.load(exported);
    const importExportCorrect = api.getState().instances.length === exported.instances.length && exported.assets.length > 0;
    const mobile = [360, 390, 430].map((width) => api.mobileTransform(ids[1], width));
    const mobileCorrect = mobile.every((item) => !item.hidden && [item.x, item.y, item.scale].every(Number.isFinite));
    return { lockedInitial, plannerImportCorrect, plannerGeneratedIdsUnique, ids, unique: new Set(ids).size === 4, changed, independent, reordered, orderChanged: JSON.stringify(orderBefore) !== JSON.stringify(orderAfter), blocked, anchorCorrect, expectedAnchor, reportedAnchor, persistenceCorrect, importExportCorrect, mobileCorrect };
  });

  for (const [key, value] of Object.entries(result)) {
    if (["ids", "expectedAnchor", "reportedAnchor"].includes(key)) continue;
    assert.equal(value, true, `${key} workflow failed`);
  }
  await page.waitForTimeout(250);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#restore-banner").waitFor({ state: "visible" });
  await page.locator("#restore-autosave").click();
  const restoredAfterRefresh = await page.evaluate((id) => {
    const state = window.editorApi.getState();
    window.editorApi.select(id);
    return state.instances.some((item) => item.id === id);
  }, result.ids[1]);
  assert.equal(restoredAfterRefresh, true, "browser autosave restoration failed");
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log(JSON.stringify({ ...result, restoredAfterRefresh, screenshot, importScreenshot }, null, 2));
} finally {
  await browser.close();
}
