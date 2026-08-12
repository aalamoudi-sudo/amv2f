import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page, type Route } from '@playwright/test';
import {
  canonicalOperationalReadinessPack,
  materializeOperationalReadinessPackDerivedState
} from '../../src/services/operationalReadinessPack';
import {
  createOperationalAuthorityTriggerFacts,
  deriveOperationalAuthorityTriggerFingerprint
} from '../../src/services/operationalAuthorityTriggerPolicy';
import { deriveExpectedOperationalAuthorities } from '../../src/services/operationalAuthorityRequirementPolicy';
import { createOperationalAuthorityWaiverRecord } from '../../src/services/operationalAuthorityWaiver';
import type {
  OperationalAuthorityKind,
  OperationalReadinessPack
} from '../../src/types/operationalReadinessPack';

const bundleName = 'mayadeen-stage-3g1c-authority-waiver-trigger-integrity-review';
const reviewRoot = process.env.STAGE3G1C_REVIEW_DIR
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

async function openPack(page: Page, view: 'authorities' | 'eligibility') {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  const workspace = page.getByTestId('operational-readiness-pack-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
}

function authority(
  pack: OperationalReadinessPack,
  kind: OperationalAuthorityKind
) {
  return pack.authorityMatrix.find((candidate) => candidate.authorityKind === kind)!;
}

function declaration(
  pack: OperationalReadinessPack,
  kind: OperationalAuthorityKind
) {
  return pack.requiredAuthorities.find((candidate) => candidate.authorityKind === kind)!;
}

function assignResolver(pack: OperationalReadinessPack): void {
  const resolver = authority(pack, 'requirement-owner');
  resolver.status = 'assigned';
  resolver.classification = 'source-backed';
  resolver.actor = {
    actorRef: 'ROLE-LOCAL-WAIVER-RESOLVER',
    displayNameAr: 'دور حل إعفاء اختباري محلي',
    actorType: 'role',
    classification: 'source-backed',
    sourceTraceIds: [...resolver.sourceTraceIds],
    founderDirectionReference: null,
    assignmentScope: pack.id,
    authorityLimitations: ['هوية اختبار محلية فقط.']
  };
  pack.governance.requirementAuthority = structuredClone(resolver);
}

function makeEngineeringConditional(pack: OperationalReadinessPack): void {
  pack.requirements.forEach((requirement) => {
    requirement.authorityImpactKinds = requirement.authorityImpactKinds.filter(
      (kind) => kind !== 'engineering-authority'
    );
    if (requirement.spatialScopeStatus === 'mapped-candidate') {
      requirement.spatialScopeStatus = 'explicitly-not-applicable';
    }
  });
  pack.spatialRelationships.forEach((relationship) => {
    if (relationship.spatialScopeStatus === 'mapped-candidate') {
      relationship.spatialScopeStatus = 'explicitly-not-applicable';
    }
  });
  pack.authorityTriggerFacts = createOperationalAuthorityTriggerFacts({
    requirements: pack.requirements,
    revision: pack.revision
  });
  pack.authorityTriggerFingerprint = deriveOperationalAuthorityTriggerFingerprint(
    pack.authorityTriggerFacts
  );
}

function applyWaiver(
  pack: OperationalReadinessPack,
  overrides: Partial<Parameters<typeof createOperationalAuthorityWaiverRecord>[0]> = {}
): void {
  const expected = deriveExpectedOperationalAuthorities(pack).find(
    (candidate) => candidate.authorityKind === 'engineering-authority'
  )!;
  const required = declaration(pack, 'engineering-authority');
  const slot = authority(pack, 'engineering-authority');
  const resolver = authority(pack, 'requirement-owner');
  const waiver = createOperationalAuthorityWaiverRecord({
    policyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    policyRuleId: expected.policyRuleId,
    authorityKind: 'engineering-authority',
    authorityId: required.authorityId,
    scopeType: expected.requiredScopeType,
    scopeId: expected.requiredScopeId,
    reasonAr: 'إعفاء اختباري لفحص الرفض الآمن فقط.',
    triggeredBySnapshot: [...expected.triggeredBy],
    resolverAuthorityId: resolver.authorityId,
    authorizedActorRef: resolver.actor?.actorRef ?? 'ROLE-MISSING-WAIVER-RESOLVER',
    sourceTraceIds: [...required.sourceTraceIds],
    evidenceRefs: ['EVIDENCE-UNRESOLVED-WAIVER'],
    evidenceRegistryFingerprint: '0'.repeat(64),
    authorityReference: resolver.authorityId,
    revision: pack.revision,
    declaredAt: pack.createdAt,
    timeTrust: 'local-test-clock',
    previousWaiverHash: null,
    ...overrides
  });
  required.applicable = false;
  required.notApplicableDeclaration = structuredClone(waiver);
  slot.status = 'not-applicable';
  slot.actor = null;
  slot.notApplicableDeclaration = structuredClone(waiver);
}

function materialize(
  candidate: OperationalReadinessPack,
  mutate: (draft: OperationalReadinessPack) => void
) {
  const draft = structuredClone(candidate);
  mutate(draft);
  return materializeOperationalReadinessPackDerivedState(
    canonicalOperationalReadinessPack(draft)
  );
}

async function transformManifest(
  route: Route,
  mutate: (draft: OperationalReadinessPack) => void
) {
  const response = await route.fetch();
  const candidate = await response.json() as OperationalReadinessPack;
  const transformed = materialize(candidate, mutate);
  await route.fulfill({
    response,
    contentType: 'application/json',
    body: JSON.stringify(transformed)
  });
}

async function captureRejection(
  page: Page,
  directory: string,
  file: string,
  state: string,
  records: ScreenshotRecord[],
  expectedText: string,
  mutate: (draft: OperationalReadinessPack) => void
) {
  await page.route(manifestPattern, (route) => transformManifest(route, mutate));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  const rejection = page.getByTestId('readiness-pack-authority-contract-rejection');
  await expect(rejection).toBeVisible();
  await expect(rejection).toContainText(expectedText);
  await expect(rejection).not.toContainText(/authority-(?:waiver|trigger|contract)-/);
  const specificReason = rejection.getByText(expectedText, { exact: false }).first();
  await specificReason.scrollIntoViewIfNeeded();
  const previousStyle = await specificReason.getAttribute('style');
  await specificReason.evaluate((element) => {
    element.style.outline = '4px solid #c06b32';
    element.style.outlineOffset = '5px';
  });
  await rejection.evaluate((element, text) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      const value = current.textContent ?? '';
      const start = value.indexOf(text);
      if (start >= 0) {
        const range = document.createRange();
        range.setStart(current, start);
        range.setEnd(current, start + text.length);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }
      current = walker.nextNode();
    }
  }, expectedText);
  await capture(page, directory, file, state, records);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await specificReason.evaluate((element, style) => {
    if (style === null) element.removeAttribute('style');
    else element.setAttribute('style', style);
  }, previousStyle);
  await page.unroute(manifestPattern);
}

test('captures eight distinct Stage 3G.1C waiver and trigger integrity states', async ({ page }, testInfo) => {
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
    '01-kap-authority-trigger-summary.png',
    'KAP authority and trigger contract summary',
    records,
    'authority-contract-summary'
  );
  await captureFocused(
    page,
    directory,
    '02-required-engineering-cannot-be-waived.png',
    'Required engineering authority cannot be waived',
    records,
    'authority-waiver-status-engineering-authority'
  );

  await openPack(page, 'eligibility');
  await captureFocused(
    page,
    directory,
    '03-kap-pre-freeze-pre-activation-blocked.png',
    'KAP pre-freeze and pre-activation blocked state',
    records,
    'eligibility-authority-contract'
  );

  await captureRejection(
    page,
    directory,
    '04-required-authority-waiver-rejected.png',
    'Required authority waiver rejection',
    records,
    'لا يمكن إعفاء سلطة مطلوبة',
    (draft) => {
      assignResolver(draft);
      applyWaiver(draft);
    }
  );
  await captureRejection(
    page,
    directory,
    '05-fabricated-authorizer-rejected.png',
    'Fabricated authorizer rejection',
    records,
    'جهة حل الإعفاء غير قانونية',
    (draft) => {
      assignResolver(draft);
      makeEngineeringConditional(draft);
      applyWaiver(draft, { authorizedActorRef: 'ROLE-FABRICATED-WAIVER' });
    }
  );
  await captureRejection(
    page,
    directory,
    '06-unresolved-evidence-rejected.png',
    'Unresolved waiver evidence rejection',
    records,
    'دليل الإعفاء غير موجود في سجل الأدلة القانوني',
    (draft) => {
      assignResolver(draft);
      makeEngineeringConditional(draft);
      applyWaiver(draft, { evidenceRefs: ['FAKE'] });
    }
  );
  await captureRejection(
    page,
    directory,
    '07-invalid-chronology-rejected.png',
    'Invalid waiver chronology rejection',
    records,
    'وقت الإعفاء أو ثقة الزمن أو تسلسل المراجعة غير صالح',
    (draft) => {
      assignResolver(draft);
      makeEngineeringConditional(draft);
      applyWaiver(draft, { declaredAt: '' });
    }
  );
  await captureRejection(
    page,
    directory,
    '08-trigger-downgrade-rejected.png',
    'Mutable authority trigger downgrade rejection',
    records,
    'تغيرت حقائق تؤثر في السلطة أو لم تطابق مرساة مراجعة موثوقة',
    (draft) => {
      const requirement = draft.requirements.find(
        (item) => item.id === 'REQ-KAP-CAD-WORKING-SOURCE'
      )!;
      requirement.category = 'generic';
      requirement.requirementType = 'generic';
      requirement.authorityImpactKinds = [];
      requirement.spatialScopeStatus = 'explicitly-not-applicable';
    }
  );

  expect(records).toHaveLength(8);
  expect(new Set(records.map((record) => record.sha256)).size).toBe(records.length);
  expect(records.every(
    (record) => record.width === viewport.width && record.height === viewport.height
  )).toBe(true);
  const featureCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await writeFile(path.join(directory, 'screenshots.json'), `${JSON.stringify({
    stage: '3G.1C',
    projectId,
    eventId,
    venueId,
    packId: 'READINESS-PACK-KAP-OPERATIONAL-CANDIDATE-2026-v1',
    packFingerprint,
    authorityPolicyId: 'AUTHORITY-REQUIREMENT-POLICY-v1',
    authorityTriggerPolicyId: 'AUTHORITY-TRIGGER-POLICY-v1',
    featureCommit,
    playwrightProject: testInfo.project.name,
    generatedAt: new Date().toISOString(),
    screenshots: records
  }, null, 2)}\n`, 'utf8');
});
