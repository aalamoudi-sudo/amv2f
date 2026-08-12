import { expect, test, type Page, type Route } from '@playwright/test';
import type {
  OperationalAuthorityNotApplicableDeclaration,
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

async function expectSafeAuthorityRejection(page: Page, expectedMessage: string) {
  const rejection = page.getByTestId('readiness-pack-authority-contract-rejection');
  await expect(rejection).toBeVisible();
  await expect(rejection).toContainText('رُفض عقد السلطات');
  await expect(rejection).toContainText(expectedMessage);
  await expect(rejection).toContainText('لم تُجمّد الحزمة ولم تُفعّل ولم تتغير الجاهزية');
  await expect(rejection).not.toContainText('authority-contract-');
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
}

test('shows the nine policy-derived KAP obligations independently from assignments', async ({ page }) => {
  await openPack(page);
  const summary = page.getByTestId('authority-contract-summary');
  await expect(summary).toContainText('٩واجبًا متوقعًا');
  await expect(summary).toContainText('٩تصريحًا مخزنًا');
  await expect(summary).toContainText('٠تعيينًا صالحًا');
  await expect(summary).toContainText('٠عدم تطابق عقدي');
  await expect(page.getByTestId('authority-contract-policy')).toContainText(
    'AUTHORITY-REQUIREMENT-POLICY-v1'
  );
  await expect(page.getByTestId('authority-contract-obligation-readiness-pack-activation')).toContainText(
    'قبل التفعيل'
  );
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toContainText(
    'غير مقيمة · لا يمكن التحديد'
  );
});

test('rejects deletion of expected authority declarations with safe Arabic guidance', async ({ page }) => {
  await page.route(manifestPattern, (route) => mutateManifest(route, (candidate) => {
    candidate.requiredAuthorities = candidate.requiredAuthorities.filter(
      (declaration) => declaration.authorityKind === 'requirement-owner'
    );
    candidate.governance.verificationAuthority = null;
    candidate.governance.internalApprovalAuthority = null;
    candidate.governance.externalAcceptanceAuthority = null;
    candidate.governance.openingDecisionAuthority = null;
    candidate.governance.activationAuthority = null;
  }));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeAuthorityRejection(page, 'تصريح سلطة متوقع من سياسة المنصة مفقود');
});

test('rejects a declaration that points to the wrong authority kind', async ({ page }) => {
  await page.route(manifestPattern, (route) => mutateManifest(route, (candidate) => {
    const verification = candidate.authorityMatrix.find(
      (slot) => slot.authorityKind === 'evidence-verification'
    )!;
    verification.authorityKind = 'internal-approval';
    candidate.governance.verificationAuthority = structuredClone(verification);
  }));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeAuthorityRejection(page, 'خانة من نوع سلطة مختلف');
});

test('rejects reuse of one authority slot for incompatible authority kinds', async ({ page }) => {
  await page.route(manifestPattern, (route) => mutateManifest(route, (candidate) => {
    const authorityId = candidate.requiredAuthorities.find(
      (declaration) => declaration.authorityKind === 'requirement-owner'
    )!.authorityId;
    candidate.requiredAuthorities = candidate.requiredAuthorities.map(
      (declaration) => ({ ...declaration, authorityId })
    );
  }));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeAuthorityRejection(page, 'خانة سلطة واحدة بصورة غير قانونية');
});

test('rejects an incomplete not-applicable declaration without changing readiness', async ({ page }) => {
  await page.route(manifestPattern, (route) => mutateManifest(route, (candidate) => {
    const declaration = candidate.requiredAuthorities.find(
      (item) => item.authorityKind === 'engineering-authority'
    )!;
    const slot = candidate.authorityMatrix.find(
      (item) => item.authorityKind === 'engineering-authority'
    )!;
    declaration.applicable = false;
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
    declaration.notApplicableDeclaration = statement;
    slot.status = 'not-applicable';
    slot.notApplicableDeclaration = structuredClone(statement);
  }));
  await page.goto(`${packUrl}&readinessPackView=authorities`);
  await expectSafeAuthorityRejection(page, 'إقرار عدم الانطباق غير مخول أو غير مكتمل');
});

test('restores the authority deep link without project fallback', async ({ page }) => {
  await openPack(page);
  const expectedUrl = page.url();
  await page.reload();
  await expect(page.getByTestId('authority-contract-summary')).toBeVisible();
  expect(page.url()).toBe(expectedUrl);
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
});
