# Spatial Transform Contract

`SpatialTransformManifest` يفصل إحداثيات المصدر عن عرض Runtime. حقوله الملزمة:

`sourceSpatialRef`, `targetSpatialRef`, `sourceUnits`, `targetUnits`, `scale`,
`rotation`, `translation`, `northStatus`, `originStatus`, `crsStatus`,
`controlPoints`, `authority`, `confidence`, `revision`, `contentHash`.

## حالة KAP

- `sourceSpatialRef = null`.
- `sourceUnits = unknown` و`targetUnits = meter`.
- scale/rotation/translation = `null`.
- north/origin/CRS = `unknown`.
- controlPoints = `[]`.
- الهدف المعلن هو `MAYADEEN-EXCHANGE-RH-M-Z-UP` وفق `MEIOS-PDT-STD-001 v1.0.0`.

لا يعني تحديد Target أن Source transform معروف. Three.js يبقى Y-up، وأي تحويل
Z-up إلى Y-up يحتاج Model Adapter بإصدار واختبار بعد معرفة وحدات المصدر.

## عدم الإتلاف

إحداثيات CAD الأصلية لا يعاد تمركزها أو تدويرها أو تغيير مقياسها داخل مشتق
المصدر. Display transform، إذا اعتمد لاحقًا، يحفظ منفصلًا ويكون قابلًا للعكس.
الاختبارات تغطي apply/reverse دون تعديل source point.
