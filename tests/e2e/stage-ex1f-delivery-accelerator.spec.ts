import { expect, test } from './test-fixtures';
import type { Page } from '@playwright/test';

const scope = 'project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&venue=VENUE-KAP-001';
const deliveryUrl = `/?workspace=experience-twin&${scope}&experienceMode=delivery`;

function canonicalUrl(value: string): string {
  const url = new URL(value);
  url.searchParams.sort();
  return url.href;
}

async function expectDeliveryCenter(page: Page) {
  const workspace = page.getByTestId('experience-twin-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(workspace).toHaveAttribute('data-project-id', 'PROJECT-KAP-OPENING-2026');
  await expect(page.getByTestId('experience-delivery-control-center')).toBeVisible();
}

test('shows the verified V.11 receipt without acceptance, route or readiness promotion', async ({ page }) => {
  await page.goto(deliveryUrl);
  await expectDeliveryCenter(page);
  const center = page.getByTestId('experience-delivery-control-center');
  await expect(center).toHaveAttribute('data-real-operational-received', '1');
  await expect(center).toHaveAttribute('data-real-studio-received', '0');
  await expect(page.getByTestId('experience-delivery-lane-operational')).toContainText('استُلمت V.11 وتحققت بصمتها');
  await expect(page.getByTestId('experience-delivery-lane-studio-3d')).toContainText('بانتظار حزمة 3D و360 من استوديو التصميم');
  await expect(center).toContainText('حزم مقبولة: 0');
  await expect(center).toContainText('مسارات معتمدة: 0');
  await expect(center).toContainText('لا يمكن تحديدها');
  await expect(center).not.toContainText('جاهزية 0%');
});

test('opens all six V.11 journeys with stable day and persona selection', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=routes`);
  await expectDeliveryCenter(page);
  await expect(page.getByTestId('delivery-route-review')).toHaveAttribute('data-package-status', 'received-validated-working-candidate');
  await expect(page.getByTestId('v11-source-status')).toContainText('بصمة المصدر متطابقة');
  const journeyIds = [
    'JOURNEY-KAP-20261031-WORKERS-V11',
    'JOURNEY-KAP-20261031-MAYOR-V11',
    'JOURNEY-KAP-20261102-LEADERSHIP-V11',
    'JOURNEY-KAP-20261102-GUESTS-V11',
    'JOURNEY-KAP-20261103-HOST-MINISTER-V11',
    'JOURNEY-KAP-20261103-MEDIA-V11'
  ];
  for (const journeyId of journeyIds) {
    const journeyButton = page.getByTestId(`v11-journey-${journeyId}`);
    if (!(await journeyButton.isVisible())) {
      const dayId = journeyId.includes('20261031') ? 'DAY-KAP-2026-10-31' : journeyId.includes('20261102') ? 'DAY-KAP-2026-11-02' : 'DAY-KAP-2026-11-03';
      await page.getByTestId(`v11-day-${dayId}`).click();
    }
    await page.getByTestId(`v11-journey-${journeyId}`).click();
    await expect(page.getByTestId('v11-active-journey')).toHaveAttribute('data-journey-id', journeyId);
    await expect(page.getByTestId('v11-active-journey')).toHaveAttribute('data-duration-accounting', 'inclusive');
    await expect(page).toHaveURL(new RegExp(`deliveryJourney=${journeyId}`));
  }
});

test('shows the founder-clarified inclusive media duration without an active duration blocker', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=routes&deliveryJourneyDay=DAY-KAP-2026-11-03&deliveryJourney=JOURNEY-KAP-20261103-MEDIA-V11`);
  await expectDeliveryCenter(page);
  const active = page.getByTestId('v11-active-journey');
  await expect(active).toContainText('275');
  await expect(active).toContainText('شامل');
  await expect(page.getByTestId('v11-duration-accounting')).toContainText('إجمالي شامل · لا جمع مزدوج');
  await expect(page.getByTestId('v11-duration-history')).toContainText('القراءة السابقة 255 دقيقة؛ الإسقاط الحالي 275 دقيقة');
  await expect(page.getByTestId('v11-duration-history')).toContainText('resolved-by-inclusive-duration-accounting');
  await expect(page.getByTestId('v11-route-inspector')).toContainText('رسم توضيحي غير مسجل');
  await expect(page.getByTestId('v11-route-inspector')).not.toContainText('إجمالي رحلة الإعلام لا يطابق نافذة الوقت');
  await expect(page.getByTestId('v11-route-inspector')).not.toContainText('فرق الجمع التسلسلي السابق 8.5 دقيقة', { useInnerText: true });
  await expect(page.getByTestId('v11-route-inspector')).toContainText('لا CRS');
  await expect(page.getByTestId('experience-delivery-control-center')).toContainText('مسارات معتمدة: 0');
});

test('shows 1 November as not applicable and restores its deep link without a route blocker', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=routes&deliveryJourneyDay=DAY-KAP-2026-11-01`);
  await expectDeliveryCenter(page);
  const correction = page.getByTestId('v11-route-not-applicable-20261101');
  await expect(correction).toContainText('لا تنطبق رحلة تشغيلية في 1 نوفمبر');
  await expect(correction).toContainText('لا مسار زائر · لا خط بين الموقعين · لا مدة سفر · لا بوابة استقبال مخترعة');
  await expect(page.getByTestId('v11-missing-route-20261101')).toHaveCount(0);
  const expected = canonicalUrl(page.url());
  await page.reload();
  await expect(page.getByTestId('v11-route-not-applicable-20261101')).toBeVisible();
  expect(canonicalUrl(page.url())).toBe(expected);
});

test('compares V.02, V.11 and the frozen rehearsal without automatic supersession', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=routes&deliveryJourneyDay=DAY-KAP-2026-10-31&deliveryJourney=JOURNEY-KAP-20261031-WORKERS-V11`);
  await expectDeliveryCenter(page);
  await expect(page.getByTestId('v11-rehearsal-comparison')).toContainText('خطة البروفة');
  await expect(page.getByTestId('v11-rehearsal-comparison')).toContainText('V.11 لا يكتب فوق أي مراجعة');
  await expect(page.getByTestId('v02-v11-coexistence')).toContainText('استبدال مقترح لا تلقائي');
  await expect(page.getByTestId('v02-v11-coexistence')).toContainText('يبقى V.02 دليلًا تاريخيًا مرشحًا');
});

test('previews deterministic fictional operational reconciliation and preserves conflicts', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=operational&deliveryScenario=operational-valid`);
  await expectDeliveryCenter(page);
  await expect(page.getByTestId('delivery-operational-preview')).toContainText('مختبر جاف معزول');
  await expect(page.getByRole('table')).toContainText('برنامج!R12');
  await expect(page.getByRole('table')).toContainText('18:00');
  await expect(page.getByRole('table')).toContainText('18:15');
  await page.getByTestId('delivery-scenario-operational-conflict').click();
  await expect(page).toHaveURL(/deliveryScenario=operational-conflict/);
  await expect(page.getByTestId('delivery-scenario-summary')).toContainText('يُحفظ كتعارض ولا يُحسم');
  await expect(page.getByRole('table')).toContainText('إنشاء تعارض');
});

test('classifies fictional GLB, panorama and rights failures without touching Scene Gateway', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=studio&deliveryScenario=glb-valid`);
  await expectDeliveryCenter(page);
  await expect(page.getByTestId('delivery-studio-result')).toHaveAttribute('data-scenario', 'glb-valid');
  await expect(page.getByTestId('delivery-studio-result')).toContainText('معاينة مرشحة فقط');
  await page.getByTestId('delivery-scenario-glb-invalid').click();
  await expect(page.getByTestId('delivery-studio-result')).toContainText('محجوب');
  await page.getByTestId('delivery-scenario-panorama-flat').click();
  await expect(page.getByTestId('delivery-studio-result')).toContainText('لا يُمدد على كرة');
  await page.getByTestId('delivery-scenario-rights-blocked').click();
  await expect(page.getByTestId('delivery-studio-result')).toContainText('الحقوق غير مكتملة');
  await expect(page.getByTestId('delivery-studio-result')).toContainText('مفقودة');
});

test('accepts, binds and rolls back only the isolated fictional revision', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=operational&deliveryScenario=operational-valid`);
  await expectDeliveryCenter(page);
  await page.getByTestId('delivery-accept-fictional').click();
  await page.getByTestId('delivery-view-revisions').click();
  await expect(page.getByTestId('delivery-revision-ledger')).toContainText('مقبول كمرشح خيالي');
  await page.getByTestId('delivery-bind-fictional').click();
  await expect(page.getByTestId('delivery-revision-ledger')).toContainText('مرتبط خياليًا');
  await page.getByTestId('delivery-rollback-fictional').click();
  await expect(page.getByTestId('delivery-revision-ledger')).toContainText('مراجعة رجوع');
  const footer = page.locator('.experience-delivery-control-footer');
  await expect(footer).toContainText('حزم مقبولة: 0');
  await expect(footer).toContainText('مسارات معتمدة: 0');
});

test('keeps ZONE-SHOW unresolved and all real asset slots missing', async ({ page }) => {
  await page.goto(`${deliveryUrl}&deliveryView=mapping`);
  await expectDeliveryCenter(page);
  const show = page.getByTestId('delivery-mapping-ZONE-SHOW-001');
  await expect(show).toContainText('غير محسوم بلا مرساة');
  await expect(show).toContainText('مفقود');
  await expect(page.locator('.delivery-mapping-grid > article')).toHaveCount(16);
});

test('restores delivery deep links and browser history without external traffic', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(request.url());
  });
  await page.goto(`${deliveryUrl}&deliveryView=variants`);
  await expectDeliveryCenter(page);
  await expect(page.getByTestId('delivery-day-variants').locator('article')).toHaveCount(4);
  await page.getByTestId('delivery-view-deployment').click();
  await expect(page).toHaveURL(/deliveryView=deployment/);
  await page.goBack();
  await expect(page.getByTestId('delivery-day-variants')).toBeVisible();
  const expected = page.url();
  await page.reload();
  await expectDeliveryCenter(page);
  expect(canonicalUrl(page.url())).toBe(canonicalUrl(expected));
  expect(external).toEqual([]);
});

test('supports keyboard navigation and has no horizontal page overflow', async ({ page }) => {
  await page.goto(deliveryUrl);
  await expectDeliveryCenter(page);
  await page.getByTestId('delivery-view-operational').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('delivery-operational-preview')).toBeVisible();
  await expect(page.getByTestId('delivery-view-operational')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
