import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.EX1C_QA_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDir = path.resolve('tmp/ex1c-internal-qa');
const kapScope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const kapUrl = `/?workspace=experience-twin&${kapScope}&scenario=SCENARIO-KAP-BASIC-2026&day=DAY-KAP-2026-10-31&persona=PERSONA-KAP-EMPLOYEE-FAMILY&journey=JOURNEY-KAP-PREOPEN-2026&step=STEP-KAP-PREOPEN-ARRIVAL&landmark=LANDMARK-KAP-ARRIVAL&mapMode=story&viewMode=split`;
const conferenceUrl = '/?workspace=experience-twin&project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-CONFERENCE-TEST-001&scenario=SCENARIO-CONFERENCE-FICTIONAL-01&day=DAY-CONFERENCE-FICTIONAL-01&persona=PERSONA-CONFERENCE-FICTIONAL-GUEST&journey=JOURNEY-CONFERENCE-FICTIONAL-01&step=STEP-CONFERENCE-FICTIONAL-ARRIVAL&mapMode=story&viewMode=split';

interface CaptureFact { filename: string; width: number; height: number; sha256: string }

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function capture(page: Page, facts: CaptureFact[], filename: string): Promise<void> {
  const bytes = await page.screenshot({ type: 'png', animations: 'disabled' });
  const dimensions = pngDimensions(bytes);
  await writeFile(path.join(outputDir, filename), bytes);
  facts.push({ filename, ...dimensions, sha256: createHash('sha256').update(bytes).digest('hex') });
}

async function focusScene(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: /تركيز المشهد/ });
  if (await button.isVisible()) await button.click();
  await page.getByTestId('experience-scene-viewer').waitFor();
}

async function captureResolution(page: Page, facts: CaptureFact[], width: number, height: number): Promise<void> {
  const suffix = `${width}x${height}`;
  await page.setViewportSize({ width, height });

  await page.goto(`${baseUrl}${kapUrl}`);
  await page.getByTestId('story-map-shell').waitFor();
  await capture(page, facts, `kap-four-day-persona-story-${suffix}.png`);
  await focusScene(page);
  await page.getByTestId('scene-flat-preview').waitFor();
  await capture(page, facts, `kap-flat-client-lens-${suffix}.png`);

  await page.getByTestId('scene-mode-panorama').click();
  await page.getByTestId('scene-missing-panorama').waitFor();
  await capture(page, facts, `kap-missing-360-${suffix}.png`);
  await page.getByTestId('scene-mode-web3d').click();
  await page.getByTestId('scene-missing-web3d').waitFor();
  await capture(page, facts, `kap-missing-web3d-${suffix}.png`);

  await page.goto(`${baseUrl}${kapUrl}`);
  await page.getByTestId('story-landmark-LANDMARK-KAP-AGES-CORRIDOR').click();
  await focusScene(page);
  await page.getByTestId('scene-flat-preview').waitFor();
  await capture(page, facts, `kap-story-to-scene-sync-${suffix}.png`);

  await page.getByRole('button', { name: 'عدسة الحقيقة التشغيلية' }).click();
  await page.getByRole('button', { name: 'الجاهزية' }).click();
  await capture(page, facts, `kap-operational-truth-lens-${suffix}.png`);
  await page.getByRole('button', { name: /الحقيقة والتفاصيل/ }).click();
  await capture(page, facts, `kap-scene-truth-drawer-${suffix}.png`);
  await page.getByRole('button', { name: 'إغلاق تفاصيل المشهد' }).click();

  await page.goto(`${baseUrl}${conferenceUrl}`);
  await focusScene(page);
  await page.getByTestId('scene-flat-preview').waitFor();
  await capture(page, facts, `temporary-demo-client-lens-${suffix}.png`);
  await page.getByTestId('scene-mode-panorama').click();
  await page.getByTestId('scene-panorama-surface').waitFor();
  await capture(page, facts, `temporary-demo-panorama-${suffix}.png`);
  const hotspotUrl = new URL(page.url());
  hotspotUrl.searchParams.set('hotspot', 'HOTSPOT-CONFERENCE-TO-GLB');
  await page.goto(hotspotUrl.href);
  await page.getByTestId('scene-panorama-surface').waitFor();
  await page.getByTestId('scene-hotspot-list').getByRole('button', { name: /افتح النموذج الثلاثي التقني/ }).waitFor();
  await capture(page, facts, `temporary-demo-panorama-hotspot-${suffix}.png`);
  await page.getByTestId('scene-hotspot-list').getByRole('button', { name: /افتح النموذج الثلاثي التقني/ }).click();
  await page.getByTestId('scene-web3d-surface').waitFor();
  await capture(page, facts, `temporary-demo-web3d-${suffix}.png`);
  await page.getByRole('button', { name: 'ملء الشاشة' }).click();
  await capture(page, facts, `temporary-demo-fullscreen-${suffix}.png`);
  await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
  await page.waitForFunction(() => document.fullscreenElement === null);

  await page.getByTestId('scene-comparison-select').selectOption('COMPARE-CONFERENCE-FICTIONAL-INCOMPATIBLE-POSE');
  await page.getByTestId('scene-comparison').waitFor();
  await capture(page, facts, `temporary-demo-comparison-${suffix}.png`);
  await page.getByTestId('scene-comparison-select').selectOption('');
  await page.getByRole('button', { name: /إدخال وتأليف/ }).click();
  await capture(page, facts, `scene-source-authoring-${suffix}.png`);
  await page.getByTestId('scene-authoring-panel').getByRole('button', { name: /عزل/ }).click();
  await capture(page, facts, `scene-invalid-quarantined-${suffix}.png`);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'ar-SA', timezoneId: 'Asia/Riyadh', colorScheme: 'light' });
const consoleErrors: string[] = [];
page.on('pageerror', (error) => consoleErrors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) consoleErrors.push(message.text()); });
const facts: CaptureFact[] = [];
try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }]) {
    await captureResolution(page, facts, viewport.width, viewport.height);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}${conferenceUrl}`);
  await page.getByTestId('scene-mode-web3d').click();
  await page.getByText('النموذج لا يُحمّل تلقائيًا على الهاتف').waitFor();
  await capture(page, facts, 'temporary-demo-mobile-safe-390x844.png');
} finally {
  await browser.close();
}

const duplicateHashes = facts.filter((fact, index) => facts.findIndex((candidate) => candidate.sha256 === fact.sha256) !== index);
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), classification: 'internal-ignored-qa', consoleErrors, duplicateHashes: duplicateHashes.map((item) => item.filename), screenshots: facts }, null, 2)}\n`);
if (consoleErrors.length) throw new Error(`Visual QA reported browser errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify({ outputDir, screenshotCount: facts.length, duplicateHashes: duplicateHashes.length, consoleErrors: consoleErrors.length }, null, 2));
