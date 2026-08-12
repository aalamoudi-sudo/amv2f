# مصفوفة Conformance للمحولات المرجعية

**نطاق الادعاء:** اختبارات حتمية لمحولات مرجعية محلية. الاجتياز لا يعني تكاملاً حيًا أو اعتماد مورّد أو مطابقة معيار خارجي.

| Adapter | الاتجاه | المسار المختبر | النتيجة المحلية |
| --- | --- | --- | --- |
| `adapter-system-work-order` | إدخال | عقد، تطبيع، provenance، evidence، event، duplicate، retry، offline، errors | اجتاز |
| `adapter-schedule-status` | إدخال | عقد، تطبيع، provenance، event، duplicate، retry، offline، errors | اجتاز |
| `adapter-sensor-observation` | إدخال | عقد محاكي، تطبيع، provenance، event، duplicate، retry، offline، errors | اجتاز |
| `adapter-reality-capture` | إدخال | عقد محاكي، تطبيع، provenance، event، duplicate، retry، offline، errors | اجتاز |
| `adapter-governed-human-action` | إدخال | عقد، تعليمة، provenance، event، duplicate، retry، offline، errors | اجتاز |
| `adapter-workflow-result` | إدخال | عقد محاكي، تطبيع، provenance، event، duplicate، retry، offline، errors | اجتاز |
| `adapter-spatial-2d-output` | إخراج | projection/hash/profile/command/ack/retry/context/no feedback | اجتاز |
| `adapter-spatial-3d-output` | إخراج | projection/hash/profile/command/ack/retry/context/no feedback | اجتاز |
| `adapter-geospatial-preview` | إخراج | projection/hash/profile/command/ack/retry/context/no feedback | اجتاز |
| `adapter-physical-output-preview` | إخراج | projection/hash/profile/command/ack/retry/context/no feedback | اجتاز |

## بوابة الإدخال المشتركة

يفحص harness manifest وschema، قبول envelope، حتمية normalization، mapping سجل المصدر، provenance متصلة من الموائم بعقدة مصدر واحدة، event contract، evidence عند وجوده، رفض entity مجهول، duplicate، retry، error، offline المعلن، context، وacknowledgement. اختبارات Stage 3D.1A العدائية مستقلة عن شهادة المسار المرجعي وتثبت رفض المصدر المركب والجهة غير المرتبطة وتعارضات repository.

## بوابة الإخراج المشتركة

يفحص command contract، projection version/content digest، output profile، command digest/identity، acknowledgement، retry attempt identity، synchronization الكامل، structured error، context، غياب ingest feedback، وvendor neutrality.

## ما لم يُختبر

لا network، vendor API، throughput حقيقي، durability، security، authentication، hardware، calibration، أو production recovery. يجب أن يعيد أي موائم خارجي تشغيل suite مخصصة على عقده وبيئته قبل الشراء أو الاستخدام.
