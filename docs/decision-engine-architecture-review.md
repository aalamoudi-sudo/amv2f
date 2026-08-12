# مراجعة CTO لمحرك القرارات

## النتيجة التنفيذية

**التصنيف: Critical foundation / قابل لإعادة الاستخدام مع تحفظات.** عقد `DecisionRecord` عام ولا يحتوي منطق معرض أو مؤتمر أو ملعب. الحدث والموقع والعناصر المرتبطة معرفات بيانات، وليست أسماء أو حالات ثابتة داخل المكونات.

## Evidence

- العقد موجود في `src/types/decision.ts` ويغطي الهوية والسياق والمصدر والملكية والخيارات والاعتماد والتنفيذ والأثر والتاريخ.
- التخزين الحالي يفصل `decisions` عن `baselineDecisions` ويعيد طبقة السيناريو إلى الأساس عند الإيقاف أو إعادة التحميل.
- علاقات القرار صريحة من نوع `DecisionEntityRelation` ويستهلكها `decisionImpactGraph.ts` دون دلالة موضعية أو محرك graph خارجي.
- اختبارات التحقق والأولوية والثقة والعلاقات وعزل السيناريو تمر محلياً.

## Inference

يمكن استبدال التخزين المحلي لاحقاً بمصدر API إذا حافظ العقد على معرفات مستقرة، مصدر، توقيت، ملكية، إصدار، وعلاقات. لا يثبت ذلك جاهزية Backend أو workflow durable.

## قرارات معمارية

1. القرار كيان تشغيلي مستقل عن `SpatialEntity`؛ المشهد يستهلك معرفات وعلاقات ولا يملك منطق القرار.
2. `stateContext` يمنع خلط demo وbaseline وscenario.
3. `changeHistory` عقد محلي قابل للاستبدال، وليس audit trail أو سجل امتثال.
4. الانتقالات محددة في خدمة تحقق قابلة للاستبدال بمحرك workflow لاحقاً.
5. 2D والعلاقات والقائمة هي أدوات قرار؛ 3D تمثيل مكاني تكميلي.

## Future replacement points

- local Zustand persistence -> API/repository adapter.
- validation transition map -> approved workflow service.
- structured evidence references -> evidence service with immutable storage.
- local approval fields -> identity, permissions, authority, and durable approval records.
- explicit relationship records -> relationship query or event ontology adapter.

## المخاطر والاعتماديات

- الاعتماد على أسماء مالكين أو جهات اعتماد تجريبية قد يخلق ثقة زائفة.
- لا توجد هوية أو تعارضات متعددة المستخدمين أو retries أو SLA durable.
- العلاقة المكانية الحالية مباشرة ولا تمثل dependencies معقدة أو causal impact.
- الانتقال من local storage إلى خدمة خارجية يحتاج contract tests وmigration policy.

## أبسط بديل

جدول قرارات مع مالك وموعد وحالة. قيمة هذا العقد الإضافية هي ربط القرار بالدليل والخيارات والعناصر والأثر، مع إبقاء السبب قابلاً للمراجعة. يجب قياس خفض زمن الفرز قبل توسيعه.

## Recommendation

اعتماد العقد كـ foundation فقط. لا يوصى الآن بإضافة OpenUSD، workflow engine، AI recommendation، event bus، أو Backend؛ هذه أبحاث أو مراحل لاحقة وتتطلب موافقة أحمد وتجربة منفصلة.
