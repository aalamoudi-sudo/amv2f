# Stage 3D.1 — تقوية نزاهة التكامل

**التاريخ:** 2026-07-12
**الحالة:** مختبر معماري محلي؛ لا تكامل حي ولا اعتماد تشغيلي.
**نطاق البيانات:** `temporary-demo` ومحاكاة محلية فقط.

## ما كان غير كافٍ

- كانت هوية الإسقاط قابلة لإعادة الاستخدام رغم تغير محتوى سابق أو تهيئة مؤثرة.
- لم تكن هوية أمر الإخراج منفصلة عن محاولة تسليمه.
- كانت مراجع الدليل وprovenance قابلة للمرور دون حل كامل عند حدود الثقة.
- أمكن لعلاقة تصحيح ناقصة الحراسة أن تشير إلى سياق أو عنصر آخر.
- كشف عقد السجل القانوني عملية `clear`، وكانت الذرية بين append وidempotency غير مكتملة.
- كان محرك المختبر مرتبطاً بمعرّفات fixture، ولم تكن JSON Schemas تنفذ بمدقق Draft 2020-12 فعلي.
- كان عدّ manifests العشرة أقوى من دليل مسارات conformance الكاملة لكل واحد.

## ما صُحح

1. الإسقاط يحمل `projectionContentHash` من SHA-256 لمحتواه القانوني و`projectionVersion` بصيغة `PROJECTION-v1-<sha256>`.
2. كل أمر يحمل `commandContentHash` و`commandId` مشتقاً منه، بينما `deliveryAttemptId` يتغير في الإعادة دون تغيير الأمر المنطقي.
3. التزامن يعيد حساب البصمات ويفحص النسب والسياق والربط والملف والحالات، لا نص الإصدار وحده.
4. `EvidenceResolver` و`ProvenanceResolver` يمنعان المراجع المعلقة أو غير المرتبطة قبل الثقة أو تنفيذ الفعل.
5. التصحيح وإعلان الخطأ مقيدان بحدث سابق، والعنصر والسياق نفسيهما، وعلاقة متوافقة، وسبب وprovenance صالحين، ومن دون دورة.
6. ترتيب الفعل: تحقق، حل المراجع، بناء الحدث، تحقق العقد، append، ثم تثبيت idempotency. الفشل قبل append أو فيه يترك المفتاح صالحاً لإعادة آمنة.
7. العقد القانوني للسجل append-only ولا يكشف حذفاً أو مسحاً. reset ينشئ حاوية مختبر جديدة.
8. `IntegrationLabEngine` يستقبل `IntegrationLabConfiguration`; شُغّل بتهيئتين مختلفتين دون تغيير خدمته.
9. Ajv `8.20.0` ينفذ سبعة مخططات Draft 2020-12، fixtures الصالحة/المرفوضة، وأجسام runtime.
10. ستة موائمات إدخال وأربعة إخراج تمر بمصفوفة conformance محلية فردية.

## مسار الفعل المقبول

```text
Assigned work
-> ActionSubmission
-> authority / precondition / sequence validation
-> evidence resolution
-> provenance resolution
-> OperationalEvent construction and validation
-> append-only repository
-> trust evaluation
-> canonical projection
-> synchronized output previews
```

تعرض الواجهة هذا المسار بوصفه: **تنفيذ محاكي محلي — ليس إجراءً تشغيليًا فعليًا**.

## حدود Stage 3C.1

بقيت storage schema `8`، quarantine، ترتيب lifecycle، عدم اختلاق provenance في migration، عزل `temporary-demo`/`baseline`/`scenario`، وفصل `operationalPriorityScore` عن `dataQualityAttentionScore` كما هي. حدث تعديل توافق أدنى في `useEventStore.ts`: تعديل سيناريو readiness يحتفظ بـ`updatedAt` و`updatedBy` للسجل بدلاً من اختلاق وقت جهاز وممثل محليين؛ تعديل baseline لم يتغير.

## ما لا يثبته هذا العمل

- لا يثبت موثوقية مصدر خارجي، هوية مستخدم، وقتاً سلطوياً، chain of custody، أو durability.
- لا يمنح مطابقة W3C PROV أو EPCIS أو OGC أو اعتماد JSON Schema للمنتج.
- لا يجعل المحولات تكاملات مورّد، ولا يجعل المعاينات مخرجات حية أو معايرة مادية.
- لا يثبت قيمة تشغيلية، ولا يصرح Stage 3E أو Stage 4.

## أثر الحزمة

| القياس | المرجع `2648b949` | Stage 3D.1 | الفرق |
| --- | ---: | ---: | ---: |
| JavaScript الابتدائي | 1,466.38 kB | 1,466.51 kB | +0.13 kB |
| gzip الابتدائي | 409.12 kB | 409.15 kB | +0.03 kB |
| chunk المختبر lazy | 100.22 kB / 26.02 kB gzip | 328.56 kB / 88.33 kB gzip | +228.34 / +62.31 kB |

بقي workspace محملاً عند الطلب، لذلك لا ينتقل Ajv والعقود الموسعة إلى المسار الابتدائي إلا بفارق ضئيل. زيادة chunk المختبر ناتجة أساساً عن Ajv Draft 2020-12 وتشغيل schemas؛ لم يُضف vendor SDK. تحذير Vite الحالي للـchunk الابتدائي الأكبر من 500 kB ما زال معروفاً، ولم يبدأ sprint أداء غير مرتبط.

## بوابة ما بعد Stage 3D.1

أي Integration Lab خارجي يحتاج قرار أحمد بحالة استخدام واحدة، data contract مجمد، مصدر ومالك وسلطة حقيقيين، سياسة هوية ووقت، مخزن durable، أمن وخصوصية، adapter acceptance plan، rollback، ومقاييس نجاح. هذا المستند لا يمنح تلك الموافقة.

## دليل التحقق

- TypeScript وlint: ناجحان.
- Vitest: `144/144` في 28 ملفاً.
- Stage 3C.1 focused regression: `55/55` في 8 ملفات.
- Playwright: `88/88` على 1920×1080 و2560×1080.
- Production build: ناجح مع تحذير الحجم المعروف فقط.
- Visual review: 32 PNG، كلها فريدة وكل أبعادها صحيحة، بلا إطار مشترك متعمد.
- ZIP: `/Users/mayadeen/Downloads/mayadeen-stage-3d1-integration-integrity-hardening-review.zip`.
- ZIP SHA-256: `05f4f50b0d98673b7bd7ccbe5b9814451c7a0cabbf21feeac1266905530eb3ef`؛ اجتاز `unzip -t`.
