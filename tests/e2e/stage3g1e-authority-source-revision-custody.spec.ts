import { expect, test, type Page, type Route } from '@playwright/test';
import {
  canonicalOperationalReadinessPack,
  materializeOperationalReadinessPackDerivedState
} from '../../src/services/operationalReadinessPack';
import type {
  OperationalReadinessPack
} from '../../src/types/operationalReadinessPack';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packUrl =
  `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;
const manifestPattern = '**/*kap-operational-readiness-pack-candidate-v1*.json*';

async function openPack(page: Page, view = 'eligibility') {
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

test('shows the five exact-custody boundaries without changing KAP truth', async ({ page }) => {
  const workspace = await openPack(page);

  await expect(page.getByTestId('authority-topology-custody')).toContainText(
    'محمية بجذر الثقة'
  );
  await expect(page.getByTestId('source-trace-custody')).toContainText(
    'ثابتة وغير قابلة لإعادة الربط'
  );
  await expect(page.getByTestId('exact-revision-custody')).toContainText(
    'تطابق مراجعة موثوقة بعينها'
  );
  await expect(page.getByTestId('activation-evidence-actor-custody')).toContainText(
    'دليل تفعيل موثوق غير متاح'
  );
  await expect(page.getByTestId('waiver-ledger-exact-custody')).toContainText(
    'متصل بالرأس الموثوق'
  );

  await expect(page.getByTestId('pre-freeze-gate-group')).toContainText(
    'محجوب ١٥ من'
  );
  await expect(page.getByTestId('pre-activation-gate-group')).toContainText(
    'محجوب ٥ من'
  );
  await expect(workspace).toContainText('غير مقيمة · لا يمكن التحديد');
});

test('rejects a re-hashed authority actor injection with an Arabic safe state', async ({ page }) => {
  await page.route(manifestPattern, (route) => mutateManifest(route, (draft) => {
    const activation = draft.authorityMatrix.find(
      (authority) =>
        authority.authorityKind === 'readiness-pack-activation'
    );
    if (!activation) {
      throw new Error('Activation authority fixture is missing.');
    }
    activation.status = 'assigned';
    activation.classification = 'source-backed';
    activation.actor = {
      actorRef: 'ROLE-ATTACKER-ACTIVATION',
      displayNameAr: 'هوية مهاجم اصطناعية',
      actorType: 'role',
      classification: 'source-backed',
      sourceTraceIds: [...activation.sourceTraceIds],
      founderDirectionReference: null,
      assignmentScope: activation.scopeId,
      authorityLimitations: []
    };
    draft.governance.activationAuthority = structuredClone(activation);
  }));

  await page.goto(`${packUrl}&readinessPackView=eligibility`);
  const rejection = page.getByTestId('readiness-pack-trust-rejection');
  await expect(rejection).toBeVisible();
  await expect(rejection).toContainText(
    'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
  );
  await expect(rejection).not.toContainText(
    /OPERATIONAL_TRUST|WeakMap|stack|Error:/
  );
  await expect(page.getByTestId('operational-readiness-pack-workspace'))
    .toHaveCount(0);
});

test('keeps custody fingerprints in technical disclosure and preserves the deep link', async ({ page }) => {
  await openPack(page);
  const expectedUrl = page.url();
  await page.getByRole('button', { name: 'الحقيقة التقنية' }).click();
  const drawer = page.getByTestId('readiness-pack-technical-drawer');

  await expect(drawer).toContainText('Authority topology custody');
  await expect(drawer).toContainText('Source binding custody');
  await expect(drawer).toContainText('Trace binding custody');
  await expect(drawer.locator('dd')).toContainText([
    /[a-f0-9]{64}/
  ]);

  await page.getByRole('button', { name: 'إغلاق الحقيقة التقنية' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  expect(page.url()).toBe(expectedUrl);
  await expect(page.getByTestId('operational-readiness-pack-workspace'))
    .toBeVisible();
});

test('rejects foreign scope without demo fallback', async ({ page }) => {
  await page.goto(
    '/?workspace=readiness-pack&project=PROJECT-FOREIGN&event=EVENT-FOREIGN&venue=VENUE-FOREIGN'
  );
  await expect(page.getByText(
    'معرّف المشروع غير معروف: PROJECT-FOREIGN. عُدت إلى المحفظة دون fallback.'
  )).toBeVisible();
  await expect(page.getByTestId('operational-readiness-pack-workspace'))
    .toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('project')).toBeNull();
});
