import { expect, test } from '@playwright/test';

const projectId = 'PROJECT-KAP-OPENING-2026';
const eventId = 'EVENT-KAP-OPENING-2026';
const venueId = 'VENUE-KAP-001';
const candidateLayerId = 'SOURCE-LAYER-KAP-CANDIDATE-ZONING';
const workingCadLayerId = 'SOURCE-LAYER-KAP-WORKING-CAD';
const conceptLayerId = 'SOURCE-LAYER-KAP-CONCEPT-MASTERPLAN';
const fieldLayerId = 'SOURCE-LAYER-KAP-FIELD-EVIDENCE';
const visitorMapLayerId = 'SOURCE-LAYER-KAP-VISITOR-MAP';
const kapUrl = `/?project=${projectId}&event=${eventId}&venue=${venueId}&workspace=spatial-authoring`;

const candidateLabels = [
  'البوابات',
  'الاستقبال',
  'المركز الإعلامي',
  'المجسم',
  'النصب التذكاري',
  'ممر العصور',
  'العشاء',
  'الجلسات والضيافة',
  'المؤتمر الصحفي والصورة التذكارية',
  'منطقة كبار الشخصيات',
  'ركن الذكريات'
];

test('opens the KAP candidate overlay from the project portfolio with full scope identity', async ({ page }) => {
  await page.goto('/?workspace=portfolio');
  const card = page.getByTestId(`project-card-${projectId}`);
  const readiness = page.getByTestId(`project-source-readiness-${projectId}`);
  await expect(card).toBeVisible();
  await expect(readiness).toContainText('11 وجهة');
  await expect(readiness).toContainText('1 تعارض');
  await expect(readiness).toContainText('خريطة الزائر التوضيحية لم تُسلّم بعد');
  await expect(readiness).toContainText('195 صورة و6 فيديوهات');

  await page.getByTestId('source-authority-open').click();
  await expect(page.getByTestId('candidate-spatial-intake')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`project=${projectId}`));
  await expect(page).toHaveURL(new RegExp(`event=${eventId}`));
  await expect(page).toHaveURL(new RegExp(`venue=${venueId}`));
  await expect(page).toHaveURL(/workspace=spatial-authoring/);
  await expect(page).toHaveURL(new RegExp(`sourceLayer=${workingCadLayerId}`));
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', projectId);
});

test('verifies source truth and makes every candidate destination selectable', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(kapUrl);
  const intake = page.getByTestId('candidate-spatial-intake');
  await expect(intake).toBeVisible();
  await expect(page.getByTestId('drive-permission-risk')).toContainText('DRIVE-PERMISSION-ANONYMOUS-WRITER');
  await expect(page.getByTestId('drive-permission-risk')).toContainText('غير محلول');
  await expect(page.getByTestId('candidate-zoning-overlay')).toContainText('مخطط تشغيلي مرشح وغير معاير');
  await expect(page.getByTestId('candidate-zoning-overlay')).toContainText('KAGA ZONING PLAN UPDATE 27-7.pdf');
  await expect(page.getByTestId('candidate-zoning-overlay')).toContainText('1f37e95a7d00');
  await expect(page.getByTestId('candidate-zoning-overlay')).toContainText('المقياس: غير معروف');
  await expect(page.getByTestId('candidate-zoning-overlay')).toContainText('CRS: غير معروف');
  await expect(page.getByTestId('optional-local-source-image')).toHaveAttribute('data-preview-state', 'ready');
  await expect(page.locator('[data-testid^="candidate-marker-"]')).toHaveCount(11);

  for (const [index, candidateLabel] of candidateLabels.entries()) {
    const sourceNumber = index + 1;
    await page.getByTestId(`candidate-marker-${sourceNumber}`).click();
    const inspector = page.getByTestId('candidate-entity-inspector');
    await expect(inspector).toContainText(`ENTITY-KAP-OP-${String(sourceNumber).padStart(3, '0')}`);
    await expect(inspector).toContainText(candidateLabel);
    await expect(inspector).toContainText('normalized-image-anchor');
    await expect(inspector).toContainText('manual-derived-from-candidate-raster');
    await expect(page).toHaveURL(new RegExp(`candidateEntity=ENTITY-KAP-OP-${String(sourceNumber).padStart(3, '0')}`));
  }

  await expect(page.getByTestId('missing-geometry-controls')).toContainText('المقياس');
  await expect(page.getByTestId('missing-geometry-controls')).toContainText('CRS');
  await expect(page.getByTestId('missing-geometry-controls')).toContainText('غير مكتملة');
  expect(consoleErrors).toEqual([]);
});

test('switches all source layers and preserves browser history', async ({ page }) => {
  await page.goto(kapUrl);
  await page.getByTestId(`source-layer-${workingCadLayerId}`).click();
  await expect(page.getByTestId('working-cad-duplicate-confirmation')).toContainText('duplicate-confirmed');
  await expect(page.getByTestId('working-cad-duplicate-confirmation')).toContainText('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');
  await expect(page.getByTestId('working-cad-duplicate-confirmation')).toContainText('no false revision');

  await page.getByTestId(`source-layer-${conceptLayerId}`).click();
  await expect(page.getByTestId('concept-masterplan-layer')).toContainText('مرجع مفاهيمي A–T فقط');
  await expect(page.getByTestId('concept-masterplan-layer')).toContainText('18 صفحة');

  await page.goBack();
  await expect(page.getByTestId('candidate-active-source')).toHaveAttribute('data-source-layer-id', workingCadLayerId);
  await page.goForward();
  await expect(page.getByTestId('candidate-active-source')).toHaveAttribute('data-source-layer-id', conceptLayerId);

  await page.getByTestId(`source-layer-${fieldLayerId}`).click();
  await expect(page.getByTestId('field-evidence-catalog')).toContainText('195');
  await expect(page.getByTestId('field-evidence-catalog')).toContainText('6');
  await expect(page.getByTestId('gps-privacy-disclosure')).toContainText('GPS وبيانات الأشخاص محجوبة');
  await expect(page.getByTestId('gps-privacy-disclosure')).toContainText('لا تغيّر الأدلة الجاهزية تلقائيًا');

  await page.getByTestId(`source-layer-${visitorMapLayerId}`).click();
  await expect(page.getByTestId('missing-visitor-map')).toContainText('خريطة الزائر التوضيحية لم تُسلّم بعد');
  await expect(page.getByTestId('missing-visitor-map')).toContainText('VISITOR-MAP-EDITABLE-SOURCE-MISSING');
  await expect(page.getByTestId('missing-visitor-map')).toContainText('لم تُفبرك خريطة Disney-style');
});

test('exposes one-to-many mappings, the terminology conflict, and unresolved entities', async ({ page }) => {
  await page.goto(kapUrl);
  const register = page.getByTestId('candidate-mapping-register');
  await expect(register).toContainText('11 وجهة مقابل 5 كائنات خبرة');
  await expect(page.getByTestId('mapping-ZONE-ARRIVAL-001').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('mapping-ZONE-DINNER-VIP-001').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('mapping-terminology-conflict')).toContainText('TERMINOLOGY-TUNNEL-VS-WALKWAY');
  await expect(page.getByTestId('mapping-terminology-conflict')).toContainText('ممر العصور');
  await expect(page.getByTestId('mapping-unresolved-show')).toContainText('ZONE-SHOW-001');
  await expect(page.getByTestId('mapping-unresolved-show')).toContainText('لا يوجد تطابق مرشح');
  await expect(page.getByTestId('mapping-unassigned-entities').locator('li')).toHaveCount(3);
  await expect(page.getByTestId('mapping-unassigned-entities')).toContainText('المجسم');
  await expect(page.getByTestId('mapping-unassigned-entities')).toContainText('النصب التذكاري');
  await expect(page.getByTestId('mapping-unassigned-entities')).toContainText('ركن الذكريات');
});

test('reloads a candidate deep link without falling back to another project', async ({ page }) => {
  const deepLink = `${kapUrl}&sourceLayer=${candidateLayerId}&candidateEntity=ENTITY-KAP-OP-011`;
  await page.goto(deepLink);
  await expect(page.getByTestId('candidate-entity-inspector')).toContainText('ENTITY-KAP-OP-011');
  await page.reload();
  await expect(page.getByTestId('candidate-active-source')).toHaveAttribute('data-source-layer-id', candidateLayerId);
  await expect(page.getByTestId('candidate-entity-inspector')).toContainText('ركن الذكريات');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', projectId);
  await expect(page.locator('body')).not.toContainText('معرض الآفاق المرجعي');
});

test('shows the safe missing-preview state and keeps the candidate markers unavailable', async ({ page }) => {
  await page.route('**/local-assets/kap/kaga-zoning-candidate.jpg*', (route) => route.abort());
  await page.goto(kapUrl);
  await expect(page.getByTestId('local-preview-missing')).toContainText('المعاينة المحلية غير متاحة');
  await expect(page.getByTestId('local-preview-missing')).toContainText('لم نستخدم صورة بديلة أو هندسة تجريبية');
  await expect(page.locator('[data-testid^="candidate-marker-"]')).toHaveCount(0);
  await expect(page.getByTestId('candidate-spatial-intake')).toContainText('11 وجهة');
});

test('blocks KAP candidate intake in another project and exposes no source leakage', async ({ page }) => {
  await page.goto('/?project=PROJECT-REFERENCE-EXHIBITION-001&event=EVENT-EXHIBITION-DEMO-001&venue=VENUE-EXHIBITION-DEMO-001&workspace=spatial-authoring');
  await expect(page.getByTestId('cad-project-isolation-error')).toContainText('مواءمة KAP محجوبة');
  await expect(page.getByTestId('candidate-spatial-intake')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('KAGA ZONING PLAN UPDATE 27-7.pdf');
  await expect(page.locator('body')).not.toContainText('1f37e95a7d00');
  await expect(page.locator('main[data-project-id]')).toHaveAttribute('data-project-id', 'PROJECT-REFERENCE-EXHIBITION-001');
});
