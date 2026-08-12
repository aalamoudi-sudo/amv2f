# محاذاة JSON Schema وRuntime

## التنفيذ

أضيف `Ajv 8.20.0`، وهو dependency وحيد مخصص لمعيار JSON Schema في Stage 3D.1. يستخدم `Ajv2020` مع Draft 2020-12 و`strict: true` و`allowUnionTypes: true`.

تنفذ سبعة schemas:

1. `adapter-manifest`
2. `capture-envelope`
3. `evidence-reference`
4. `operational-event`
5. `state-projection`
6. `spatial-output-command`
7. `physical-scene-command`

كل schema يمر `validateSchema`. كل fixture صالح يجب أن ينجح في Ajv ومدقق runtime، وكل fixture مرفوض يجب أن يفشل في كليهما للسبب الحاكم. كما تُفحص projection والأوامر الأربعة المولدة أثناء runtime.

## Drift gate

تُسجل كل حالة كـ`schemaValid` و`runtimeValid` و`expectedValid`. أي اختلاف غير موثق ينتج blocking issue من نوع `schema-runtime-drift` ويفشل الاختبار. اختبارات العقد تحمي كذلك output commands وadapter events.

## حدود `additionalProperties`

الأقسام الحساسة للثقة مغلقة، بما فيها event identity/time/subjects/source/evidence/provenance/trust/delivery، projection identity/states/lineage، وأوامر الإخراج. تبقى نقاط التوسع المقصودة فقط في source payload والتهيئة وmetadata المعلنة لأنها حدود adapter، ثم تخضع لقواعد runtime الدلالية.

## فرق مقصود

`validateFormats` معطل في Ajv. المشروع لا يحمّل dependency إضافية لصيغ التاريخ؛ المدقق التشغيلي يفحص ISO timestamps وتسلسلها دلالياً. لذلك لا يعد نجاح schema وحده قبولاً تشغيلياً، ولا يوجد ادعاء شهادة JSON Schema.
