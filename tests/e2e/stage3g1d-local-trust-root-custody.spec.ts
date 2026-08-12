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
const packHash =
  '78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc';
const packUrl =
  `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;
const manifestPattern = '**/*kap-operational-readiness-pack-candidate-v1*.json*';

async function openPack(page: Page, view = 'summary') {
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

test('loads KAP only through the compiled local trust root', async ({ page }) => {
  const workspace = await openPack(page);
  const trust = page.getByTestId('readiness-pack-trust-status');
  await expect(trust).toBeVisible();
  await expect(trust).toContainText('سلسلة الثقة المحلية مثبتة لهذه المراجعة');
  await expect(trust).toContainText('R1');
  await expect(trust).toContainText('سجل الأدلة');
  await expect(trust).toContainText('غير متاح');
  await expect(trust).toContainText('دفتر الإعفاءات');
  await expect(trust).toContainText('مثبت');
  await expect(workspace).toContainText('غير مقيمة · لا يمكن التحديد');
  await expect(workspace).toContainText('٦١٫٧٪');
});

test('rejects a self-rehashed manifest instead of issuing a new root', async ({ page }) => {
  await page.route(manifestPattern, (route) => mutateManifest(route, (draft) => {
    draft.revisionReason = 'محاولة إصدار جذر ثقة من الحزمة نفسها.';
  }));
  await page.goto(`${packUrl}&readinessPackView=summary`);
  const rejection = page.getByTestId('readiness-pack-trust-rejection');
  await expect(rejection).toBeVisible();
  await expect(rejection).toContainText(
    'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
  );
  await expect(rejection).toContainText(
    'لم يُثبت سجل الأدلة أو دفتر حيازة الإعفاءات من بيانات المتصفح'
  );
  await expect(rejection).not.toContainText(
    /authority-trigger-trust-session|OPERATIONAL_TRUST/
  );
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
});

test('rejects browser localStorage revision injection and restores the trusted root', async ({ page }) => {
  await openPack(page);
  const injected = await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((candidate) =>
      candidate.startsWith('mayadeen:operational-readiness-authoring:')
    );
    if (!key) return false;
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    if (!state.revisions?.[0]?.pack) return false;
    state.revisions[0].pack.revisionReason = 'LOCALSTORAGE-SELF-ANCHOR-INJECTION';
    state.revisions[0].pack.contentHash = 'a'.repeat(64);
    state.revisions[0].contentHash = 'a'.repeat(64);
    window.localStorage.setItem(key, JSON.stringify(state));
    return true;
  });
  expect(injected).toBe(true);
  await page.reload({ waitUntil: 'networkidle' });
  const workspace = page.getByTestId('operational-readiness-pack-workspace');
  await expect(workspace).toBeVisible();
  await expect(page.getByTestId('readiness-pack-trust-status')).toContainText(
    'سلسلة الثقة المحلية مثبتة لهذه المراجعة'
  );
  await workspace.getByRole('button', { name: 'الحقيقة التقنية' }).click();
  const drawer = page.getByTestId('readiness-pack-technical-drawer');
  await expect(drawer).toContainText(packHash);
  await expect(drawer).not.toContainText('LOCALSTORAGE-SELF-ANCHOR-INJECTION');
});

test('keeps KAP authority, eligibility and readiness truth unchanged', async ({ page }) => {
  const workspace = await openPack(page, 'eligibility');
  await expect(page.getByTestId('pre-freeze-gate-group')).toContainText(
    'محجوب ١٥ من'
  );
  await expect(page.getByTestId('pre-activation-gate-group')).toContainText(
    'محجوب ٥ من'
  );
  await expect(workspace).toContainText('غير مقيمة · لا يمكن التحديد');
  await page.getByTestId('readiness-pack-view-authorities').click();
  await expect(page.getByTestId(/^authority-contract-obligation-/))
    .toHaveCount(9);
  await expect(page.getByTestId('authority-contract-summary')).toContainText(
    '٠تعيينًا صالحًا'
  );
});

test('preserves deep links and rejects foreign scope without demo fallback', async ({ page }) => {
  const direct = `${packUrl}&readinessPackView=authorities`;
  await page.goto(direct);
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toBeVisible();
  const expectedUrl = page.url();
  await page.reload({ waitUntil: 'networkidle' });
  expect(page.url()).toBe(expectedUrl);
  await page.goto(
    '/?workspace=readiness-pack&project=PROJECT-FOREIGN&event=EVENT-FOREIGN&venue=VENUE-FOREIGN'
  );
  await expect(page.getByText(
    'معرّف المشروع غير معروف: PROJECT-FOREIGN. عُدت إلى المحفظة دون fallback.'
  )).toBeVisible();
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toHaveCount(0);
  await expect(page.getByRole('button', {
    name: 'المشروع النشط لا يوجد مشروع محدد سياق محايد وآمن'
  })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('project')).toBeNull();
});
