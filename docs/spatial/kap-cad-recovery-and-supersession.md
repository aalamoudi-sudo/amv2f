# KAP CAD Recovery and Supersession

## الاستعادة

- Source identity تحددها SHA-256، لا path.
- Location جديد للبصمة نفسها يضاف إلى location history.
- Assertion جديد يضاف append-only ولا يعيد كتابة capture record.
- فشل Conversion أو mapping يبقي آخر سجل reviewed بلا تغيير.
- UI تمسح selection وcandidate edits عند تبديل المشروع.

## الاستبدال المستقبلي

عند وصول محتوى ببصمة مختلفة، يسجل Source ID/revision جديد ثم يقارن بالبصمة
الحالية. لا يرقى تلقائيًا. يجب توثيق units/extents/layers/XREF/CRS/north/origin
وmissing/orphan mappings، ثم اعتماد scope الجديد. بعد نجاح التبعيات فقط تصبح
المراجعة السابقة `superseded`.

Rollback يعيد pointer إلى revision reviewed سابقة، ولا يحذف المراجعات الأحدث أو
إقرارات السلطة. أي derived artifact يحتفظ parentSourceId وparentSha256.

## حالات الفشل

- Hash مخالف: `BLOCKED_BY_CAD_HASH_MISMATCH`.
- لا Converter محلي: `READY_FOR_LOCAL_CAD_CONVERSION_INPUT`.
- cross-project source/mapping: reject وحالة محايدة.
- missing XREF: warning مانع لا يجلب ملفًا تلقائيًا.
- unknown transform: لا تطبيق transform ولا projection.

لا ينفذ هذا البروتوكول baseline activation أو construction/HSE/route approval.
