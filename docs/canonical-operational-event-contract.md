# عقد الحدث التشغيلي القانوني

## الفصل الدلالي

| النوع | المعنى | موثوق؟ | يغيّر الإسقاط؟ |
| --- | --- | --- | --- |
| `SourceRecord` | سجل بصيغة المصدر | لا | لا |
| `CaptureEnvelope` | metadata النقل والهوية والبصمة | لا | لا |
| `NormalizedObservation` | observation مطبّع لكنه غير موثوق | لا | لا |
| `OperationalEvent` | حدث صالح ومقبول append-only | حسب `assertionState` | فقط عند اجتياز trust rule |
| `StateProjection` | الحالة الحالية المشتقة | مشتقة وقابلة للتفسير | هي ما تستهلكه الواجهة |
| `OutputCommand` | أمر عرض بإصدار | ليس حقيقة مستقلة | لا يعيد الكتابة إلى domain |

## `CaptureEnvelope 1.0.0`

يحمل adapter/source IDs، وقت الاستلام، payload وSHA-256، السياق، الجهاز، offline sequence، correlation/causation/idempotency، وmetadata النقل. يحتفظ دائمًا بساعة المصدر وساعة المنصة.

## `OperationalEvent 1.0.0`

ينظم الأبعاد التالية:

- **Identity:** `eventId`, `eventType`, schema, revision, state context.
- **Subjects:** event/venue/zone/entity/asset/route/decision/work-order/requirement references.
- **Time:** event time, record time, receipt time, timezone offset.
- **Location:** observed/resulting location and coordinate/spatial references.
- **Operational context:** business step, prior/proposed disposition, action and instruction version.
- **Source:** system, actor, role, device, method, adapter and versions.
- **Evidence/provenance:** explicit reference IDs; never invented during migration.
- **Trust:** assertion state, source confidence, validation disposition, rules and authority requirement.
- **Relationships:** correlation, causation, correction/supersession، error declaration، وسبب العلاقة.
- **Delivery integrity:** idempotency, offline sequence and payload hash.

الأنواع العامة تبدأ من `observation.reported` و`work.*` و`inspection.*` و`measurement.*` و`evidence.*` و`exception.*` و`approval.*` و`verification.*` و`state.correction` و`event.error-declared` و`sensor.observed` و`reality-capture.processed`. لا توجد أسماء فعالية أو موقع في core.

## التصحيح والخطأ

- لا يعدل الحدث الأصلي.
- `state.correction` يذكر `supersedesEventId`.
- `event.error-declared` يذكر `errorDeclarationForEventId`.
- الهدف حدث أقدم للعنصر والسياق نفسيهما؛ self-reference والدورات والهدف المجهول أو المبطل سابقاً مرفوضة.
- الدليل وprovenance يجب أن يحلا قبل قبول العلاقة الحساسة للثقة.
- لا يؤثر أي منهما على الإسقاط المتحقق إلا إذا اجتاز trust threshold.
- replay من سجل فارغ يجب أن يعطي النتيجة نفسها.

## الإلهام وحدوده

عقد Mayadeen مستلهم من أبعاد what/when/where/why في [GS1 EPCIS 2.0](https://ref.gs1.org/standards/epcis/2.0.0/)، لكنه Event Intelligence contract خاص بميادين. لم يخضع لاختبار EPCIS conformance ولا يستخدم GS1 vocabularies كاملة، لذلك لا توجد مطالبة توافق.
