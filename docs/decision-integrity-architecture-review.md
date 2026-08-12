# مراجعة CTO لنزاهة القرار — Stage 3C.1

## Assessment

**Evidence:** runtime validation يبني `DecisionRecord` حقلًا بحقل بعد فحص كامل. الاستعادة في schema `8` تحفظ IDs الجديدة، تحافظ على السياق، وتحجر السجلات غير الصالحة. الهجرة لا تملأ provenance ناقصاً. العلاقات الصريحة وحدها تغذي 2D و3D.

**Inference:** الحدود الحالية قابلة لاستبدال localStorage بمستودع API ومحرك workflow لاحقاً من دون تغيير معنى الكائن، بشرط تثبيت IDs والحالات وعقود evidence والعلاقات. هذا لا يثبت reliability أو auditability حية.

## Correctness

- سياق record منفصل عن طبقة Zustand؛ `temporary-demo` لا يصبح `baseline` بالتعديل أو reload.
- scenario overlay ينسخ baseline للعرض فقط ولا يكتب عليه.
- كل علاقة تطابق `decisionId` و`stateContext` لقرارها؛ unknown IDs والتكرار أخطاء مانعة.
- التاريخ يبدأ بـdraft، مراجعته موجبة ومتسلسلة، ولا يقفز أو يرجع، والحالة النهائية تطابق السجل.
- option/evidence/impact/history عقود كاملة؛ dangling evidence لا يصل إلى priority أو UI.

## Migration safety

العلاقات القديمة تستخدم rule حتمية موثقة فقط. `DecisionMigrationResult` يحفظ warnings وحقول المراجعة والإصدارين. لا يُستنتج completion أو verification أو closure provenance. سجل قديم ناقص يبقى غير مقبول أو محجوراً ولا يظهر verified/closed موثوقاً.

## Replacement boundary

- `recoverPersistedDecisions` → repository adapter.
- local actor strings → identity/authority service.
- transition validator → workflow adapter مع contract tests.
- evidence references → governed evidence repository.
- CSV/JSON preview → ingestion adapter.

لا يوجد Backend أو workflow engine الآن. لا تحتاج live data أو AI مستقبلاً إلى إعادة تصميم `DecisionRecord`; يجب أن تنتج عقوداً تمر بالvalidator نفسه، لا أن تتجاوزه.

## Multi-event reuse

الأنواع والقرارات والعلاقات تعتمد IDs عامة للحدث والموقع والعنصر، ولا تحتوي منطق معرض أو مهرجان أو موقع محدد. قوائم event/venue المعروفة في أداة validation محلية ومقصودة للحزمة الحالية.

## Technical debt

المتبقي: ساعة ومتصفح محليان، actor strings غير موثقة، لا concurrency، لا immutable evidence، ولا durable history. build الحالي ينتج JavaScript بحجم **1,463.80 kB minified / 408.10 kB gzip** ويحتفظ بتحذير Vite للقطع الأكبر من 500 kB. لا يبرر ذلك performance rewrite داخل Stage 3C.1؛ budget المقترح لسبرنت مستقل لاحق يبقى JavaScript ابتدائياً دون 325 kB gzip بعد قياس زمن التفاعل.

## Recommendation

مناسب لاستقبال حزمة pilot مجمدة داخل أداة محلية بعد موافقة أحمد، وليس مناسباً لتشغيل حي. قبل live use يلزم هوية وصلاحيات ومخزن evidence وسجل durable وسلطة تشغيلية في مرحلة معتمدة منفصلة.
