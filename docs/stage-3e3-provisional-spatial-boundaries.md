# حدود المكان المبدئي في Stage 3E.3

## المصدر

الخلفية المحلية مشتقة من `SOURCE-KAP-DWG-PROVISIONAL-001` ذي SHA-256:

`a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d`

توجد lineage منقحة في `pilot-input/kap-experience-preview-manifest.json`. لا يُحفظ PNG أو DWG في Git.

## القيود الملزمة

- الصورة ليست geometry ولا مصدر route أو coordinate.
- لا توجد نقاط أو مضلعات أو حدود مناطق مستنتجة من pixels.
- EPSG والشمال والأصل وسلطة المسار ما زالت غير معروفة.
- كل كيان يحمل `geometryMappingStatus = pending`.
- غياب الأصل المحلي لا يكسر الاختبار أو البناء؛ تظهر حالة نقص عربية.

## عند وصول DWG المعتمد

1. يمر المصدر ببوابات الاستبدال والمقارنة في Stage 3E.2.
2. تُعتمد المراجعة والبصمة وCRS والشمال والأصل وسلطة الهندسة.
3. ينشئ spatial adapter mappings إلى معرفات الكيانات الخمسة القائمة.
4. تلتقط أوضاع Experience وCommand وStory الربط الجديد آليًا من العقد، بلا تغيير IDs أو شرط KAP في Core.

## تحديث Stage 3E.4

وصل إقرار عمل للبصمة نفسها، لا مراجعة هندسية جديدة. المصدر الآن مسموح للتطوير
والتصور كـ`approved-working-baseline`، لكن المعاينة PNG تبقى visual reference
بلا geometry authority. لعدم توفر Converter محلي بقيت كل mappings pending ولم
تظهر هندسة في Experience أو Command.
