# معيار الالتقاط والتكامل التشغيلي — Stage 3D / 3D.1

**الحالة:** أساس معماري محلي معتمد داخل Stage 3D
**الإصدار:** `MEIOS-CAPTURE-1.0.0`
**نطاق الادعاء:** بيانات ومحاكيات محلية فقط؛ ليست تغذية تشغيلية حية ولا سجل تدقيق إنتاجياً.

## الغرض

يمنع هذا المعيار أي مصدر أو موظف من الكتابة المباشرة إلى الحقيقة التشغيلية. المسار الحاكم هو:

```text
Source Adapter
-> CaptureEnvelope
-> NormalizedObservation
-> Contract + Action + Authority Validation
-> Append-only OperationalEventRepository
-> Evidence + Provenance + Trust Evaluation
-> Canonical StateProjection
-> Versioned Output Adapters
```

قبول الحدث في السجل لا يعني السماح له بتغيير الإسقاط. `reported` و`corroborated` يبقيان مرئيين وقابلين للتتبع، بينما يعتمد تغيير الحالة المتحققة على قواعد الثقة والسلطة المعلنة.

## مبادئ ملزمة

1. المنصة تملك IDs والعقد والإسقاط؛ المورّد يقدم سجلاً أو ينفذ مخرجاً خلف Adapter.
2. `temporary-demo` و`baseline` و`scenario` لا تختلط.
3. وقت المصدر ووقت الاستلام ووقت التسجيل حقول مستقلة.
4. السجل append-only؛ التصحيح وإعلان الخطأ حدثان جديدان.
5. idempotency وهوية المصدر تمنع التكرار.
6. لا last-write-wins لتعارض offline.
7. الدليل وprovenance والثقة والاعتماد والجاهزية معانٍ منفصلة.
8. الجاهزية مشتقة من نتائج المتطلبات، لا من إدخال نسبة مباشر.
9. 2D و3D والجغرافي والمادي مخرجات لهوية إسقاط محتوى واحدة، لكن لكل مخرج هوية أمر ومحاولة تسليم مستقلتان؛ ليست مصادر حقيقة.
10. المخرج المادي يخضع كذلك لـ`MEIOS-PDT-STD-001 v1.0.0` ولا يعني هذا بدء Stage 6.
11. مراجع الحدث والموقع والمتطلب تُنقل من الملاحظة الموحّدة، وأسماء العناصر وربط المسارات ومتطلبات الجاهزية تُحقن كتهيئة؛ لا توجد IDs خاصة بفعالية داخل خدمات core.
12. actor strings وdevice/source timestamps المحلية metadata محاكاة، وليست هوية إنتاجية أو وقتًا سلطويًا. المجهول يبقى مجهولًا في provenance.
13. الدليل وprovenance يُحلان من registries مهيأة ويرتبطان بالعنصر والسياق والفعل أو الحدث قبل أي انتقال حساس للثقة.
14. JSON Schema validation ينفذ فعلياً عبر Ajv Draft 2020-12؛ قبوله لا يلغي runtime validation الدلالي.
15. provenance المقبولة رسم واحد متصل وغير ملتبس: عقدة مصدر واحدة تحمل هويتي السجل والنظام، والنشاط نفسه يستخدمها ويولد الحدث ويرتبط بالجهة المتوقعة، والحدث يشير إليها كمصدره الأساسي.
16. الحدث الناتج من فعل محكوم يطابق الفعل في event/entity/context/evidence/provenance/source/adapter و`payloadHash` و`idempotencyKey` و`offlineSequence` قبل الإلحاق.
17. duplicate وconflict قراران داخل repository: التطابق القانوني يمنع النسخة الثانية، والاختلاف عند اصطدام المفتاح أو الحدث أو المصدر يوقف الإلحاق مع تفاصيل منظمة.

## الحدود الحالية

- **Functional:** العقود، المدقق، ledger محلي append-only، replay، ActionGateway ذري محلي، resolvers، projection content hashing، adapters مرجعية، conformance محلية، workspace RTL.
- **Simulated:** كل source record، actor، device، evidence metadata، clock، health، acknowledgement، ومؤشر أداء.
- **Local only:** الذاكرة، قائمة offline، conflict review، وسجل الأحداث.
- **Requires backend later:** durability، concurrency، durable identity، access policy، retention، encryption، durable audit، cross-device reconciliation.
- **Requires purchased/partner technology:** أي source system أو sensor أو reality capture أو workflow أو geospatial renderer أو physical output حقيقي.

## الأمن والنزاهة المحلية

الأساس الحالي يتحقق من schema/version، canonical payload hash، evidence hash وعلاقته، provenance graph connectivity، source identity، adapter identity، action-to-event delivery binding، authority role، repository-backed idempotency/conflict، replay، clock drift، state context، sensitivity وretention classification. السجل القانوني لا يكشف `clear/delete/edit`; reset يستبدل حاوية المختبر القابلة للتخلص. لا ينفذ authentication أو encryption أو key management أو production authorization.

## ادعاءات ممنوعة

- Live operational feed أو live digital twin.
- Formal EPCIS / W3C PROV / OGC SensorThings / BCF compliance.
- Production audit trail أو legal evidence custody.
- Production offline synchronization.
- Verified readiness من بيانات المختبر.
- Physical calibration أو hardware control.
- اعتماد Ajv أو اجتياز المحولات المرجعية بوصفه شهادة معيار أو صلاحية مورّد.

## مرجع التنفيذ

- العقود: `src/types/integration.ts`
- التحقق: `src/services/integrationValidation.ts`
- ledger: `src/services/operationalEventRepository.ts`
- المختبر: `src/components/integration/OperationalCaptureLab.tsx`
- schemas: `schemas/integration/v1/`
- fixtures: `fixtures/integration/`
- تقوية النزاهة: `docs/stage-3d1-integration-integrity-hardening.md`
- الإغلاق النهائي للنزاهة: `docs/stage-3d1a-final-integrity-closure.md`
