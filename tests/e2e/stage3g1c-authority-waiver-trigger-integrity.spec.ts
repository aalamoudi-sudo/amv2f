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

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packUrl = `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;
const manifestPattern = '**/*kap-operational-readiness-pack-candidate-v1*.json*';

async function openPack(page: Page, view = 'authorities') {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toBeVisible();
}

async function transformManifest(
  route: Route,
  transform: (candidate: OperationalReadinessPack) => OperationalReadinessPack
) {
  const response = await route.fetch();
  const candidate = await response.json() as OperationalReadinessPack;
  await route.fulfill({
    response,
    contentType: 'application/json',
    body: JSON.stringify(transform(candidate))
  });
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

function assignCanonicalWaiverResolver(pack: OperationalReadinessPack): void {
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

function applyEngineeringWaiver(
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
): OperationalReadinessPack {
  const draft = structuredClone(candidate);
  mutate(draft);
  return materializeOperationalReadinessPackDerivedState(
    canonicalOperationalReadinessPack(draft)
  );
}

async function expectSafeRejection(page: Page, expectedMessage: string) {
  const rejection = page.getByTestId('readiness-pack-authority-contract-rejection');
  await expect(rejection).toBeVisible();
  await expect(rejection).toContainText(expectedMessage);
  await expect(rejection).toContainText('لم تُجمّد الحزمة ولم تُفعّل ولم تتغير الجاهزية');
  await expect(rejection).not.toContainText(/authority-(?:waiver|trigger|contract)-/);
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
}

test('shows KAP trigger policy and blocks waiver of required authorities', async ({ page }) => {
  await openPack(page);
  await expect(page.getByTestId('authority-contract-policy')).toContainText(
    'AUTHORITY-TRIGGER-POLICY-v1'
  );
  await expect(page.getByTestId('authority-contract-policy')).toContainText(
    '١٠ محفزات نشطة'
  );
  const engineering = page.getByTestId('authority-waiver-status-engineering-authority');
  await expect(engineering).toContainText('سلطة مطلوبة: لا يمكن إعفاؤها');
  await expect(engineering).toContainText('لا يوجد سجل إعفاء');
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toContainText(
    'غير مقيمة · لا يمكن التحديد'
  );
});

test('rejects a required engineering waiver with Arabic-safe guidance', async ({ page }) => {
  await page.route(manifestPattern, (route) => transformManifest(route, (candidate) =>
    materialize(candidate, (draft) => {
      assignCanonicalWaiverResolver(draft);
      applyEngineeringWaiver(draft);
    })
  ));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeRejection(page, 'لا يمكن إعفاء سلطة مطلوبة أو مرتبطة بمحفز نشط');
});

test('rejects a fabricated authorizer that is not the canonical resolver', async ({ page }) => {
  await page.route(manifestPattern, (route) => transformManifest(route, (candidate) =>
    materialize(candidate, (draft) => {
      assignCanonicalWaiverResolver(draft);
      makeEngineeringConditional(draft);
      applyEngineeringWaiver(draft, {
        authorizedActorRef: 'ROLE-FABRICATED-WAIVER'
      });
    })
  ));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeRejection(page, 'جهة حل الإعفاء غير قانونية');
});

test('rejects an unresolved evidence string through the legal resolver boundary', async ({ page }) => {
  await page.route(manifestPattern, (route) => transformManifest(route, (candidate) =>
    materialize(candidate, (draft) => {
      assignCanonicalWaiverResolver(draft);
      makeEngineeringConditional(draft);
      applyEngineeringWaiver(draft, {
        evidenceRefs: ['FAKE']
      });
    })
  ));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeRejection(page, 'دليل الإعفاء غير موجود في سجل الأدلة القانوني');
});

test('rejects invalid waiver chronology without exposing internal codes', async ({ page }) => {
  await page.route(manifestPattern, (route) => transformManifest(route, (candidate) =>
    materialize(candidate, (draft) => {
      assignCanonicalWaiverResolver(draft);
      makeEngineeringConditional(draft);
      applyEngineeringWaiver(draft, {
        declaredAt: ''
      });
    })
  ));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeRejection(page, 'وقت الإعفاء أو ثقة الزمن أو تسلسل المراجعة غير صالح');
});

test('rejects a mutable trigger downgrade and keeps the obligation blocked', async ({ page }) => {
  await page.route(manifestPattern, (route) => transformManifest(route, (candidate) =>
    materialize(candidate, (draft) => {
      const requirement = draft.requirements.find(
        (item) => item.id === 'REQ-KAP-CAD-WORKING-SOURCE'
      )!;
      requirement.category = 'generic';
      requirement.requirementType = 'generic';
      requirement.authorityImpactKinds = [];
      requirement.spatialScopeStatus = 'explicitly-not-applicable';
    })
  ));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeRejection(page, 'تغيرت حقائق تؤثر في السلطة أو لم تطابق مرساة مراجعة موثوقة');
});

test('restores the authority and eligibility deep links without fallback', async ({ page }) => {
  await openPack(page, 'eligibility');
  const expectedUrl = page.url();
  await page.reload();
  await expect(page.getByTestId('eligibility-authority-contract')).toBeVisible();
  expect(page.url()).toBe(expectedUrl);
  await page.goBack();
  await page.goForward();
  expect(page.url()).toBe(expectedUrl);
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
});
