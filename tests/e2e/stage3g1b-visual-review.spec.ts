import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page, type Route } from '@playwright/test';
import type {
  OperationalAuthorityNotApplicableDeclaration,
  OperationalReadinessPack
} from '../../src/types/operationalReadinessPack';

const bundleName = 'mayadeen-stage-3g1b-authority-contract-integrity-review';
const reviewRoot = process.env.STAGE3G1B_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packFingerprint = '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc';
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
  await page.waitForTimeout(100);
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
  await page.screenshot({
    path: destination,
    fullPage: false,
    animations: 'disabled',
    caret: 'hide'
  });
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
    element.style.outlineOffset = '5px';
  });
  await capture(page, directory, file, state, records);
  await subject.evaluate((element, style) => {
    if (style === null) element.removeAttribute('style');
    else element.setAttribute('style', style);
  }, previousStyle);
}

async function openPack(page: Page, view: string) {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  const workspace = page.getByTestId('operational-readiness-pack-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
}

async function mutateManifest(
  route: Route,
  mutator: (candidate: OperationalReadinessPack) => void
) {
  const response = await route.fetch();
  const candidate = await response.json() as OperationalReadinessPack;
  mutator(candidate);
  await route.fulfill({
    response,
    contentType: 'application/json',
    body: JSON.stringify(candidate)
  });
}

async function captureAuthorityRejection(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[],
  mutator: (candidate: OperationalReadinessPack) => void
) {
  await page.route(manifestPattern, (route) => mutateManifest(route, mutator));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  const rejection = page.getByTestId('readiness-pack-authority-contract-rejection');
  await expect(rejection).toBeVisible();
  await expect(rejection).not.toContainText('authority-contract-');
  await capture(page, directory, file, state, records);
  await page.unroute(manifestPattern);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

test('captures ten distinct Stage 3G.1B authority-contract review states', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await openPack(page, 'authorities');
  await captureFocused(
    page,
    directory,
    '01-kap-authority-contract-summary.png',
    'KAP authority contract summary',
    records,
    'authority-contract-summary'
  );
  const obligationList = page.locator('.orp-authority-contract-list');
  await obligationList.evaluate((element) => {
    if (element instanceof HTMLElement) element.scrollTop = element.scrollHeight;
  });
  await captureFocused(
    page,
    directory,
    '02-nine-kap-authority-obligations.png',
    'Nine policy-derived KAP authority obligations',
    records,
    'authority-contract-obligation-readiness-pack-activation'
  );

  await captureAuthorityRejection(
    page,
    directory,
    '03-missing-declaration-rejected.png',
    'Missing expected declaration rejected',
    records,
    (candidate) => {
      candidate.requiredAuthorities = candidate.requiredAuthorities.filter(
        (declaration) => declaration.authorityKind === 'requirement-owner'
      );
      candidate.governance.verificationAuthority = null;
      candidate.governance.internalApprovalAuthority = null;
      candidate.governance.externalAcceptanceAuthority = null;
      candidate.governance.openingDecisionAuthority = null;
      candidate.governance.activationAuthority = null;
    }
  );

  await captureAuthorityRejection(
    page,
    directory,
    '04-kind-mismatch-rejected.png',
    'Authority kind mismatch rejected',
    records,
    (candidate) => {
      const verification = candidate.authorityMatrix.find(
        (slot) => slot.authorityKind === 'evidence-verification'
      )!;
      verification.authorityKind = 'internal-approval';
      candidate.governance.verificationAuthority = structuredClone(verification);
    }
  );

  await captureAuthorityRejection(
    page,
    directory,
    '05-slot-reuse-rejected.png',
    'One slot reused across authority kinds rejected',
    records,
    (candidate) => {
      const sharedAuthorityId = candidate.requiredAuthorities.find(
        (declaration) => declaration.authorityKind === 'requirement-owner'
      )!.authorityId;
      candidate.requiredAuthorities = candidate.requiredAuthorities.map(
        (declaration) => ({ ...declaration, authorityId: sharedAuthorityId })
      );
    }
  );

  await captureAuthorityRejection(
    page,
    directory,
    '06-invalid-not-applicable-rejected.png',
    'Unauthorized not-applicable declaration rejected',
    records,
    (candidate) => {
      const declaration = candidate.requiredAuthorities.find(
        (item) => item.authorityKind === 'engineering-authority'
      )!;
      const slot = candidate.authorityMatrix.find(
        (item) => item.authorityKind === 'engineering-authority'
      )!;
      const statement: OperationalAuthorityNotApplicableDeclaration = {
        waiverId: `AUTHORITY-WAIVER-v1-${'0'.repeat(64)}`,
        policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
        policyRuleId: declaration.policyRuleId,
        authorityKind: 'engineering-authority',
        authorityId: slot.authorityId,
        scopeType: 'pack',
        scopeId: candidate.id,
        reasonAr: '',
        triggeredBySnapshot: [],
        resolverAuthorityId: 'AUTHORITY-MISSING-RESOLVER',
        authorizedActorRef: 'ACTOR-UNAUTHORIZED-WAIVER',
        sourceTraceIds: [],
        evidenceRefs: [],
        evidenceRegistryFingerprint: '0'.repeat(64),
        authorityReference: '',
        revision: candidate.revision,
        declaredAt: candidate.createdAt,
        timeTrust: 'unknown',
        previousWaiverHash: null,
        waiverHash: '0'.repeat(64)
      };
      declaration.applicable = false;
      declaration.notApplicableDeclaration = statement;
      slot.status = 'not-applicable';
      slot.notApplicableDeclaration = structuredClone(statement);
    }
  );

  await openPack(page, 'eligibility');
  await captureFocused(
    page,
    directory,
    '07-pre-freeze-blocked.png',
    'Pre-freeze authority contract blockers',
    records,
    'pre-freeze-gate-group'
  );
  await captureFocused(
    page,
    directory,
    '08-pre-activation-blocked.png',
    'Pre-activation authority contract blockers',
    records,
    'pre-activation-gate-group'
  );

  await captureAuthorityRejection(
    page,
    directory,
    '09-arabic-governance-mismatch-message.png',
    'Arabic-safe governance mismatch explanation',
    records,
    (candidate) => {
      candidate.governance.activationAuthority = null;
    }
  );

  const authorityKinds = [
    'سلطة مقام المتطلبات',
    'التحقق من الأدلة',
    'الاعتماد الداخلي',
    'القبول الخارجي',
    'الهندسة',
    'السلامة وHSE',
    'المسارات',
    'الافتتاح',
    'تفعيل أساس المتطلبات'
  ];
  const fictional = {
    title: 'حزمة مهرجان الساحل الاصطناعية',
    projectId: 'PROJECT-COAST-FESTIVAL-SYNTHETIC',
    policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    operationalReadiness: 'لا يمكن التحديد'
  };
  const cards = authorityKinds.map((label, index) =>
    `<article><b>${index + 1}</b><strong>${escapeHtml(label)}</strong><span>واجب مشتق من السياسة العامة</span></article>`
  ).join('');
  const fictionalHtml = `<!doctype html><html lang="ar" dir="rtl"><head>
    <meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#edf2ed;color:#172421;font-family:"IBM Plex Sans Arabic","Noto Sans Arabic",sans-serif}
    main{min-height:100vh;padding:38px;background:radial-gradient(circle at 12% 8%,#d8e8dd,transparent 31%),linear-gradient(145deg,#f9f6ee,#e7efea)}
    header{display:flex;justify-content:space-between;gap:30px;border-bottom:3px solid #1e594c;padding-bottom:20px}
    header span{color:#a35730;font-weight:900}h1{margin:5px 0;font-size:clamp(27px,4vw,54px)}
    .flag{height:max-content;padding:10px 14px;color:#fff;background:#1e594c;font-weight:900}
    .policy{display:flex;justify-content:space-between;margin:22px 0;border:1px solid #b9c8bf;padding:14px;background:#fff}
    .policy>div{display:flex;flex-direction:column;gap:4px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
    article{min-height:105px;border:1px solid #c4cfc8;border-right:4px solid #b56235;padding:15px;background:#fff}
    article b{color:#1e594c}article strong,article span{display:block}article strong{margin:8px 0;font-size:18px}article span{color:#64746d}
    footer{margin-top:18px;border:1px dashed #81958b;padding:14px;background:#ffffffb8}
    </style></head><body><main>
    <header><div><span>اختبار سياسة عامة مستقل</span><h1>${escapeHtml(fictional.title)}</h1>
    <p>${escapeHtml(fictional.projectId)}</p></div><div class="flag">هوية اختبار محلية</div></header>
    <section class="policy"><div><small>سياسة السلطات</small><strong>${escapeHtml(fictional.policyId)}</strong></div>
    <div><small>الجاهزية التشغيلية</small><strong>${escapeHtml(fictional.operationalReadiness)}</strong></div></section>
    <section class="grid">${cards}</section>
    <footer>نفس العقد المكوّن من تسعة أنواع يعمل دون اسم فعالية حقيقية أو شرط مشروع خاص.</footer>
    </main></body></html>`;
  expect(fictionalHtml).not.toMatch(/KAP|حدائق الملك عبدالله|Ahmed|أحمد|محمد إبراهيم|جوزيف حداد/);
  await page.setContent(fictionalHtml, { waitUntil: 'load' });
  await capture(
    page,
    directory,
    '10-generic-event-policy-fixture.png',
    'Generic non-project authority policy fixture',
    records
  );

  expect(records).toHaveLength(10);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every(
    (record) => record.width === viewport.width && record.height === viewport.height
  )).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.1B',
    projectId,
    eventId,
    venueId,
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint,
    authorityPolicyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
