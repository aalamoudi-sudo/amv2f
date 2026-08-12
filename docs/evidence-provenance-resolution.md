# حل الأدلة وProvenance

## EvidenceResolver

كل `evidenceRef` يُحل من registry مهيأة قبل استخدامه في فعل أو انتقال ثقة. يتحقق الحد من:

- الوجود والبنية والإصدار والنوع وحالة التحقق المطلوبة.
- SHA-256 ووقت الالتقاط ونظام المصدر وretention وsensitivity.
- ارتباط الدليل بالعنصر والسياق.
- ارتباطه بالحدث أو المتطلب أو الفعل أو التعليمة عند طلب ذلك.
- تطابق إصدار التعليمة.
- عدم رفض الدليل أو استبداله بدليل أحدث.

دليل صحيح شكلياً لكنه متعلق بعنصر أو سياق آخر مرفوض. ID نصي وحده ليس دليلاً.

## ProvenanceResolver

كل `provenanceRef` يُحل إلى bundle تحتوي:

- source record node.
- adapter-normalization activity مع adapter ID وversion.
- resulting operational-event node.
- agent والروابط التي تصل المصدر بالنشاط والحدث.
- `stateContext` المطابق.

لا يجوز تركيب `sourceRecordId` و`sourceSystemId` من عقدتين؛ يجب أن تحملهما عقدة source-record واحدة. يحل المدقق عقدة مصدر ونشاطاً وحدثاً وجهة متوقعة واحدة بالضبط، ويتحقق من فرادة IDs ووجود كل endpoints واتصال الرسم كله.

العلاقات الملزمة هي:

```text
source record <- used - adapter activity
operational event - wasGeneratedBy -> adapter activity
adapter activity - wasAssociatedWith -> expected source/adapter agent
operational event - hadPrimarySource -> the same source record
```

الموائم نفسه ينتج العلاقة؛ conformance harness لا يحقن bundle معروفة من المضيف كي يمر الاختبار. أي bundle مفقودة أو مركبة أو منفصلة أو ملتبسة، أو activity/adapter/version/event/agent/relationship غير متطابقة، تمنع الانتقال الحساس للثقة. هذا تحقق Mayadeen محلي ولا يدعي مطابقة W3C PROV.

## المجهول الصريح

`productionIdentity` و`authoritativeDeviceTime` يبقيان في `unknownFields` في المختبر. actor strings ووقت الجهاز المحلي metadata غير موثوقة، ولا تتحول بالاستنتاج إلى هوية إنتاجية أو وقت سلطوي.

## التصحيح

التصحيح أو إعلان الخطأ حدث جديد لا يعدل الأصل. يجب أن يشير إلى حدث أقدم للعنصر والسياق نفسيهما، مع سبب وعلاقة متوافقة وprovenance محلولة. self-reference، cycles، unknown target، cross-context، cross-entity، أو إعادة إبطال غير متوافقة كلها مرفوضة.
