import { expect, test, type Page } from '@playwright/test';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const packUrl = `/?workspace=readiness-pack&project=${projectId}&event=${eventId}&venue=${venueId}`;

async function openPack(page: Page, view = 'summary') {
  await page.goto(`${packUrl}&readinessPackView=${view}`);
  await expect(page.getByTestId('operational-readiness-pack-workspace')).toBeVisible();
}

test('shows corrected derived preparation, complete conflicts, and split lifecycle gates', async ({ page }) => {
  await openPack(page);
  await expect(page.getByTestId('pack-preparation-completeness')).toHaveText('٦١٫٧٪');
  await expect(page.getByTestId('readiness-pack-summary-view')).toContainText('٥ تعارضات مفتوحة');
  await expect(page.getByTestId('operational-readiness-cannot-determine')).toHaveText('لا يمكن التحديد');

  await page.getByTestId('readiness-pack-view-workstreams').click();
  const comparison = page.getByTestId('execution-candidate-comparison');
  await expect(comparison).toContainText('محمد إبراهيم');
  await expect(comparison).toContainText('جوزيف حداد');
  await expect(comparison).toContainText('التغطية المحتسبة: لا أحد');
  await expect(page.getByTestId('governance-conflict-register')).toContainText('٥ تعارضات غير محلولة');

  await page.getByTestId('readiness-pack-view-eligibility').click();
  await expect(page.getByTestId('pre-freeze-gate-group')).toContainText('محجوب ١٥ من');
  await expect(page.getByTestId('pre-activation-gate-group')).toContainText('محجوب ٥ من');
  await expect(page.getByTestId('readiness-pack-eligibility-view')).toContainText(
    'حتى الأساس المفعّل يحتاج تقييم أدلة لاحقًا'
  );
});

test('shows verified source revision lineage and immutable fingerprints', async ({ page }) => {
  await openPack(page, 'sources');
  const source = page.getByTestId('source-record-SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001');
  await expect(source).toContainText('البصمة متطابقة');
  await expect(source).toContainText('R1');
  await page.getByRole('button', { name: 'الحقيقة التقنية' }).click();
  const drawer = page.getByTestId('readiness-pack-technical-drawer');
  await expect(drawer).toContainText('9bc85024e3d1d8707518582607d1200560e4d64d0d5ef4902f01d971c6301f97');
  await expect(drawer).toContainText('900cd8a205b170e4893fb2a938a98628925a504dfb13b20ee045131b3f7d5530');
  await expect(drawer).toContainText('78de9ad4e49781cf24e0fac51e5834cb99dd47e9daf07fd13d8bea1856b35ccc');
});

test('fails closed when the fetched candidate is tampered without using fallback data', async ({ page }) => {
  await page.route('**/*kap-operational-readiness-pack-candidate-v1*.json*', async (route) => {
    const response = await route.fetch();
    const candidate = await response.json();
    candidate.activationStatus = 'activated';
    candidate.operationalReadiness = 'verified-ready';
    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify(candidate)
    });
  });
  await page.goto(`${packUrl}&readinessPackView=summary`);
  const rejection = page.getByTestId('readiness-pack-trust-rejection');
  await expect(rejection).toBeVisible();
  await expect(rejection).toContainText(
    'تعذر إثبات سلسلة الثقة المحلية. التجميد والتفعيل محجوبان.'
  );
  await expect(rejection).toContainText(
    'لم يُثبت سجل الأدلة أو دفتر حيازة الإعفاءات من بيانات المتصفح'
  );
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
});

test('quarantines a source fingerprint mismatch without exposing or using the source', async ({ page }) => {
  await page.route('**/*kap-operational-readiness-pack-candidate-v1*.json*', async (route) => {
    const response = await route.fetch();
    const candidate = await response.json();
    candidate.sourceRegistry[0].observedSha256 = '0'.repeat(64);
    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify(candidate)
    });
  });
  await page.goto(`${packUrl}&readinessPackView=sources`);
  const quarantine = page.getByTestId('readiness-pack-source-quarantine');
  await expect(quarantine).toBeVisible();
  await expect(quarantine).toContainText('حُجرت الحزمة');
  await expect(quarantine).toContainText('لم يُستخدم المصدر ولم تتغير الجاهزية');
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المؤقت');
});
