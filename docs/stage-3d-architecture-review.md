# مراجعة CTO — Stage 3D

## النتيجة

**قبول كأساس معماري محلي؛ غير صالح للتشغيل الحي.** الحد بين source/observation/event/projection/output واضح، والعقود event-agnostic وvendor-neutral. لا يلزم إعادة بناء domain عند استبدال الذاكرة بbackend إذا بقي repository boundary ثابتًا.

## Evidence

- `OperationalEventRepository` append-only ولا يعرض edit/delete/clear/replace-all؛ reset يبدل حاوية المختبر.
- idempotency/source identity تمنع duplicate، وreplay مرتب حتمياً.
- ActionGateway يمنع direct readiness edit ويطبق authority/evidence/preconditions.
- projection يستهلك trusted events حسب context ويحمل lineage وبصمة SHA-256 للمحتوى.
- عشرة reference adapters تمر بمسارات conformance المحلية، وسبعة JSON Schemas تنفذ عبر Ajv Draft 2020-12 مع valid/invalid fixtures.
- 2D/3D/geospatial/physical outputs تحمل هوية إسقاط واحدة وهوية أمر مستقلة، ويُعاد فحص محتواها وسياقها وربطها ونسبها.
- مراجع event/venue/requirement/location تأتي من normalized observation، بينما labels/requirements/routes تأتي من fixture configuration؛ لا تحمل خدمات core IDs خاصة بالموقع التجريبي.

## تقييم النقاط المطلوبة

- **Event sourcing boundary:** صحيح مفاهيمياً؛ repository local memory وليس event store إنتاجياً.
- **Adapter replaceability:** جيد؛ vendor metadata محايد وcore لا يحتوي أسماء منتجات.
- **Schema evolution:** versioned 1.0.0؛ يلزم registry/deprecation/migration ownership قبل backend.
- **Backend replacement:** interface صالح، لكن transactions/concurrency/snapshots/retention غائبة.
- **Determinism:** مثبت بالاختبارات؛ clock fixture حتمي.
- **Vendor lock-in:** منخفض في core؛ procurement gate يحظر proprietary IDs/no export.
- **Offline safety:** conflict review بلا last-write-wins؛ غير durable.
- **3A–3C integration:** IDs/context/evidence/decision refs معاد استخدامها؛ لا كتابة إلى stores القائمة.

## دين تقني ومخاطر

schemas وTypeScript متوازيان يدويًا لعدم وجود generator قائم؛ Ajv/runtime drift tests تقلل الخطر ولا تلغيه. memory snapshot ليس performance model. actor/authority strings غير موثقة. تحذير chunk الأكبر من 500 kB ما زال قائمًا؛ لا performance rewrite داخل Stage 3D.1.

## تدقيق تعديل Stage 3D

- مرجع البداية الفعلي والمعتمد هو `42a60b234ec5e912cb6ebe8bc54c23aa64a7f259`، وهو merge-base المباشر للعمل الحالي؛ لم يحدث reset أو rebase أو checkout إلى المرجع الأقدم.
- لم يغير Stage 3D storage schema `8` أو decision validation/migration/priority contracts. أضاف Stage 3D.1 تعديلاً أدنى مثبتاً في `useEventStore`: scenario readiness edit يحتفظ بوقت وممثل السجل بدلاً من اختلاق وقت الجهاز وممثل محليين؛ baseline semantics لم تتغير.
- مختبر التكامل يملك state محليًا داخل component/engine، ولا يكتب إلى `baselineDecisions` أو readiness baseline. السياقات الثلاثة تبقى مستقلة في ledger والإسقاط.
- `OperationalEvent` لا يملأ provenance افتراضيًا. المحاكي يمرر bundle حتمية مرتبطة بسجل المصدر الفعلي، بينما تبقى هوية الإنتاج ومرجعية وقت الجهاز في `unknownFields`.
- مراجع evidence تُحل إلى سجل evidence منظم قبل قبول الحدث المتحقق أو المعتمد. لا يُشتق actor أو authority أو verification أو completion أو closure من حقول عامة.
- ضمانات lifecycle المتسلسل، quarantine، priority الثنائية، والقيم المهاجرة المجهولة تبقى ضمن Stage 3C.1 ولم يضف Stage 3D مسارًا يلتف عليها.

## أثر الحزمة

| الحالة | JavaScript الابتدائي | gzip الابتدائي | Chunk Stage 3D عند الطلب |
| --- | ---: | ---: | ---: |
| Stage 3C.1 عند `42a60b2` | 1,463.80 kB | 408.10 kB | — |
| Stage 3D قبل التعديل، eager | 1,564.11 kB | 433.38 kB | — |
| Stage 3D بعد lazy-load | 1,466.38 kB | 409.12 kB | 100.22 kB / 26.02 kB gzip |

الزيادة الابتدائية بعد Stage 3D أصبحت **2.58 kB minified / 1.02 kB gzip** مقارنة بمرجع 3C.1. Stage 3D نفسه لم يضف dependency. أضاف Stage 3D.1 Ajv فقط، مع بقاء المختبر lazy-loaded؛ أرقام 3D.1 النهائية موثقة في `stage-3d1-integration-integrity-hardening.md`.

## توصية

يجوز استخدام `MEIOS-CAPTURE-1.0.0` كنسخة محلية مجمدة للتخطيط فقط بعد بوابات Stage 3D.1. لا external Integration Lab أو backend أو vendor SDK قبل اختيار use case واحد وموافقة أحمد على experiment محدود.
