import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const bundleName = 'mayadeen-stage-3g1a-final-integrity-closure-review';
const reviewRoot = process.env.STAGE3G1A_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packUrl = `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;
const manifestPattern = '**/*kap-operational-readiness-pack-candidate-v1*.json*';

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        })));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  });
  await page.waitForTimeout(120);
}

async function capture(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[]
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required for review capture.');
  await settle(page);
  const destination = path.join(directory, file);
  await page.screenshot({ path: destination, fullPage: false, animations: 'disabled', caret: 'hide' });
  const bytes = await readFile(destination);
  records.push({
    file,
    state,
    width: viewport.width,
    height: viewport.height,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}

async function captureFocused(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[],
  testId: string
) {
  const subject = page.getByTestId(testId);
  await subject.scrollIntoViewIfNeeded();
  const previousStyle = await subject.getAttribute('style');
  await subject.evaluate((element) => {
    element.style.outline = '4px solid #c06b32';
    element.style.outlineOffset = '6px';
  });
  await capture(page, directory, file, state, records);
  await subject.evaluate((element, style) => {
    if (style === null) element.removeAttribute('style');
    else element.setAttribute('style', style);
  }, previousStyle);
}

async function openPack(page: Page, view = 'summary') {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toBeVisible();
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toHaveAttribute('dir', 'rtl');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

test('captures thirteen distinct Stage 3G.1A integrity-review states', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await openPack(page);
  await capture(page, directory, '01-corrected-executive-summary.png', 'Corrected executive summary', records);
  await captureFocused(
    page,
    directory,
    '02-corrected-preparation-percentage.png',
    'Derived 61.7 percent preparation metric',
    records,
    'pack-preparation-completeness'
  );

  await page.getByTestId('readiness-pack-view-workstreams').click();
  await captureFocused(
    page,
    directory,
    '03-complete-governance-conflicts.png',
    'Five source-derived governance conflicts',
    records,
    'governance-conflict-register'
  );
  await captureFocused(
    page,
    directory,
    '04-execution-candidate-comparison.png',
    'Unresolved execution candidate comparison',
    records,
    'execution-candidate-comparison'
  );

  await page.getByTestId('readiness-pack-view-eligibility').click();
  await captureFocused(
    page,
    directory,
    '05-pre-freeze-blockers.png',
    'Pre-freeze blocker group',
    records,
    'pre-freeze-gate-group'
  );
  await captureFocused(
    page,
    directory,
    '06-pre-activation-blockers.png',
    'Pre-activation blocker group',
    records,
    'pre-activation-gate-group'
  );

  await page.getByTestId('readiness-pack-view-authorities').click();
  await capture(page, directory, '07-missing-critical-authorities.png', 'Nine configured authority gaps', records);

  await page.getByTestId('readiness-pack-view-sources').click();
  await capture(page, directory, '08-source-lineage-verified.png', 'Verified source revisions and lineage', records);

  await page.route(manifestPattern, async (route) => {
    const response = await route.fetch();
    const candidate = await response.json();
    candidate.sourceRegistry[0].observedSha256 = '0'.repeat(64);
    await route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(candidate) });
  });
  await page.goto(`${packUrl}&readinessPackView=sources`);
  await expect(page.getByTestId('readiness-pack-source-quarantine')).toBeVisible();
  await capture(page, directory, '09-source-mismatch-quarantined.png', 'Source mismatch quarantined', records);
  await page.unroute(manifestPattern);

  await page.route(manifestPattern, async (route) => {
    const response = await route.fetch();
    const candidate = await response.json();
    candidate.activationStatus = 'activated';
    candidate.operationalReadiness = 'verified-ready';
    await route.fulfill({ response, contentType: 'application/json', body: JSON.stringify(candidate) });
  });
  await page.goto(`${packUrl}&readinessPackView=summary`);
  await expect(page.getByTestId('readiness-pack-trust-rejection')).toBeVisible();
  await capture(page, directory, '10-state-tampering-rejected.png', 'Lifecycle state tampering rejected', records);
  await page.unroute(manifestPattern);

  await openPack(page, 'requirements');
  await page.getByTestId('readiness-pack-requirement-REQ-KAP-GOV-STRATEGIC-OBJECTIVE').click();
  await page.getByTestId('candidate-edit-open').click();
  await page.getByLabel('تعريف الإكمال المرشح').fill(
    'إصدار موثق مع سجل مراجعة واعتماد تسليم، دون ادعاء إنجاز ميداني.'
  );
  await page.getByLabel('سبب التغيير الإلزامي').fill('إثبات مراجعة عميقة غير قابلة للكتابة فوقها.');
  await page.getByTestId('candidate-edit-preview').click();
  await page.getByTestId('candidate-edit-apply').click();
  await page.getByTestId('readiness-pack-view-eligibility').click();
  await captureFocused(
    page,
    directory,
    '11-deep-immutable-revision-history.png',
    'Deep immutable revision history',
    records,
    'readiness-pack-eligibility-view'
  );

  const fictional = {
    title: 'حزمة جاهزية مؤتمر ألفا الخيالي',
    description: 'حزمة اختبار خيالية لا تمثل فعالية تشغيلية.',
    projectId: 'PROJECT-CONFERENCE-ALPHA-FICTIONAL',
    revision: 1,
    requirementCount: 24,
    packStatus: 'candidate',
    identityBoundaryAr: 'كل الهويات خيالية ومخصصة لاختبار عزل التهيئة.',
    contentHash: createHash('sha256')
      .update('PROJECT-CONFERENCE-ALPHA-FICTIONAL:READINESS-PACK:REVISION-1')
      .digest('hex')
  };
  const fictionalHtml = `<!doctype html>
    <html lang="ar" dir="rtl">
      <head><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;background:#f3efe7;color:#17211d;font-family:"IBM Plex Sans Arabic","Noto Sans Arabic",sans-serif}
        main{min-height:100vh;padding:44px;background:radial-gradient(circle at 15% 15%,#d9eadf 0,transparent 32%),linear-gradient(135deg,#f9f5ec,#e7eee8)}
        header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1f5948;padding-bottom:22px}
        .flag{padding:9px 14px;background:#1f5948;color:#fff;border-radius:4px;font-weight:800}
        h1{font-size:clamp(28px,4vw,58px);margin:10px 0}.sub{font-size:18px;color:#49625a}
        .grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:18px;margin-top:28px}
        article{background:#fffdf8;border:1px solid #c9d3ca;border-radius:10px;padding:24px;box-shadow:0 14px 34px #24423718}
        article span{font-size:13px;color:#66786f}article strong{display:block;font-size:24px;margin-top:10px}
        .truth{border-top:5px solid #b35f32}.isolation{border-top:5px solid #1f5948}.hash{direction:ltr;font:12px ui-monospace;word-break:break-all}
        footer{margin-top:24px;padding:18px;border:1px dashed #7f9388;background:#ffffffa8;font-size:16px}
      </style></head>
      <body><main>
        <header><div><span>اختبار المحرك العام</span><h1>${escapeHtml(fictional.title)}</h1>
        <p class="sub">${escapeHtml(fictional.description)}</p></div><div class="flag">هوية اختبار خيالية</div></header>
        <section class="grid">
          <article class="truth"><span>الجاهزية التشغيلية</span><strong>لا يمكن التحديد</strong><p>لا توجد ترقية أو نتيجة تشغيلية.</p></article>
          <article><span>المشروع</span><strong>${escapeHtml(fictional.projectId)}</strong></article>
          <article><span>المراجعة</span><strong>R${fictional.revision}</strong></article>
          <article class="isolation"><span>عزل التهيئة</span><strong>${escapeHtml(fictional.identityBoundaryAr)}</strong></article>
          <article><span>عدد المتطلبات</span><strong>${fictional.requirementCount}</strong></article>
          <article><span>حالة الحزمة</span><strong>${escapeHtml(fictional.packStatus)}</strong></article>
        </section>
        <footer><b>إثبات العزل:</b> نفس عقود الحزمة والاشتقاق، دون هوية مشروع حقيقي أو فرع خاص في Core.
        <div class="hash">${escapeHtml(fictional.contentHash)}</div></footer>
      </main></body>
    </html>`;
  expect(fictionalHtml).not.toMatch(/KAP|حدائق الملك عبدالله|أحمد|محمد إبراهيم|جوزيف حداد/);
  await page.setContent(fictionalHtml, { waitUntil: 'load' });
  await capture(page, directory, '12-non-kap-generic-fixture.png', 'Non-KAP generic package fixture', records);

  await openPack(page, 'eligibility');
  await capture(page, directory, '13-full-integrity-workspace.png', 'Full readiness-pack integrity workspace', records);

  expect(records).toHaveLength(13);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every((record) => record.width === viewport.width && record.height === viewport.height)).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.1A',
    projectId,
    eventId,
    venueId,
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint: '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc',
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
