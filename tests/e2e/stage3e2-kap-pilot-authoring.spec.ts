import { expect, test, openTechnicalWorkspace } from './test-fixtures';

test('KAP real-event candidate authoring remains governed, unmapped, and freeze-blocked', async ({ page }) => {
  await page.goto('/?project=PROJECT-KAP-OPENING-2026&event=EVENT-KAP-OPENING-2026&workspace=authoring');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const workspace = page.getByTestId('pilot-authoring-workspace');
  await expect(workspace).toBeVisible();
  await expect(workspace).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('kap-authoring-classification')).toContainText('مرشحة');
  await expect(page.getByTestId('kap-authoring-classification')).toContainText('temporary-demo');
  await expect(page.getByTestId('kap-authoring-overview')).toContainText('حفل افتتاح وتدشين حدائق الملك عبدالله');
  await expect(page.getByTestId('kap-authoring-overview')).toContainText('12');

  await page.getByTestId('kap-section-identity').click();
  await expect(page.getByTestId('kap-event-identity')).toContainText('EVENT-KAP-OPENING-2026');
  await expect(page.getByTestId('kap-event-identity')).toContainText('VENUE-KAP-001');
  await expect(page.getByTestId('kap-date-assumption')).toContainText('31 أكتوبر 2026');
  await expect(page.getByTestId('kap-date-assumption')).toContainText('year inferred from current 2026 project context');

  await page.getByTestId('kap-section-scope').click();
  await expect(page.getByTestId('kap-five-entity-scope').locator('button')).toHaveCount(5);
  await expect(page.getByTestId('kap-five-entity-scope')).toContainText('ZONE-DINNER-VIP-001');
  await page.getByTestId('kap-five-entity-scope').getByText('المسرح ومنطقة العرض').click();
  await expect(page.getByTestId('kap-entity-detail')).toContainText('ZONE-SHOW-001');
  await expect(page.getByTestId('kap-entity-detail')).toContainText('الموقع غير مثبت على المخطط');

  await page.getByTestId('kap-section-governance').click();
  await expect(page.getByTestId('kap-governance-assignments')).toContainText('محمد إبراهيم');
  await expect(page.getByTestId('kap-governance-assignments')).toContainText('ماجد قاسم');
  await expect(page.getByTestId('kap-governance-assignments')).toContainText('إبراهيم الغمري');
  await expect(page.getByTestId('kap-governance-assignments')).toContainText('لا');

  await page.getByTestId('kap-section-authority').click();
  await expect(page.getByTestId('kap-authority-boundaries')).toContainText('قبول العميل');
  await expect(page.getByTestId('kap-authority-boundaries')).toContainText('اعتماد HSE');
  await expect(page.getByTestId('kap-authority-boundaries')).toContainText('الجهة المفوضة غير معروفة');
  await page.getByTestId('kap-authority-misuse-test').click();
  await expect(page.getByTestId('kap-authority-error')).toContainText('اعتماد أحمد للمنصة لا يساوي');

  await page.getByTestId('kap-section-sources').click();
  await expect(page.getByTestId('kap-source-register')).toContainText('مصدر نهائي معتمد ضمن نطاقه');
  await expect(page.getByTestId('kap-source-register')).toContainText('مرجع أسماء غير سلطوي');
  await expect(page.getByTestId('kap-source-register')).toContainText('مبدئي حتى وصول مراجعة معتمدة');
  await expect(page.getByTestId('kap-source-register')).toContainText('a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d');

  await page.getByTestId('kap-section-cad').click();
  await expect(page.getByTestId('kap-provisional-cad')).toContainText('مخطط مبدئي — غير معتمد');
  await expect(page.getByTestId('kap-provisional-cad')).toContainText('2,315');
  await expect(page.getByTestId('kap-provisional-cad')).toContainText('سان فرانسيسكو');

  await page.getByTestId('kap-section-spatial').click();
  await expect(page.getByTestId('kap-spatial-2d-state')).toContainText('الموقع غير مثبت على المخطط');
  await page.getByTestId('kap-spatial-3d').click();
  await expect(page.getByTestId('kap-spatial-3d-state')).toContainText('0 روابط هندسية');

  await page.getByTestId('kap-section-assets3d').click();
  await expect(page.getByTestId('kap-3d-candidates')).toContainText('AGES AND CENTURIES.skp');
  await expect(page.getByTestId('kap-3d-candidates')).toContainText('PHOTOBOOTH 3.skp2.skp');
  await expect(page.getByTestId('kap-3d-candidates')).toContainText('Gift_Box.max');
  await expect(page.getByTestId('kap-3d-candidates')).toContainText('معلق');

  await page.getByTestId('kap-section-evidence').click();
  await expect(page.getByTestId('kap-evidence-quarantine')).toContainText('محجور');
  await expect(page.getByTestId('kap-evidence-quarantine')).toContainText('الحقوق');

  await page.getByTestId('kap-section-missing').click();
  await expect(page.getByTestId('kap-missing-inputs')).toContainText('مخططات الطوابق الرسمية');
  await expect(page.getByTestId('kap-missing-inputs')).toContainText('أصول الهوية ثنائية الأبعاد');

  await page.getByTestId('kap-section-validation').click();
  await page.getByTestId('kap-run-validation').click();
  await expect(page.getByTestId('kap-validation-report')).toContainText('لا يملك تاريخ سريان وانتهاء');
  await expect(page.getByTestId('kap-validation-report')).not.toContainText('pilot-role-effective-date-missing');

  await page.getByTestId('kap-section-freeze').click();
  await expect(page.getByTestId('kap-freeze-gates').locator(':scope > div')).toHaveCount(12);
  await page.getByTestId('kap-freeze-attempt').click();
  await expect(page.getByTestId('kap-freeze-result')).toContainText('فشلت المحاولة بأمان');
  await expect(page.getByTestId('kap-authoring-classification')).toContainText('candidate');

  await page.getByTestId('kap-section-package').click();
  await expect(page.getByTestId('kap-package-preview')).toContainText('EVENT-PACKAGE-KAP-OPENING-2026-CANDIDATE');
  await expect(page.getByTestId('kap-package-preview')).toContainText('PILOT-SOURCE-v1-');
  await expect(page.getByTestId('kap-package-preview')).toContainText('غير مولّد — التجميد محجوب');

  await page.getByTestId('kap-section-cad-diff').click();
  await expect(page.getByText('لا يوجد بيان بديل بعد؛ تظهر أبعاد المقارنة المطلوبة من دون اختراع مراجعة ثانية.')).toBeVisible();
  await expect(page.getByTestId('kap-cad-diff')).toContainText('غير قابل للمقارنة');

  await page.getByTestId('kap-section-rollback').click();
  await page.getByTestId('kap-cad-promotion-test').click();
  await expect(page.getByTestId('kap-rollback-status')).toContainText('فشلت الترقية');
  await expect(page.getByTestId('kap-rollback-status')).toContainText('لم يتغير أي معرّف أو مصدر نشط');

  await page.getByTestId('launcher-open').click();
  await openTechnicalWorkspace(page, 'configuration-open');
  await expect(page.getByTestId('event-configuration-workspace')).toBeVisible();
  await expect(page.getByTestId('package-validation-status')).toContainText('اجتازت الحزمة');
  await page.getByTestId('event-package-select-festival').click();
  await expect(page.getByTestId('package-project-mismatch')).toBeVisible();
  await expect(page.getByTestId('event-package-activate')).toBeDisabled();
  await expect(page.getByTestId('package-active-identity')).toContainText('لم تُفعّل');
  await expect(page.getByTestId('package-entity-list')).toContainText('STAGE-FEST-002');
  await expect(page.getByTestId('package-entity-list')).not.toContainText('ZONE-ARRIVAL-001');
});
