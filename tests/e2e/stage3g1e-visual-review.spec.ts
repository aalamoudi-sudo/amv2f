import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createEligibleSyntheticOperationalReadinessPack } from '../../src/test-fixtures/eligibleOperationalReadinessPack';
import {
  canonicalOperationalReadinessPack,
  createOperationalReadinessAuthoringState,
  deriveOperationalSourceFingerprint,
  deriveOperationalSourceTraceFingerprint,
  materializeOperationalReadinessPackDerivedState,
  operationalSourceRevisionId,
  previewOperationalReadinessPackRevision
} from '../../src/services/operationalReadinessPack';
import {
  deriveOperationalReadinessAuthorityAssignmentFingerprint
} from '../../src/services/operationalReadinessCustodyFingerprint';
import {
  inspectOperationalReadinessTrustSession,
  inspectOperationalReadinessWaiverLedger,
  openOperationalReadinessTrustSession,
  resetOperationalReadinessSyntheticTrustForTests,
  resolveOperationalReadinessTrustedEvidence
} from '../../src/services/operationalReadinessTrustGateway';
import type {
  OperationalReadinessPack
} from '../../src/types/operationalReadinessPack';
import type {
  OperationalReadinessRevisionAuthorityCommand,
  OperationalReadinessTrustSession
} from '../../src/types/operationalReadinessTrust';

const bundleName =
  'mayadeen-stage-3g1e-final-authority-source-revision-custody-review';
const reviewRoot = process.env.STAGE3G1E_REVIEW_DIR
  ?? path.join(process.env.HOME ?? process.cwd(), 'Downloads', bundleName);
const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packFingerprint =
  '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc';
const packUrl =
  `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;
const governanceTraceId = 'TRACE-SYNTHETIC-GOVERNANCE-001';
const waiverEvidenceId = 'EVIDENCE-SYNTHETIC-WAIVER-001';
const activationEvidenceId = 'EVIDENCE-SYNTHETIC-ACTIVATION-001';

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
  view: 'authorities' | 'eligibility'
) {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  const workspace = page.getByTestId('operational-readiness-pack-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  return workspace;
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
    tone: 'blocked' | 'trusted' | 'comparison';
  }
) {
  const facts = input.facts.map((fact) => `
    <article class="${fact.state}">
      <span>${escapeHtml(fact.label)}</span>
      <strong>${escapeHtml(fact.value)}</strong>
    </article>
  `).join('');
  const toneColor = input.tone === 'trusted'
    ? '#28735e'
    : input.tone === 'comparison'
      ? '#285c82'
      : '#a84330';
  const toneBackground = input.tone === 'trusted'
    ? '#e8f5ee'
    : input.tone === 'comparison'
      ? '#eaf2f7'
      : '#fff0e9';
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
          h1{max-width:1120px;margin:8px 0;font-size:clamp(30px,4.5vw,64px);line-height:1.12}
          p{max-width:980px;margin:0;color:#52635d;font-size:clamp(15px,1.5vw,21px);line-height:1.8}
          .sequence{display:grid;place-items:center;width:88px;height:88px;border:1px solid #829a90;background:#fff;font:900 27px ui-monospace,monospace;color:#285c4e}
          .facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:32px 0}
          article{min-height:115px;border:1px solid #bccac2;border-right:5px solid #6e8077;padding:18px;background:rgba(255,255,255,.86)}
          article.blocked{border-right-color:#bd543d;background:#fff7f2}
          article.trusted{border-right-color:#28735e;background:#f3fbf7}
          article span,article strong{display:block}
          article span{color:#63756e;font-size:14px}
          article strong{margin-top:10px;font-size:clamp(17px,2vw,27px);line-height:1.45}
          .outcome{display:flex;align-items:center;gap:16px;border:1px solid ${toneColor};padding:20px;background:${toneBackground};font-size:clamp(17px,2vw,26px);font-weight:900}
          .outcome::before{content:"${input.tone === 'trusted' ? '✓' : input.tone === 'comparison' ? '↔' : '×'}";display:grid;place-items:center;width:42px;height:42px;background:${toneColor};color:#fff;font:900 27px sans-serif}
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
          <footer>دليل اختبار محلي · لا يمثل مصادقة إنتاجية أو جاهزية تشغيلية.</footer>
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
  pack: OperationalReadinessPack
): OperationalReadinessRevisionAuthorityCommand {
  const authority = pack.governance.requirementAuthority!;
  return {
    authorityId: authority.authorityId,
    actorRef: authority.actor!.actorRef,
    reasonAr: 'اختبار مرئي محكوم لحيازة Stage 3G.1E.',
    at: '2026-07-30T08:00:00+03:00',
    timeTrust: 'local-test-clock',
    sourceTraceIds: [...authority.sourceTraceIds],
    changeSourceTraceIds: [...authority.sourceTraceIds],
    evidenceRefs: []
  };
}

function nextDraft(
  previous: OperationalReadinessPack,
  command: OperationalReadinessRevisionAuthorityCommand
) {
  const draft = structuredClone(canonicalOperationalReadinessPack(previous));
  draft.revision = previous.revision + 1;
  draft.packStatus = 'review';
  draft.revisionReason = command.reasonAr;
  draft.authoringHistory.push({
    historyId: `HISTORY-STAGE3G1E-VISUAL-R${draft.revision}`,
    revision: draft.revision,
    actorRef: command.actorRef,
    at: command.at,
    action: 'previewed',
    reason: command.reasonAr,
    previousFingerprint: previous.contentHash
  });
  return draft;
}

function previewRevision(
  previous: OperationalReadinessPack,
  next: OperationalReadinessPack,
  session: OperationalReadinessTrustSession,
  command: OperationalReadinessRevisionAuthorityCommand
) {
  return previewOperationalReadinessPackRevision({
    state: createOperationalReadinessAuthoringState(previous, session),
    nextPack: next,
    changeReason: command.reasonAr,
    actorRef: command.actorRef,
    createdAt: command.at,
    trustSession: session,
    authorityCommand: command
  });
}

function activationEvidenceRequest(pack: OperationalReadinessPack, actorRef: string) {
  return {
    evidenceRefs: [activationEvidenceId],
    authorityKind: 'readiness-pack-activation' as const,
    authorityId: 'AUTH-SYNTHETIC-ACTIVATION',
    resolverAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
    subjectActorRef: actorRef,
    subjectAuthorityId: 'AUTH-SYNTHETIC-ACTIVATION',
    subjectAuthorityKind: 'readiness-pack-activation' as const,
    authorityAssignmentFingerprint:
      deriveOperationalReadinessAuthorityAssignmentFingerprint(
        pack,
        'AUTH-SYNTHETIC-ACTIVATION'
      ) ?? '',
    acceptedEvidenceTypes: ['signature' as const]
  };
}

test('captures ten distinct Stage 3G.1E custody states', async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  process.env.NODE_ENV = 'test';
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Viewport is required.');
  const resolution = `${viewport.width}x${viewport.height}`;
  const directory = path.join(reviewRoot, resolution);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const records: ScreenshotRecord[] = [];

  const workspace = await openPack(page, 'eligibility');
  await expect(workspace).toContainText('غير مقيمة · لا يمكن التحديد');
  await captureFocused(
    page,
    directory,
    '01-kap-exact-custody-eligibility.png',
    'KAP exact custody boundaries and blocked eligibility',
    records,
    'exact-revision-custody'
  );

  await openPack(page, 'authorities');
  await captureFocused(
    page,
    directory,
    '02-kap-authority-contract-unchanged.png',
    'KAP remains blocked with nine missing authority obligations',
    records,
    'authority-contract-summary'
  );

  await renderEvidenceCard(page, {
    sequence: '03',
    eyebrow: 'قبل الإغلاق · إعادة إنتاج مثبتة',
    title: 'كان أمر صحيح يستطيع إدخال ممثل تفعيل غير مخوّل',
    description: 'تحقق الإصدار السابق من سلطة الأمر في الحزمة السابقة، لكنه لم يثبت طوبولوجيا السلطة التي أدخلتها الحزمة التالية.',
    facts: [
      { label: 'فاعل الأمر', value: 'مالك متطلبات قانوني', state: 'trusted' },
      { label: 'ممثل التفعيل الجديد', value: 'ROLE-ATTACKER-ACTIVATION', state: 'blocked' },
      { label: 'قبول المراجعة قبل التصحيح', value: 'مقبولة', state: 'blocked' },
      { label: 'خطر النتيجة', value: 'تجميد ثم تفعيل بهوية مدخلة', state: 'blocked' }
    ],
    outcome: 'قبل: كانت طوبولوجيا السلطة التالية خارج حيازة الجذر.',
    tone: 'comparison'
  });
  await capture(
    page,
    directory,
    '03-before-authority-injection.png',
    'Before correction: reproduced authority actor injection',
    records
  );

  const { pack: injectionRoot, session: injectionSession } = syntheticRoot();
  const injectionCommand = authorCommand(injectionRoot);
  const injectionDraft = nextDraft(injectionRoot, injectionCommand);
  const activation = injectionDraft.authorityMatrix.find(
    (authority) => authority.authorityKind === 'readiness-pack-activation'
  )!;
  activation.actor = {
    ...structuredClone(activation.actor!),
    actorRef: 'ROLE-ATTACKER-ACTIVATION'
  };
  injectionDraft.governance.activationAuthority = structuredClone(activation);
  const injected = materializeOperationalReadinessPackDerivedState(
    injectionDraft,
    { trustSession: injectionSession }
  );
  expect(() => previewRevision(
    injectionRoot,
    injected,
    injectionSession,
    injectionCommand
  )).toThrow('OPERATIONAL_TRUST_AUTHORITY_TOPOLOGY_REJECTED');
  await renderEvidenceCard(page, {
    sequence: '04',
    eyebrow: 'بعد الإغلاق · حيازة طوبولوجيا السلطة',
    title: 'استبدال ممثل التفعيل يُرفض قبل إصدار التصريح',
    description: 'تقارن البوابة بصمة الطوبولوجيا السابقة والتالية. مالك المتطلبات لا يستطيع إنشاء ممثل سلطة أو استبداله أو ترقيته.',
    facts: [
      { label: 'بصمة الطوبولوجيا', value: 'تغير غير مسموح', state: 'blocked' },
      { label: 'إصدار تصريح المراجعة', value: 'مرفوض', state: 'blocked' },
      { label: 'رأس السلسلة', value: 'بقي عند R1', state: 'trusted' },
      { label: 'التجميد أو التفعيل', value: 'لم يبدأ', state: 'trusted' }
    ],
    outcome: 'بعد: فشل أول انتقال غير قانوني ولم تدخل الهوية إلى الحيازة.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '04-after-authority-injection-rejected.png',
    'After correction: authority topology injection rejected',
    records
  );

  const { pack: traceRoot, session: traceSession } = syntheticRoot();
  const traceCommand = authorCommand(traceRoot);
  const traceDraft = nextDraft(traceRoot, traceCommand);
  const sourceR1 = traceDraft.sourceRegistry[0];
  const sourceR2Hash = '2'.repeat(64);
  traceDraft.sourceRegistry.push({
    ...structuredClone(sourceR1),
    sourceRevision: 2,
    expectedSha256: sourceR2Hash,
    observedSha256: sourceR2Hash,
    sourceRevisionId: operationalSourceRevisionId({
      sourceId: sourceR1.sourceId,
      sourceRevision: 2,
      observedSha256: sourceR2Hash
    }),
    supersedesSourceId: sourceR1.sourceId,
    supersedesSourceRevisionId: sourceR1.sourceRevisionId,
    previousSourceHash: sourceR1.observedSha256
  });
  const reboundTrace = traceDraft.sourceTraces.find(
    (trace) => trace.traceId === governanceTraceId
  )!;
  reboundTrace.sourceRevision = 2;
  reboundTrace.sourceHash = sourceR2Hash;
  reboundTrace.extractedMeaning = 'معنى جديد مربوط بهوية أثر قديمة.';
  traceDraft.sourceFingerprint = deriveOperationalSourceFingerprint(
    traceDraft.sourceRegistry
  );
  traceDraft.sourceTraceFingerprint = deriveOperationalSourceTraceFingerprint(
    traceDraft.sourceTraces
  );
  const reboundPack = materializeOperationalReadinessPackDerivedState(
    traceDraft,
    { trustSession: traceSession }
  );
  expect(() => previewRevision(
    traceRoot,
    reboundPack,
    traceSession,
    traceCommand
  )).toThrow('OPERATIONAL_TRUST_SOURCE_TRACE_REBINDING_REJECTED');
  await renderEvidenceCard(page, {
    sequence: '05',
    eyebrow: 'حيازة المصدر · هوية الأثر',
    title: 'هوية أثر المصدر لا تُعاد ربطها ببايتات أو معنى جديد',
    description: 'المراجعة حاولت نقل أثر R1 إلى مصدر R2 وتغيير معناه مع إبقاء traceId نفسه. البوابة رفضت التغيير قبل التصريح.',
    facts: [
      { label: 'هوية الأثر', value: 'TRACE-SYNTHETIC-GOVERNANCE-001', state: 'neutral' },
      { label: 'المراجعة الأصلية', value: 'R1 محفوظة', state: 'trusted' },
      { label: 'محاولة الربط', value: 'R2 ومعنى مختلف', state: 'blocked' },
      { label: 'هوية مطلوبة للمصدر الجديد', value: 'traceId جديد', state: 'trusted' }
    ],
    outcome: 'النتيجة: رُفض إعادة الربط وبقي الأثر القديم ثابتًا.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '05-source-trace-rebinding-rejected.png',
    'Immutable source trace identity rejects rebinding',
    records
  );

  const { pack: evidencePack, session: evidenceSession } = syntheticRoot();
  const originalEvidence = resolveOperationalReadinessTrustedEvidence(
    evidenceSession,
    evidencePack,
    activationEvidenceRequest(evidencePack, 'ROLE-SYNTHETIC-9')
  );
  const substitutedEvidence = resolveOperationalReadinessTrustedEvidence(
    evidenceSession,
    evidencePack,
    activationEvidenceRequest(evidencePack, 'ROLE-ATTACKER-ACTIVATION')
  );
  expect(originalEvidence.valid).toBe(true);
  expect(substitutedEvidence.valid).toBe(false);
  await renderEvidenceCard(page, {
    sequence: '06',
    eyebrow: 'دليل التفعيل · هوية الموقّع',
    title: 'دليل الممثل الأصلي لا يجيز ممثلًا مستبدلًا',
    description: 'يرتبط دليل التفعيل بالممثل والسلطة ونوعها وبصمة التعيين والحدث والحزمة. تطابق معرّف الدليل وحده غير كافٍ.',
    facts: [
      { label: 'الممثل الأصلي', value: 'تطابق الدليل', state: 'trusted' },
      { label: 'الممثل البديل', value: 'لا يطابق الموقّع', state: 'blocked' },
      { label: 'بصمة تعيين السلطة', value: 'ملزمة', state: 'trusted' },
      { label: 'إعادة استخدام الدليل', value: 'مرفوضة', state: 'blocked' }
    ],
    outcome: 'النتيجة: دليل التفعيل القديم لا يمنح هوية جديدة سلطة.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '06-activation-evidence-actor-mismatch.png',
    'Activation evidence rejects substituted actor',
    records
  );

  const { pack: exactPack, session: exactSession } = syntheticRoot();
  const forged = materializeOperationalReadinessPackDerivedState({
    ...canonicalOperationalReadinessPack(exactPack),
    revision: 999,
    revisionReason: 'مراجعة مزورة ضمن النطاق نفسه.'
  });
  const forgedEvidence = resolveOperationalReadinessTrustedEvidence(
    exactSession,
    forged,
    {
      evidenceRefs: [waiverEvidenceId],
      authorityKind: 'engineering-authority',
      authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
      resolverAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
      subjectActorRef: 'ROLE-SYNTHETIC-1',
      subjectAuthorityId: 'AUTH-SYNTHETIC-DENOMINATOR',
      subjectAuthorityKind: 'requirement-owner',
      authorityAssignmentFingerprint:
        deriveOperationalReadinessAuthorityAssignmentFingerprint(
          exactPack,
          'AUTH-SYNTHETIC-DENOMINATOR'
        ) ?? '',
      acceptedEvidenceTypes: ['external-record']
    }
  );
  expect(forgedEvidence.valid).toBe(false);
  await renderEvidenceCard(page, {
    sequence: '07',
    eyebrow: 'الحيازة الدقيقة · الدليل',
    title: 'تطابق المشروع والحزمة لا يكفي للوصول إلى الدليل',
    description: 'حزمة بنفس النطاق ادعت المراجعة R999 وبصمة جديدة دون تصريح خاص بها. حارس المراجعة الدقيقة رفض الوصول.',
    facts: [
      { label: 'نطاق المشروع', value: 'مطابق', state: 'neutral' },
      { label: 'المراجعة', value: 'R999 غير مخزنة', state: 'blocked' },
      { label: 'تصريح صالح', value: 'غير موجود', state: 'blocked' },
      { label: 'حل الدليل', value: 'غير صالح', state: 'blocked' }
    ],
    outcome: 'النتيجة: same-scope لا يساوي exact trusted revision.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '07-exact-revision-evidence-rejected.png',
    'Forged same-scope revision cannot resolve evidence',
    records
  );

  const forgedLedger = inspectOperationalReadinessWaiverLedger(
    exactSession,
    forged,
    {
      authorityKind: 'engineering-authority',
      authorityId: 'AUTH-SYNTHETIC-ENGINEERING',
      scopeType: 'pack',
      scopeId: exactPack.id
    }
  );
  expect(forgedLedger.available).toBe(false);
  await renderEvidenceCard(page, {
    sequence: '08',
    eyebrow: 'الحيازة الدقيقة · دفتر الإعفاءات',
    title: 'دفتر الإعفاءات محجوب عن مراجعة غير موثوقة',
    description: 'المراجعة R999 نفسها حاولت فحص رأس الدفتر. لم تُعامل مساواة النطاق كدليل على اتصال السلسلة.',
    facts: [
      { label: 'رأس المراجعات الموثوق', value: 'R1', state: 'trusted' },
      { label: 'المراجعة الطالبة', value: 'R999', state: 'blocked' },
      { label: 'التصريح', value: 'غير موجود', state: 'blocked' },
      { label: 'إتاحة الدفتر', value: 'محجوبة', state: 'blocked' }
    ],
    outcome: 'النتيجة: لا قراءة ولا تغيير للدفتر دون مراجعة أو تصريح بعينه.',
    tone: 'blocked'
  });
  await capture(
    page,
    directory,
    '08-exact-revision-waiver-ledger-rejected.png',
    'Forged same-scope revision cannot inspect waiver ledger',
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
    sequence: '09',
    eyebrow: 'مسار إيجابي · هوية اختبار محلية',
    title: 'المثبت العام يستخدم حيازة السلطة والمصدر نفسها',
    description: 'مثبت غير مرتبط بـ KAP يطابق الجذر المجمّع ويستخدم جلسة صادرة من البوابة وسجل أدلة ودفتر إعفاءات محكومين.',
    facts: [
      { label: 'الجذر المجمّع', value: 'مطابق', state: 'trusted' },
      { label: 'طوبولوجيا السلطة', value: 'مثبتة', state: 'trusted' },
      { label: 'هوية المصدر والأثر', value: 'مثبتة', state: 'trusted' },
      { label: 'الجاهزية التشغيلية', value: 'لا يمكن التحديد', state: 'neutral' }
    ],
    outcome: 'النتيجة: المسار المحلي الصالح يعمل دون ادعاء جاهزية.',
    tone: 'trusted'
  });
  await capture(
    page,
    directory,
    '09-valid-synthetic-positive-path.png',
    'Valid generic local trusted path',
    records
  );

  await renderEvidenceCard(page, {
    sequence: '10',
    eyebrow: 'مقارنة الإغلاق · Stage 3G.1E',
    title: 'الثقة انتقلت من مطابقة النطاق إلى حيازة المراجعة الدقيقة',
    description: 'التصحيح يثبت طوبولوجيا السلطة، وهوية المصدر والأثر، وهوية موقّع الدليل، ويربط الأدلة والدفتر بالمراجعة أو التصريح نفسه.',
    facts: [
      { label: 'قبل · ممثل سلطة جديد', value: 'يمكن إدخاله', state: 'blocked' },
      { label: 'بعد · طوبولوجيا السلطة', value: 'ثابتة في الجذر', state: 'trusted' },
      { label: 'قبل · أثر قديم', value: 'يمكن إعادة ربطه', state: 'blocked' },
      { label: 'بعد · المراجعة R999', value: 'لا تصل للحيازة', state: 'trusted' }
    ],
    outcome: 'حدود محلية صريحة، وليست مصادقة إنتاجية أو شهادة تشفير.',
    tone: 'comparison'
  });
  await capture(
    page,
    directory,
    '10-before-after-custody-comparison.png',
    'Before and after custody boundary comparison',
    records
  );

  expect(records).toHaveLength(10);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every(
    (record) => record.width === viewport.width && record.height === viewport.height
  )).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8'
  }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.1E',
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
