import type { Page } from '@playwright/test';
import { expect, test } from './test-fixtures';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const kapScope = `project=${projectId}&event=${eventId}&venue=${venueId}`;
const rehearsalUrl = `/?workspace=experience-rehearsal&${kapScope}`;
const conferenceUrl = '/?workspace=experience-rehearsal&project=PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-CONFERENCE-TEST-001';

function monitorExternalRequests(page: Page) {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'blob:') return;
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) externalRequests.push(request.url());
  });
  return externalRequests;
}

async function expectKapRehearsal(page: Page) {
  const workspace = page.getByTestId('experience-rehearsal-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-project-id', projectId);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toContainText('هذه بروفة رقمية مرشحة وليست تنفيذًا حيًا أو اعتمادًا تشغيليًا.');
  await expect(workspace).toContainText('الجاهزية: لا يمكن تحديدها');
  await expect(workspace).not.toContainText('0% جاهزية');
  await expect(workspace).not.toContainText('جاهز تشغيليًا');
}

async function createAndStart(page: Page) {
  await page.getByTestId('rehearsal-create-run').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'ready');
  await page.getByTestId('rehearsal-start').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'running');
}

test('opens from the portfolio and exposes all four source-traced days and eleven personas', async ({ page }) => {
  const externalRequests = monitorExternalRequests(page);
  await page.goto('/?workspace=portfolio');
  const card = page.getByTestId(`project-card-${projectId}`);
  await expect(card.getByTestId('experience-rehearsal-open')).toContainText('قيادة البروفة الرقمية');
  await card.getByTestId('experience-rehearsal-open').click();
  await expectKapRehearsal(page);
  await expect(page).toHaveURL(/workspace=experience-rehearsal/);

  const daySelect = page.getByTestId('rehearsal-day-select');
  await expect(daySelect.locator('option')).toHaveCount(4);
  const expectedCounts: Record<string, number> = {
    'DAY-KAP-2026-10-31': 9,
    'DAY-KAP-2026-11-01': 11,
    'DAY-KAP-2026-11-02': 11,
    'DAY-KAP-2026-11-03': 14
  };
  for (const [dayId, momentCount] of Object.entries(expectedCounts)) {
    await daySelect.selectOption(dayId);
    await expect(page.locator('.rehearsal-sequence button')).toHaveCount(momentCount);
    await expect(page.getByTestId('rehearsal-persona-select').locator('option')).toHaveCount(11);
    await expect(page).toHaveURL(new RegExp(`rehearsalDay=${dayId}`));
  }

  await page.getByTestId('rehearsal-persona-select').selectOption({ label: 'فريق المراسم' });
  await expect(page).toHaveURL(/rehearsalPersona=.*PROTOCOL/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(externalRequests).toEqual([]);
});

test('runs the complete Day 1 lifecycle, records rehearsal-only findings and derives reviewed learning', async ({ page }) => {
  const externalRequests = monitorExternalRequests(page);
  await page.goto(rehearsalUrl);
  await expectKapRehearsal(page);
  await createAndStart(page);

  await page.getByTestId('rehearsal-pause').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'paused');
  const pausedUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(pausedUrl);
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'paused');
  await page.getByTestId('rehearsal-resume').click();

  await page.getByTestId('rehearsal-note').fill('ملاحظة بروفة محلية لا تثبت التنفيذ.');
  await page.getByTestId('rehearsal-record-observation').click();
  await expect(page.getByTestId('rehearsal-note')).toHaveValue('');
  await page.getByTestId('rehearsal-note').fill('مسألة تحتاج قرارًا ومصدرًا وسلطة.');
  await page.getByTestId('rehearsal-record-issue').click();
  await page.getByTestId('rehearsal-note').fill('مسودة قرار من سياق البروفة فقط.');
  await page.getByTestId('rehearsal-create-decision').click();
  await expect(page.getByTestId('rehearsal-governed-context')).toContainText('المسودة لا تُعتمد تلقائيًا');

  await page.getByTestId('rehearsal-contingency-select').selectOption({ label: 'تأخر وصول الشخصية' });
  await page.getByTestId('rehearsal-activate-contingency').click();
  await expect(page.getByTestId('rehearsal-return-primary')).toBeVisible();
  await page.getByTestId('rehearsal-return-primary').click();
  await expect(page.getByTestId('rehearsal-return-primary')).toHaveCount(0);

  const moments = page.locator('.rehearsal-sequence button');
  await expect(moments).toHaveCount(9);
  for (let index = 0; index < 9; index += 1) {
    await page.getByTestId('rehearsal-complete-moment').click();
    if (index < 8) await page.getByTestId('rehearsal-next').click();
  }
  await expect(page.getByTestId('rehearsal-current-moment')).toContainText('المغادرة');
  await page.getByTestId('rehearsal-complete-run').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'completed');

  await page.getByTestId('rehearsal-view-after-action').click();
  await expect(page.getByTestId('rehearsal-after-action')).toContainText('9');
  await page.getByRole('button', { name: 'اشتقاق تعلم اليوم' }).click();
  await expect(page.getByTestId('rehearsal-after-action')).toContainText('تعلم اليوم');
  await expect(page.getByTestId('rehearsal-after-action')).toContainText('لا يغيّر اليوم التالي أو الخط الأساسي');

  await page.getByTestId('rehearsal-view-command').click();
  await page.getByTestId('rehearsal-replay-run').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'ready');
  await expect(page).toHaveURL(/rehearsalRun=REHEARSAL-RUN-002/);
  expect(externalRequests).toEqual([]);
});

test('supports Day 2 ceremonial review without inventing operations, transport time, or route', async ({ page }) => {
  const externalRequests = monitorExternalRequests(page);
  await page.goto(rehearsalUrl);
  await expectKapRehearsal(page);
  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-11-01');
  await expect(page.getByTestId('rehearsal-site-select').locator('option')).toHaveCount(3);
  await expect(page.getByTestId('rehearsal-day-select').locator('option:checked')).toContainText('التدشين الملكي');
  await expect(page.locator('.rehearsal-attendance')).toContainText('غير معروف');

  await page.getByTestId('rehearsal-site-select').selectOption('SITE-CANDIDATE-KAP-AWJA');
  await expect(page).toHaveURL(/rehearsalSite=SITE-CANDIDATE-KAP-AWJA/);
  await page.getByTestId('rehearsal-site-select').selectOption('SITE-CANDIDATE-KAP-GARDENS');
  await expect(page).toHaveURL(/rehearsalSite=SITE-CANDIDATE-KAP-GARDENS/);

  const correction = page.locator('.rehearsal-sequence button').filter({ hasText: 'لا رحلة تشغيلية في 1 نوفمبر' });
  await expect(correction).toHaveCount(1);
  await correction.click();
  await expect(page.getByTestId('rehearsal-current-moment')).toContainText('لا رحلة تشغيلية');
  await expect(page.getByTestId('rehearsal-story-map')).toContainText('تسلسل محتوى احتفالي بلا رحلة أو انتقال مشترك');
  await expect(page.getByTestId('story-map-journey-not-applicable-20261101')).toBeVisible();
  await expect(page.getByTestId('story-map-dual-site-transition')).toHaveCount(0);
  const transition = page.locator('.rehearsal-sequence button').filter({ hasText: 'انتقال مرشح بين قصر العوجا وحدائق الملك عبدالله' });
  await expect(transition).toHaveCount(0);
  await expect(page.getByTestId('rehearsal-story-map')).not.toContainText('انتقال متعدد المواقع');
  await expect(page.getByTestId('rehearsal-story-map')).not.toContainText('دقيقة');
  await expect(page.getByTestId('rehearsal-day-no-operational-contingencies')).toContainText('أي نشاط إنتاجي مستقبلي يحتاج مصدرًا مستقلًا معتمدًا');
  await expect(page.getByTestId('rehearsal-contingency-select')).toHaveCount(0);
  await expect(page.getByTestId('rehearsal-activate-contingency')).toHaveCount(0);
  expect(externalRequests).toEqual([]);
});

test('keeps Story Map and scene surfaces synchronized with honest missing-source states', async ({ page }) => {
  const externalRequests = monitorExternalRequests(page);
  await page.goto(rehearsalUrl);
  await expectKapRehearsal(page);

  await page.getByTestId('rehearsal-view-story-map').click();
  await expect(page.getByTestId('story-map-shell')).toBeVisible();
  await page.getByTestId('story-landmark-LANDMARK-KAP-AGES-CORRIDOR').click();
  await expect(page).toHaveURL(/rehearsalMoment=.*AGES/);

  await page.getByTestId('rehearsal-view-scene').click();
  const scene = page.getByTestId('experience-scene-viewer');
  await expect(scene).toBeVisible();
  await page.getByTestId('scene-mode-panorama').click();
  await expect(page.getByTestId('scene-missing-panorama')).toContainText('مشاهد 360° قيد التسليم من استوديو التصميم');
  await expect(page.getByTestId('scene-panorama-surface')).toHaveCount(0);
  await page.getByTestId('scene-mode-web3d').click();
  await expect(page.getByTestId('scene-web3d-surface')).toHaveAttribute('data-model-ready', 'true', { timeout: 20_000 });
  await expect(page.getByTestId('design-scene-lens-context')).toContainText('مشتق تشخيصي مرشح');
  await expect(page.locator('.rehearsal-scene-context')).toContainText('للقراءة فقط');

  await page.getByTestId('rehearsal-view-command').click();
  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-11-01');
  const unresolved = page.locator('.rehearsal-sequence button').filter({ hasText: 'الكلمة الرسمية' });
  await unresolved.click();
  await expect(page.getByTestId('rehearsal-story-map')).toContainText('تسلسل محتوى احتفالي بلا رحلة أو انتقال مشترك');
  await expect(page.getByTestId('story-map-unresolved-list')).toContainText('لا توجد مرساة أو نقطة بديلة');
  await expect(page.locator('.story-map-route')).toHaveCount(0);
  await expect(page.getByTestId('rehearsal-story-map')).toContainText('معالم بلا موضع مرشح');
  await expect(page.getByTestId('rehearsal-story-map')).not.toContainText('انتقال متعدد المواقع');
  expect(externalRequests).toEqual([]);
});

test('restores URL history and fails closed for unknown day, persona, run and foreign event', async ({ page }) => {
  await page.goto(rehearsalUrl);
  await expectKapRehearsal(page);
  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-11-02');
  await page.getByTestId('rehearsal-day-select').selectOption('DAY-KAP-2026-11-03');
  await page.goBack();
  await expect(page.getByTestId('rehearsal-day-select')).toHaveValue('DAY-KAP-2026-11-02');
  await page.goForward();
  await expect(page.getByTestId('rehearsal-day-select')).toHaveValue('DAY-KAP-2026-11-03');
  await page.reload();
  await expect(page.getByTestId('rehearsal-day-select')).toHaveValue('DAY-KAP-2026-11-03');

  await page.goto(`${rehearsalUrl}&rehearsalDay=DAY-UNKNOWN`);
  await expect(page.getByTestId('experience-rehearsal-route-rejected')).toContainText('لم يُستخدم بديل تلقائي');
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveCount(0);
  await page.goto(`${rehearsalUrl}&rehearsalPersona=PERSONA-UNKNOWN`);
  await expect(page.getByTestId('experience-rehearsal-route-rejected')).toContainText('لم يُستخدم بديل تلقائي');
  await page.goto(`${rehearsalUrl}&rehearsalRun=RUN-UNKNOWN`);
  await expect(page.getByTestId('experience-rehearsal-route-rejected')).toContainText('لم يُستخدم تشغيل بديل');

  await page.goto('/?workspace=experience-rehearsal&project=PROJECT-KAP-OPENING-2026&event=EVENT-CONFERENCE-TEST-001&venue=VENUE-KAP-001');
  await expect(page.getByTestId('neutral-launcher')).toBeVisible();
  await expect(page.getByTestId('portfolio-context-message')).toContainText('لا تنتمي إلى المشروع');
});

test('renders the same generic engine for a fictional project with no KAP leakage', async ({ page }) => {
  await page.goto(conferenceUrl);
  const workspace = page.getByTestId('experience-rehearsal-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('data-project-id', 'PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001');
  const text = await workspace.innerText();
  expect(text).not.toContain('KAP');
  expect(text).not.toContain('حدائق الملك عبدالله');
  expect(text).not.toContain('ENTITY-KAP');
  await expect(workspace).toContainText('خيالي');

  await page.getByTestId('rehearsal-view-scene').click();
  await expect(page.getByTestId('experience-scene-viewer')).toBeVisible();
  await page.getByTestId('scene-mode-panorama').click();
  await expect(page.getByTestId('scene-panorama-surface')).toBeVisible();
  await expect(page.getByTestId('scene-technical-fixture-label')).toContainText('خيالي للاختبار');
  await page.getByTestId('scene-mode-web3d').click();
  await expect(page.getByTestId('scene-web3d-surface')).toBeVisible();
  await expect(workspace).not.toContainText('ENTITY-KAP');
});

test('blocks, unblocks, aborts and resets a local run without changing governed truth', async ({ page }) => {
  await page.goto(rehearsalUrl);
  await expectKapRehearsal(page);
  await createAndStart(page);

  await page.getByTestId('rehearsal-reason').fill('حجب بروفة محلية لا يغيّر الجاهزية أو الخط الأساسي.');
  await page.getByTestId('rehearsal-block').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'blocked');
  await expect(page.getByTestId('rehearsal-unblock')).toBeVisible();
  await page.getByTestId('rehearsal-unblock').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'paused');

  await page.getByTestId('rehearsal-resume').click();
  await page.getByTestId('rehearsal-reason').fill('إلغاء تشغيل الاختبار دون ادعاء تنفيذ ميداني.');
  await page.getByTestId('rehearsal-abort-run').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'aborted');
  await expect(page.getByTestId('rehearsal-view-after-action')).toBeVisible();

  await page.getByTestId('rehearsal-reset-run').click();
  await expect(page.getByTestId('experience-rehearsal-workspace')).toHaveAttribute('data-run-state', 'not-started');
  await expect(page).not.toHaveURL(/rehearsalRun=/);
  await expect(page.getByTestId('experience-rehearsal-workspace')).toContainText('الجاهزية: لا يمكن تحديدها');
});

test('keeps the command map usable at the active resolution and provides safe client presentation and keyboard escape', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(rehearsalUrl);
  await expectKapRehearsal(page);
  const map = page.getByTestId('rehearsal-story-map');
  const box = await map.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(300);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(600);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  await page.getByTestId('rehearsal-view-client-presentation').click();
  const presentation = page.getByTestId('rehearsal-client-presentation');
  await expect(presentation).toContainText('رؤية مرشحة لأربعة أيام');
  await expect(presentation).toContainText('الجاهزية التشغيلية: لا يمكن تحديدها');
  await expect(presentation).toContainText('المسارات والهندسة: غير معتمدة');
  const clientMoment = presentation.locator('button[aria-current="step"]');
  await expect(clientMoment).toHaveCount(1);
  await clientMoment.focus();
  await clientMoment.press('Escape');
  await expect(page.getByTestId('rehearsal-view-command')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('rehearsal-view-story-map').click();
  const frame = page.getByTestId('story-map-frame');
  await frame.focus();
  await frame.press('+');
  await frame.press('ArrowLeft');
  await frame.press('0');
  await expect(page.getByTestId('story-map-shell')).toBeVisible();
});
