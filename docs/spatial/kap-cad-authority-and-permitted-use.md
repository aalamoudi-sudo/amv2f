# KAP CAD Authority and Permitted Use

## فصل الهوية عن السلطة

هوية المحتوى هي `SOURCE-KAP-DWG-PROVISIONAL-001` وبصمتها ثابتة. موقع الملف سجل
منفصل؛ نقل المحتوى نفسه لا ينشئ مصدرًا جديدًا. حالة التقاط 2026-07-13 تبقى
`provisional-until-approved-revision-arrives` كسجل تاريخي.

أضيف في 2026-07-21 إقرار append-only:

| الحقل | القيمة |
| --- | --- |
| authorityAssertionId | `AUTH-KAP-DWG-WORKING-20260721` |
| authorityType | `platform-owner-working-approval` |
| authorityName | Ahmed |
| identityTrust | `local-declared` |
| effectiveDate | `2026-07-21` |
| scope | current platform spatial development |
| validUntil | superseded by a later approved revision |
| sourceHash | `a96a455b...a2d` |

لا يوجد تحقق هوية إنتاجي أو توقيع رقمي. الحالة الفعالة المشتقة هي
`approved-working-baseline`، وليست `final-approved-source`.

## المسموح

- Platform spatial development وtechnical spatial testing.
- 2D visualization وflat spatial preview عند توفر هندسة محولة.
- Candidate zone mapping وcandidate spatial relationships.
- Experience Map وExecutive Command Map development.
- Projection-mapping preparation، دون Calibration أو تشغيل فيزيائي.

## غير المسموح

- Survey control أو CRS رسمي أو geospatial placement.
- Construction أو field measurement أو building heights.
- Safety/HSE/emergency/evacuation decisions.
- Crowd capacity أو route authority.
- Verified readiness أو live operational baseline.
- Final client acceptance.

سلطة CAD منفصلة عن سلطة mapping. حتى بعد التحويل لا تنتقل مواءمة من
`suggested` إلى `approved-working` دون مراجعة واعتماد صريحين.
