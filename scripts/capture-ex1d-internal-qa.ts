import { chromium, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.EX1D_QA_BASE_URL ?? 'http://127.0.0.1:4173';
const outputDir = path.resolve('tmp/ex1d-internal-qa');
const kapScope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const kapUrl = `/?workspace=experience-rehearsal&${kapScope}`;

interface CaptureFact {
  filename: string;
  width: number;
  height: number;
  sha256: string;
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function capture(page: Page, facts: CaptureFact[], filename: string): Promise<void> {
  const bytes = await page.screenshot({ type: 'png', animations: 'disabled' });
  await writeFile(path.join(outputDir, filename), bytes);
  facts.push({ filename, ...pngDimensions(bytes), sha256: createHash('sha256').update(bytes).digest('hex') });
}

async function openCleanWorkspace(page: Page): Promise<void> {
  await page.goto(`${baseUrl}${kapUrl}`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByTestId('experience-rehearsal-workspace').waitFor();
}

async function captureResolution(page: Page, facts: CaptureFact[], width: number, height: number): Promise<void> {
  const suffix = `${width}x${height}`;
  await page.setViewportSize({ width, height });
  await openCleanWorkspace(page);

  await capture(page, facts, `day1-command-current-next-controls-timeline-${suffix}.png`);

  await page.getByTestId('rehearsal-view-story-map').click();
  await page.getByTestId('story-map-shell').waitFor();
  await page.getByTestId('story-landmark-LANDMARK-KAP-AGES-CORRIDOR').click();
  await capture(page, facts, `story-map-synchronized-${suffix}.png`);

  await page.getByTestId('rehearsal-view-scene').click();
  await page.getByTestId('experience-scene-viewer').waitFor();
  await page.getByTestId('scene-mode-panorama').click();
  await page.getByTestId('scene-missing-panorama').waitFor();
  await capture(page, facts, `scene-sync-honest-missing-immersive-source-${suffix}.png`);

  await page.getByTestId('rehearsal-view-command').click();
  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-11-01');
  await page.getByTestId('rehearsal-site-select').selectOption('SITE-CANDIDATE-KAP-AWJA');
  await capture(page, facts, `day2-multi-site-unknown-transport-${suffix}.png`);

  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-11-02');
  await page.getByTestId('rehearsal-persona-select').selectOption({ label: 'فريق المراسم' });
  await capture(page, facts, `day3-protocol-persona-${suffix}.png`);

  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-11-03');
  await page.getByTestId('rehearsal-persona-select').selectOption({ label: 'ممثل إعلامي' });
  await capture(page, facts, `day4-media-persona-${suffix}.png`);

  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-10-31');
  await page.getByTestId('rehearsal-create-run').click();
  await page.getByTestId('rehearsal-start').click();
  await page.getByTestId('rehearsal-contingency-select').selectOption({ label: 'تأخر وصول الشخصية' });
  await page.getByTestId('rehearsal-activate-contingency').click();
  await page.getByTestId('rehearsal-return-primary').waitFor();
  await capture(page, facts, `delayed-arrival-contingency-${suffix}.png`);
  await page.getByTestId('rehearsal-return-primary').click();

  await page.getByTestId('rehearsal-reason').fill('حجب داخل البروفة للمراجعة المرئية فقط.');
  await page.getByTestId('rehearsal-block').click();
  await page.getByTestId('rehearsal-unblock').waitFor();
  await capture(page, facts, `blocked-moment-${suffix}.png`);
  await page.getByTestId('rehearsal-unblock').click();

  await page.getByTestId('rehearsal-note').fill('مسألة بروفة مرشحة تحتاج قرارًا ومصدرًا وسلطة.');
  await page.getByTestId('rehearsal-create-decision').click();
  await capture(page, facts, `decision-draft-readonly-governed-context-${suffix}.png`);

  await page.getByTestId('rehearsal-reason').fill('إنهاء تشغيل QA داخلي دون ادعاء تنفيذ.');
  await page.getByTestId('rehearsal-abort-run').click();
  await page.getByTestId('rehearsal-view-after-action').click();
  await capture(page, facts, `after-action-review-${suffix}.png`);
  await page.getByRole('button', { name: 'اشتقاق تعلم اليوم' }).click();
  await capture(page, facts, `daily-learning-next-day-proposal-${suffix}.png`);

  await page.getByTestId('rehearsal-view-comparison').click();
  await page.getByTestId('rehearsal-day-comparison').waitFor();
  await capture(page, facts, `four-day-comparison-${suffix}.png`);

  await page.getByTestId('rehearsal-view-client-presentation').click();
  await page.getByTestId('rehearsal-client-presentation').waitFor();
  await capture(page, facts, `client-presentation-candidate-truth-${suffix}.png`);

  await page.getByTestId('rehearsal-view-command').click();
  await page.getByLabel('العدسة').selectOption('source-truth');
  await capture(page, facts, `source-truth-lens-${suffix}.png`);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const facts: CaptureFact[] = [];
const consoleErrors: string[] = [];
const externalRequests: string[] = [];

try {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1080 }]) {
    const context = await browser.newContext({ locale: 'ar-SA', timezoneId: 'Asia/Riyadh', colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol) && !['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
    });
    await captureResolution(page, facts, viewport.width, viewport.height);
    await context.close();
  }
} finally {
  await browser.close();
}

const duplicateHashes = facts.filter((fact, index) => facts.findIndex((candidate) => candidate.sha256 === fact.sha256) !== index);
const manifest = {
  generatedAt: new Date().toISOString(),
  classification: 'internal-ignored-qa',
  founderReviewArtifact: false,
  consoleErrors,
  externalRequests,
  duplicateHashes: duplicateHashes.map((item) => item.filename),
  screenshots: facts
};
await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
if (consoleErrors.length) throw new Error(`Visual QA reported browser errors: ${consoleErrors.join(' | ')}`);
if (externalRequests.length) throw new Error(`Visual QA reported external requests: ${externalRequests.join(' | ')}`);
console.log(JSON.stringify({ outputDir, screenshotCount: facts.length, duplicateHashes: duplicateHashes.length, consoleErrors: 0, externalRequests: 0 }, null, 2));
