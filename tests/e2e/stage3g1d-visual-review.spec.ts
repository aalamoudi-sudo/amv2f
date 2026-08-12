import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page, type Route } from '@playwright/test';
import { createEligibleSyntheticOperationalReadinessPack } from '../../src/test-fixtures/eligibleOperationalReadinessPack';
import {
  createOperationalAuthorityTriggerFacts,
  deriveOperationalAuthorityTriggerFingerprint
} from '../../src/services/operationalAuthorityTriggerPolicy';
import { deriveExpectedOperationalAuthorities } from '../../src/services/operationalAuthorityRequirementPolicy';
import { createOperationalAuthorityWaiverRecord } from '../../src/services/operationalAuthorityWaiver';
import {
  canonicalOperationalReadinessPack,
  createOperationalReadinessAuthoringState,
  materializeOperationalReadinessPackDerivedState,
  previewOperationalReadinessPackRevision
} from '../../src/services/operationalReadinessPack';
import {
  corruptOperationalReadinessEvidenceCustodyForTests,
  inspectOperationalReadinessWaiverLedger,
  inspectOperationalReadinessTrustSession,
  openOperationalReadinessTrustSession,
  prepareOperationalReadinessAuthoringRevision,
  removeOperationalReadinessWaiverLedgerForTests,
  resetOperationalReadinessSyntheticTrustForTests
} from '../../src/services/operationalReadinessTrustGateway';
import type {
  OperationalAuthorityWaiverRecord,
  OperationalReadinessPack
} from '../../src/types/operationalReadinessPack';
import type {
  OperationalReadinessRevisionAuthorityCommand,
  OperationalReadinessTrustSession
} from '../../src/types/operationalReadinessTrust';

const bundleName = 'mayadeen-stage-3g1d-local-trust-root-custody-review';
const reviewRoot = process.env.STAGE3G1D_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packFingerprint =
  '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc';
const packUrl =
  `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;
const manifestPattern = '**/*kap-operational-readiness-pack-candidate-v1*.json*';
const sourceTraceId = 'TRACE-SYNTHETIC-GOVERNANCE-001';
const waiverEvidenceId = 'EVIDENCE-SYNTHETIC-WAIVER-001';

interface ScreenshotRecord {
  file: string;
  state: string;
  width: number;
  height: number;
  sha256: string;
}

interface EvidenceFact {
  label: string;
  value: string;
  state: 'blocked' | 'trusted' | 'neutral';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
    element.style.outline = '4px solid #bb6b32';
    element.style.outlineOffset = '5px';
  });
  await capture(page, directory, file, state, records);
  await subject.evaluate((element, style) => {
    if (style === null) element.removeAttribute('style');
    else element.setAttribute('style', style);
  }, previousStyle);
}

async function openPack(
  page: Page,
  view: 'summary' | 'authorities' | 'eligibility'
) {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  const workspace = page.getByTestId('operational-readiness-pack-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  return workspace;
}

async function mutateManifest(
  route: Route,
  mutate: (draft: ReturnType<typeof canonicalOperationalReadinessPack>) => void
) {
  const response = await route.fetch();
  const candidate = await response.json() as OperationalReadinessPack;
  const draft = structuredClone(canonicalOperationalReadinessPack(candidate));
  mutate(draft);
  const modified = materializeOperationalReadinessPackDerivedState(draft);
  await route.fulfill({
    response,
    contentType: 'application/json',
    body: JSON.stringify(modified)
  });
}

async function renderEvidenceCard(
  page: Page,
  input: {
    sequence: string;
    eyebrow: string;
    title: string;
    description: string;
    facts: EvidenceFact[];
    outcome: string;
    tone: 'blocked' | 'trusted';
  }
) {
  const facts = input.facts.map((fact) => `
    <article class="${fact.state}">
      <span>${escapeHtml(fact.label)}</span>
      <strong>${escapeHtml(fact.value)}</strong>
    </article>
  `).join('');
  const html = `<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <style>
          *{box-sizing:border-box}
          body{margin:0;background:#e8ede8;color:#17221f;font-family:"IBM Plex Sans Arabic","Noto Sans Arabic",sans-serif}
          main{min-height:100vh;padding:clamp(24px,4vw,58px);background:
            radial-gradient(circle at 12% 10%,rgba(74,125,105,.22),transparent 29%),
            linear-gradient(140deg,#f8f3e8 0%,#e5eee8 58%,#dce7df 100%)}
          header{display:grid;grid-template-columns:1fr auto;gap:32px;border-bottom:3px solid #285c4e;padding-bottom:24px}
          .eyebrow{color:#a65d31;font-weight:900;letter-spacing:.04em}
          h1{max-width:1050px;margin:8px 0;font-size:clamp(30px,4.5vw,64px);line-height:1.12}
          p{max-width:900px;margin:0;color:#52635d;font-size:clamp(15px,1.5vw,21px);line-height:1.8}
          .sequence{display:grid;place-items:center;width:88px;height:88px;border:1px solid #829a90;background:#fff;font:900 27px ui-monospace,monospace;color:#285c4e}
          .facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:32px 0}
          article{min-height:115px;border:1px solid #bccac2;border-right:5px solid #6e8077;padding:18px;background:rgba(255,255,255,.86)}
          article.blocked{border-right-color:#bd543d;background:#fff7f2}
          article.trusted{border-right-color:#28735e;background:#f3fbf7}
          article span,article strong{display:block}
          article span{color:#63756e;font-size:14px}
          article strong{margin-top:10px;font-size:clamp(17px,2vw,27px);line-height:1.45}
          .outcome{display:flex;align-items:center;gap:16px;border:1px solid ${input.tone === 'trusted' ? '#5f9481' : '#c9755d'};padding:20px;background:${input.tone === 'trusted' ? '#e8f5ee' : '#fff0e9'};font-size:clamp(17px,2vw,26px);font-weight:900}
          .outcome::before{content:"${input.tone === 'trusted' ? '✓' : '×'}";display:grid;place-items:center;width:42px;height:42px;background:${input.tone === 'trusted' ? '#286b57' : '#a84330'};color:#fff;font:900 27px sans-serif}
          footer{margin-top:18px;color:#596b64;font-size:13px}
          @media(max-width:900px){header{grid-template-columns:1fr}.sequence{position:absolute;left:24px;top:24px;width:58px;height:58px;font-size:19px}.facts{grid-template-columns:1fr 1fr;gap:9px;margin:20px 0}article{min-height:84px;padding:12px}footer{display:none}}
        </style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <div class="eyebrow">${escapeHtml(input.eyebrow)}</div>
              <h1>${escapeHtml(input.title)}</h1>
              <p>${escapeHtml(input.description)}</p>
            </div>
            <div class="sequence">${escapeHtml(input.sequence)}</div>
          </header>
          <section class="facts">${facts}</section>
          <div class="outcome">${escapeHtml(input.outcome)}</div>
          <footer>دليل اختبار محلي من بوابة الثقة · لا يمثل مصادقة إنتاجية أو جاهزية تشغيلية.</footer>
        </main>
      </body>
    </html>`;
  await page.setContent(html, { waitUntil: 'load' });
}

function syntheticRoot(): {
  pack: OperationalReadinessPack;
  session: OperationalReadinessTrustSession;
} {
  resetOperationalReadinessSyntheticTrustForTests();
  const pack = createEligibleSyntheticOperationalReadinessPack();
  const session = openOperationalReadinessTrustSession(pack);
  if (!session) throw new Error('SYNTHETIC_TRUST_ROOT_MISSING');
  return { pack, session };
}

function authorCommand(
  pack: OperationalReadinessPack,
  overrides: Partial<OperationalReadinessRevisionAuthorityCommand> = {}
): OperationalReadinessRevisionAuthorityCommand {
  const authority = pack.governance.requirementAuthority!;
  return {
    authorityId: authority.authorityId,
    actorRef: authority.actor!.actorRef,
    reasonAr: 'مراجعة اصطناعية محكومة لاختبار سلسلة الثقة.',
    at: '2026-07-29T18:30:00+03:00',
    timeTrust: 'local-test-clock',
    sourceTraceIds: [...authority.sourceTraceIds],
    changeSourceTraceIds: [...authority.sourceTraceIds],
    evidenceRefs: [],
    ...overrides
  };
}

function evidenceRegistryFingerprint(
  pack: OperationalReadinessPack,
  session: OperationalReadinessTrustSession
): string {
  const fingerprint = inspectOperationalReadinessTrustSession(
    session,
    pack
  ).evidenceRegistryFingerprint;
  if (!fingerprint) throw new Error('TRUSTED_EVIDENCE_REGISTRY_MISSING');
  return fingerprint;
}

function addConditionalWaiver(
  draft: ReturnType<typeof canonicalOperationalReadinessPack>,
  session: OperationalReadinessTrustSession,
  previousWaiverHash: string | null,
  revision: number
): OperationalAuthorityWaiverRecord {
  const expected = deriveExpectedOperationalAuthorities(
    draft as OperationalReadinessPack
  ).find((candidate) => candidate.authorityKind === 'engineering-authority')!;
  const declaration = draft.requiredAuthorities.find(
    (candidate) => candidate.authorityKind === 'engineering-authority'
  )!;
  const slot = draft.authorityMatrix.find(
    (candidate) => candidate.authorityKind === 'engineering-authority'
  )!;
  const resolver = draft.authorityMatrix.find(
    (candidate) => candidate.authorityKind === 'requirement-owner'
  )!;
  const waiver = createOperationalAuthorityWaiverRecord({
    policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    policyRuleId: expected.policyRuleId,
    authorityKind: 'engineering-authority',
    authorityId: declaration.authorityId,
    scopeType: expected.requiredScopeType,
    scopeId: expected.requiredScopeId,
    reasonAr: revision === 2
      ? 'إعفاء شرطي اصطناعي محكوم.'
      : 'استبدال اصطناعي لاختبار اتصال دفتر الحيازة.',
    triggeredBySnapshot: [...expected.triggeredBy],
    resolverAuthorityId: resolver.authorityId,
    authorizedActorRef: resolver.actor!.actorRef,
    sourceTraceIds: [sourceTraceId],
    evidenceRefs: [waiverEvidenceId],
    evidenceRegistryFingerprint: evidenceRegistryFingerprint(
      createEligibleSyntheticOperationalReadinessPack(),
      session
    ),
    authorityReference: resolver.authorityId,
    revision,
    declaredAt: revision === 2
      ? '2026-07-29T18:20:00+03:00'
      : '2026-07-29T18:50:00+03:00',
    timeTrust: 'local-test-clock',
    previousWaiverHash
  });
  declaration.applicable = false;
  declaration.notApplicableDeclaration = structuredClone(waiver);
  slot.status = 'not-applicable';
  slot.actor = null;
  slot.notApplicableDeclaration = structuredClone(waiver);
  return waiver;
}

function firstTrustedWaiverRevision() {
  const { pack: root, session } = syntheticRoot();
  const command = authorCommand(root, {
    reasonAr: 'إضافة أول إعفاء شرطي محكوم.'
  });
  const draft = structuredClone(canonicalOperationalReadinessPack(root));
  draft.revision = 2;
  draft.packStatus = 'review';
  draft.revisionReason = command.reasonAr;
  draft.requirements[0].authorityImpactKinds = ['client-acceptance'];
  draft.requirements[0].spatialScopeStatus = 'explicitly-not-applicable';
  draft.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
    requirements: draft.requirements,
    revision: 2
  });
  draft.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
    draft.authorityTriggerFacts
  );
  const waiver = addConditionalWaiver(draft, session, null, 2);
  draft.authoringHistory.push({
    historyId: 'HISTORY-SYNTHETIC-WAIVER-R2-VISUAL',
    revision: 2,
    actorRef: command.actorRef,
    at: command.at,
    action: 'previewed',
    reason: command.reasonAr,
    previousFingerprint: root.contentHash
  });
  const pack = materializeOperationalReadinessPackDerivedState(
    draft,
    { trustSession: session }
  );
  const preview = previewOperationalReadinessPackRevision({
    state: createOperationalReadinessAuthoringState(root, session),
    nextPack: pack,
    changeReason: command.reasonAr,
    actorRef: command.actorRef,
    createdAt: command.at,
    trustSession: session,
    authorityCommand: command
  });
  return {
    pack: preview.revision.pack,
    session,
    waiver
  };
}

test('captures eleven distinct Stage 3G.1D trust and custody states', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  process.env.NODE_ENV = 'test';
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  await openPack(page, 'summary');
  await captureFocused(
    page,
    directory,
    '01-kap-trusted-root-status.png',
    'Compiled KAP trusted root status',
    records,
    'readiness-pack-trust-status'
  );

  await page.getByRole('button', { name: 'الحقيقة التقنية' }).click();
  await captureFocused(
    page,
    directory,
    '02-kap-trust-custody-technical-drawer.png',
    'Trusted root, revision, evidence registry and waiver ledger detail',
    records,
    'readiness-pack-technical-drawer'
  );

  await openPack(page, 'authorities');
  await captureFocused(
    page,
    directory,
    '03-kap-authority-contract.png',
    'KAP authority contract remains missing nine assignments',
    records,
    'authority-contract-summary'
  );

  await openPack(page, 'eligibility');
  await captureFocused(
    page,
    directory,
    '04-kap-eligibility-blocked.png',
    'KAP pre-freeze and pre-activation remain blocked',
    records,
    'eligibility-authority-contract'
  );

  await page.route(manifestPattern, (route) => mutateManifest(route, (draft) => {
    draft.revisionReason = 'محاولة إصدار جذر ثقة ذاتي من حزمة معدلة.';
  }));
  await page.goto(`${packUrl}&readinessPackView=summary`);
  const trustRejection = page.getByTestId('readiness-pack-trust-rejection');
  await expect(trustRejection).toBeVisible();
  await expect(trustRejection).toContainText(
    'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
  );
  await captureFocused(
    page,
    directory,
    '05-missing-trust-session-fail-closed.png',
    'Arabic fail-closed state for an untrusted self-rehashed manifest',
    records,
    'readiness-pack-trust-rejection'
  );
  await page.unroute(manifestPattern);

  resetOperationalReadinessSyntheticTrustForTests();
  const selfAnchorRoot = createEligibleSyntheticOperationalReadinessPack();
  const selfAnchored = materializeOperationalReadinessPackDerivedState({
    ...canonicalOperationalReadinessPack(selfAnchorRoot),
    revisionReason: 'SELF-ISSUED-ROOT-ATTEMPT'
  });
  const selfAnchorSession = openOperationalReadinessTrustSession(selfAnchored);
  expect(selfAnchorSession).toBeNull();
  await renderEvidenceCard(page, {
    sequence: '06',
    eyebrow: 'اختبار عدائي · جذر الثقة',
    title: 'الحزمة لا تستطيع إصدار مرساة ثقتها',
    description: 'أُعيدت بصمة الحزمة بعد تعديلها ثم طُلب فتح جلسة ثقة منها. الكتالوج المجمّع رفض الهوية الجديدة.',
    facts: [
      { label: 'المصدر المقترح للثقة', value: 'الحزمة المعدلة نفسها', state: 'blocked' },
      { label: 'مطابقة الجذر المجمّع', value: 'غير متطابقة', state: 'blocked' },
      { label: 'جلسة صادرة من البوابة', value: 'لم تُصدر', state: 'blocked' },
      { label: 'أثر إعادة البصمة', value: 'لا تمنح سلطة', state: 'neutral' }
    ],
    outcome: 'النتيجة: رُفض الجذر الذاتي وبقي التجميد محجوبًا.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '06-self-anchor-rejected.png',
    'Self-issued trigger/root anchor rejection',
    records
  );

  const { pack: authorRoot, session: authorSession } = syntheticRoot();
  const unauthorizedCommand = authorCommand(authorRoot, {
    actorRef: 'ATTACKER-NOT-IN-AUTHORITY-MATRIX'
  });
  const authorDraft = structuredClone(canonicalOperationalReadinessPack(authorRoot));
  authorDraft.revision = 2;
  authorDraft.packStatus = 'review';
  authorDraft.revisionReason = unauthorizedCommand.reasonAr;
  authorDraft.authoringHistory.push({
    historyId: 'HISTORY-UNAUTHORIZED-AUTHOR-VISUAL',
    revision: 2,
    actorRef: unauthorizedCommand.actorRef,
    at: unauthorizedCommand.at,
    action: 'previewed',
    reason: unauthorizedCommand.reasonAr,
    previousFingerprint: authorRoot.contentHash
  });
  const unauthorizedRevision = materializeOperationalReadinessPackDerivedState(
    authorDraft,
    { trustSession: authorSession }
  );
  let unauthorizedAuthorRejected = false;
  try {
    prepareOperationalReadinessAuthoringRevision(
      authorSession,
      authorRoot,
      unauthorizedRevision,
      unauthorizedCommand
    );
  } catch {
    unauthorizedAuthorRejected = true;
  }
  expect(unauthorizedAuthorRejected).toBe(true);
  await renderEvidenceCard(page, {
    sequence: '07',
    eyebrow: 'اختبار عدائي · سلطة التأليف',
    title: 'مؤلف المراجعة غير المخوّل مرفوض',
    description: 'وجود اسم فاعل وسبب ووقت لا يكفي. البوابة طلبت تطابق الفاعل مع خانة سلطة التأليف القانونية في المصفوفة الموثوقة.',
    facts: [
      { label: 'الفاعل المرسل', value: 'غير موجود في المصفوفة القانونية', state: 'blocked' },
      { label: 'نوع السلطة المطلوب', value: 'سلطة مقام المتطلبات', state: 'neutral' },
      { label: 'تطابق الممثل القانوني', value: 'فشل', state: 'blocked' },
      { label: 'المراجعة المقبولة', value: 'لم تُضف إلى السجل', state: 'blocked' }
    ],
    outcome: 'النتيجة: رُفض أمر التأليف ولم تتغير سلسلة المراجعات.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '07-unauthorized-author-rejected.png',
    'Unauthorized revision author rejection',
    records
  );

  const { pack: evidencePack, session: evidenceSession } = syntheticRoot();
  corruptOperationalReadinessEvidenceCustodyForTests(evidenceSession);
  const evidenceStatus = inspectOperationalReadinessTrustSession(
    evidenceSession,
    evidencePack
  );
  expect(evidenceStatus.evidenceRegistryStatus).toBe('mismatch');
  await renderEvidenceCard(page, {
    sequence: '08',
    eyebrow: 'اختبار عدائي · حيازة الأدلة',
    title: 'عدم تطابق سجل الأدلة يحجب الاستخدام القانوني',
    description: 'حتى مع جلسة صحيحة، أُفسدت حيازة سجل الأدلة داخل اختبار العزل. لم تقبل البوابة محللًا أو دليلًا يقدمه المستدعي.',
    facts: [
      { label: 'جلسة الثقة', value: 'صادرة من البوابة', state: 'trusted' },
      { label: 'حالة سجل الأدلة', value: 'عدم تطابق', state: 'blocked' },
      { label: 'محلل أدلة من المستدعي', value: 'لا ينشئ حيازة', state: 'blocked' },
      { label: 'أهلية الإعفاء', value: 'محجوبة', state: 'blocked' }
    ],
    outcome: 'النتيجة: الدليل غير قابل للاستخدام حتى تعود الحيازة الموثوقة.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '08-evidence-registry-mismatch.png',
    'Trusted evidence registry mismatch',
    records
  );

  const { pack: ledgerPack, session: ledgerSession } = syntheticRoot();
  removeOperationalReadinessWaiverLedgerForTests(ledgerSession);
  const ledgerStatus = inspectOperationalReadinessTrustSession(
    ledgerSession,
    ledgerPack
  );
  expect(ledgerStatus.waiverLedgerStatus).toBe('missing');
  await renderEvidenceCard(page, {
    sequence: '09',
    eyebrow: 'اختبار عدائي · دفتر الإعفاءات',
    title: 'غياب دفتر الحيازة لا يعني بداية سجل جديد',
    description: 'حُذفت حيازة الدفتر داخل اختبار معزول. البوابة لم تعتمد مصفوفة previousWaivers يرسلها المستدعي ولم تفترض أن الإعفاء هو الأول.',
    facts: [
      { label: 'دفتر البوابة', value: 'مفقود', state: 'blocked' },
      { label: 'تاريخ مضمّن في الحزمة', value: 'غير مرجعي', state: 'neutral' },
      { label: 'previousWaiverHash فارغ', value: 'لا يعيد ضبط التاريخ', state: 'blocked' },
      { label: 'الانتقال القانوني', value: 'محجوب', state: 'blocked' }
    ],
    outcome: 'النتيجة: فشل مغلق حتى تتوفر حيازة دفتر موثوقة.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '09-missing-waiver-ledger.png',
    'Missing waiver ledger fail-closed state',
    records
  );

  const first = firstTrustedWaiverRevision();
  const replacementCommand = authorCommand(first.pack, {
    reasonAr: 'استبدال إعفاء بسلسلة غير متصلة.',
    at: '2026-07-29T19:00:00+03:00',
    evidenceRefs: [waiverEvidenceId]
  });
  const replacementDraft = structuredClone(
    canonicalOperationalReadinessPack(first.pack)
  );
  replacementDraft.revision = 3;
  replacementDraft.packStatus = 'review';
  replacementDraft.revisionReason = replacementCommand.reasonAr;
  const replacementWaiver = addConditionalWaiver(
    replacementDraft,
    first.session,
    null,
    3
  );
  replacementDraft.authoringHistory.push({
    historyId: 'HISTORY-SYNTHETIC-WAIVER-R3-RESET-VISUAL',
    revision: 3,
    actorRef: replacementCommand.actorRef,
    at: replacementCommand.at,
    action: 'previewed',
    reason: replacementCommand.reasonAr,
    previousFingerprint: first.pack.contentHash
  });
  const replacement = materializeOperationalReadinessPackDerivedState(
    replacementDraft,
    { trustSession: first.session }
  );
  const trustedLedger = inspectOperationalReadinessWaiverLedger(
    first.session,
    first.pack,
    {
      authorityKind: 'engineering-authority',
      authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
      scopeType: 'pack',
      scopeId: first.pack.id
    }
  );
  expect(trustedLedger).toMatchObject({
    available: true,
    head: { waiverHash: first.waiver.waiverHash }
  });
  expect(replacementWaiver.previousWaiverHash).toBeNull();
  expect(replacementWaiver.previousWaiverHash)
    .not.toBe(trustedLedger.head?.waiverHash);
  expect(() => previewOperationalReadinessPackRevision({
    state: createOperationalReadinessAuthoringState(
      first.pack,
      first.session
    ),
    nextPack: replacement,
    changeReason: replacementCommand.reasonAr,
    actorRef: replacementCommand.actorRef,
    createdAt: replacementCommand.at,
    trustSession: first.session,
    authorityCommand: replacementCommand
  })).toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
  await renderEvidenceCard(page, {
    sequence: '10',
    eyebrow: 'اختبار عدائي · تسلسل الإعفاء',
    title: 'استبدال الإعفاء يجب أن يتصل بالرأس السابق',
    description: 'المراجعة الثالثة حاولت تقديم إعفاء جديد مع previousWaiverHash فارغ رغم وجود إعفاء موثوق في المراجعة الثانية.',
    facts: [
      { label: 'رأس الدفتر الحالي', value: 'إعفاء R2 موثوق', state: 'trusted' },
      { label: 'مرجع الاستبدال', value: 'فارغ بدل بصمة R2', state: 'blocked' },
      { label: 'اتصال السلسلة', value: 'غير متطابق', state: 'blocked' },
      { label: 'قبول المراجعة R3', value: 'مرفوض', state: 'blocked' }
    ],
    outcome: 'النتيجة: اكتُشف انقطاع سلسلة الإعفاء ولم يُستبدل الرأس.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '10-waiver-chain-mismatch.png',
    'Waiver replacement chain mismatch',
    records
  );

  const { pack: trustedPack, session: trustedSession } = syntheticRoot();
  const trustedStatus = inspectOperationalReadinessTrustSession(
    trustedSession,
    trustedPack
  );
  expect(trustedStatus).toMatchObject({
    valid: true,
    evidenceRegistryStatus: 'trusted',
    waiverLedgerStatus: 'trusted',
    trustedRevisionHead: 1
  });
  await renderEvidenceCard(page, {
    sequence: '11',
    eyebrow: 'مسار إيجابي · هوية اختبار محلية',
    title: 'مثبت اصطناعي يستخدم بوابة الثقة نفسها',
    description: 'هذا مثبت عام غير مرتبط بـ KAP يثبت أن الجذر المجمّع، وسجل الأدلة، ودفتر الإعفاءات يمكن أن تتصل عبر جلسة بوابة واحدة.',
    facts: [
      { label: 'الجذر المجمّع', value: 'مطابق', state: 'trusted' },
      { label: 'رأس المراجعة', value: 'R1 موثوق', state: 'trusted' },
      { label: 'سجل الأدلة', value: 'تحت حيازة البوابة', state: 'trusted' },
      { label: 'دفتر الإعفاءات', value: 'مهيأ ومحكوم', state: 'trusted' }
    ],
    outcome: 'النتيجة: المسار المحلي الموثوق صالح، والجاهزية تبقى لا يمكن تحديدها.',
    tone: 'trusted'
  });
  await capture(
    page,
    directory,
    '11-valid-trusted-local-fixture.png',
    'Valid generic trusted local fixture',
    records
  );

  expect(records).toHaveLength(11);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every(
    (record) => record.width === viewport.width && record.height === viewport.height
  )).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8'
  }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.1D',
    projectId,
    eventId,
    venueId,
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint,
    trustPolicyVersion: 'OPERATIONAL-READINESS-TRUST-POLICY-v1',
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
