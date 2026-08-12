# الإسقاط القانوني للحالة

## القاعدة

الواجهة والمخرجات تستهلك `StateProjection` فقط. Source Adapter لا يغير entity/readiness/status مباشرة.

`buildCanonicalStateProjection(events, context, options)`:

1. يرتب record time ثم revision ثم event ID.
2. يعزل state context.
3. يحدد error/supersession من أحداث موثوقة فقط.
4. يستبعد rejected وغير eligible.
5. يختار آخر trusted event لكل entity.
6. يذكر كل `sourceEventIds` والتفسير.
7. يبني تمثيلاً قانونياً يشمل نسب الأحداث والحالات والمتطلبات والتهيئة والربط.
8. يحسب SHA-256 وينتج `projectionVersion` بصيغة `PROJECTION-v1-<sha256>`.

`options` هو الحد الفاصل للتهيئة: أسماء العناصر ومتطلبات الجاهزية تأتي من حزمة الفعالية، بينما ربط المسارات وهدف المعاينة المادية يأتي إلى `createProjectionOutputs` عبر خيارات إخراج منفصلة. لا تحتوي خدمة الإسقاط على IDs لموقع أو منطقة أو مسار بعينه.

`generatedAt` قيمة عرض مستبعدة من الهوية الدلالية. تغييرها وحده لا يغير البصمة، بينما يغيرها أي اختلاف مؤثر في حدث سابق أو label أو requirement أو readiness أو assertion أو disposition أو configuration أو mapping أو context. replay من سجل فارغ وبأي ترتيب إدخال قانوني يعطي النتيجة نفسها. التنفيذ المحلي في الذاكرة؛ backend المستقبل يستبدل repository ولا يغيّر دالة domain.

## تحقق المخرجات

كل output command يحمل بصمة المحتوى وإصدار profile وmapping وlineage. التزامن يعيد حساب بصمات الإسقاط والأوامر ويفحص حالات العناصر والسياق والنسب؛ تطابق `projectionVersion` النصي وحده غير كافٍ. التفاصيل في `projection-and-command-identity.md`.

## اشتقاق الجاهزية

`OperationalRequirement` يحمل weight/outcome/contributing events/eligible trust states. `readiness` يصف completion، بينما `verifiedReadiness` يستخدم متطلبات verified فقط. data completeness/confidence/approval coverage مستقلة. لا يوجد فعل يكتب نسبة readiness.

## العزل

- `temporary-demo`: مختبر فقط.
- `baseline`: لا يكتب إليه مختبر Stage 3D.
- `scenario`: projection مستقل ولا يغير demo أو baseline.

## تفسير الفشل

إذا غاب event أو evidence أو trust، لا يُختلق default موثوق. تعرض الواجهة “لا توجد حالة متحققة” بدل رفع observation إلى حقيقة.
