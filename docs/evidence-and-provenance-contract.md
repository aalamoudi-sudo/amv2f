# عقد الدليل وProvenance

## EvidenceReference

العقد القانوني `CanonicalEvidenceReference 1.0.0` يحمل: ID/type/URI/file/mime/SHA-256/capture time/actor/source system/related entities and events/spatial reference/instruction version/retention/sensitivity/verification status/metadata.

الأنواع: image, video, document, measurement, sensor observation, inspection result, signature, external record, spatial viewpoint. fixtures تحفظ metadata وURI محليًا فقط ولا تخزن binary مزيفًا.

حدث critical أو approved لا يمر إذا لم يستوف evidence type/status المعلن. وجود دليل لا يعني صحته؛ `verificationStatus` مستقل.

`EvidenceResolver` لا يقبل ID شكلياً: يحل السجل ويتحقق من type/status/hash/time/source/classification، ومن علاقته بالعنصر والسياق والحدث أو المتطلب أو الفعل أو التعليمة المطلوبة، ومن عدم رفضه أو supersession.

## ProvenanceBundle

النموذج مستلهم من [W3C PROV-O](https://www.w3.org/TR/prov-o/) ويستخدم `Entity`, `Activity`, `Agent` وعلاقات `wasGeneratedBy`, `used`, `wasAssociatedWith`, `wasDerivedFrom`, `hadPrimarySource`, `wasRevisionOf`, `hadRole`.

يجب أن يجيب:

- ما السجل الأساسي؟
- أي نشاط/adapter/version حوّله؟
- من أو ما شارك؟
- أي دليل أو حدث سابق استُخدم؟

## حدود حاكمة

- provenance ليس confidence.
- evidence ليس approval.
- hash integrity ليست authenticity أو chain of custody.
- migration لا يملأ source/actor/version مفقودًا.
- unknown provenance يبقى في `unknownFields` ويمنع الادعاء عند الحاجة.
- كل حدث محاكى يحصل على bundle مرتبطة بـsource record وadapter الفعليين لذلك الحدث؛ لا توجد bundle عامة تُنسب إلى مصادر مختلفة.
- `productionIdentity` و`authoritativeDeviceTime` تبقيان مجهولتين صراحة؛ actor strings وsource clock في fixture ليستا إثبات هوية أو وقتًا مرجعيًا.
- لا توجد W3C PROV serialization أو conformance claim حاليًا.
- `ProvenanceResolver` يطابق source node وnormalization activity وadapter/version وresulting event والعلاقات. dangling أو fabricated bundle تمنع الانتقال الحساس للثقة.

التفاصيل وحدود التصحيح في `evidence-provenance-resolution.md`.
