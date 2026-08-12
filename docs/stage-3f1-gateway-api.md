# Stage 3F.1 — Gateway API

المصدر الرسمي القابل للقراءة الآلية هو [`openapi/iot-gateway-v1.yaml`](../openapi/iot-gateway-v1.yaml). كل المسارات محلية افتراضيًا على `http://127.0.0.1:8787`.

## الحدود

- `POST` يستخدم `Authorization: Bearer <temporary-local-secret>` من environment المصدر فقط.
- المتصفح لا يملك السر ولا يرسله ولا يتصل بقاعدة البيانات.
- `GET` وSSE يعيدان بيانات محلية sanitized فقط.
- لا تقبل API حقول الهوية أو hash أو الوقت أو الثقة التي تملكها البوابة.

## المسارات

| المسار | الغرض |
| --- | --- |
| `GET /health/live` | حالة العملية والاتصال الخارجي `absent`. |
| `GET /health/ready` | readiness مستقل للبوابة والمخزن والسجل وoutbox والتوثيق المحلي. |
| `POST /api/iot/v1/observations` | إدخال capture واحد موثق. |
| `POST /api/iot/v1/observations:batch` | عناصر مستقلة؛ الغلاف غير الفارغ يرد `207` ويشرح نتيجة كل عنصر، بما فيها فشل التوثيق لكل عنصر. |
| `GET /api/iot/v1/devices` | آخر revision فعال للأجهزة. |
| `GET /api/iot/v1/devices/:deviceId` | جهاز واحد أو `404`. |
| `GET /api/iot/v1/observations` | التاريخ المقبول append-only. |
| `GET /api/iot/v1/quarantine` | تعارضات وقراءات قديمة محجورة. |
| `GET /api/iot/v1/events/stream` | SSE sanitized مع replay cursor. |

## النتائج وحالات HTTP

| النتيجة | HTTP | المعنى |
| --- | ---: | --- |
| `accepted-reported` | 201 | أُلحقت observation/event/outbox/attempt في معاملة واحدة. |
| `duplicate-ignored` | 200 | إعادة مطابقة؛ لا event أو outbox ثانٍ. |
| `conflict-quarantined` | 409 | اصطدام هوية بمحتوى مختلف؛ الحجر فقط. |
| `stale-quarantined` | 422 | تجاوز حداثة أو ترتيب تسلسل؛ الحجر فقط. |
| `rejected-unknown-device` | 422 | الجهاز غير موجود. |
| `rejected-disabled-device` | 422 | الجهاز غير مفعل. |
| `rejected-stream-contract` | 422 | القناة/القيمة/الوحدة لا تطابق العقد. |
| `rejected-context` | 422 | event/venue/state context غير مطابق. |
| `rejected-authentication` | 401 | فشل توثيق المصدر؛ لا append مقبول. |
| `rejected-schema` | 400 | JSON أو capture schema غير صالح. |
| `gateway-unavailable` | 503 | المخزن أو المعاملة غير متاحين بأمان. |

`415` مخصص لترويسة content type غير `application/json`، و`413` لحمولة تتجاوز الحد المحلي، و`429` لحماية rate limit. لا تعيد الاستجابات stack trace أو Authorization header.

الغلاف الذي لا يحتوي `items` غير فارغة يرد `400` قبل معالجة أي عنصر. لذلك لا يقبل endpoint قائمة فارغة تتظاهر بنجاح دفعة.

## SSE وoutbox

كل observation مقبولة تنشئ outbox في المعاملة نفسها. SSE يعيد summary بلا credential أو configuration private. الرسالة تحمل `id` من `deliverySequence`؛ يعيد المتصفح `Last-Event-ID` تلقائيًا عند EventSource reconnect، ويمكنه إزالة التكرار عبر `notificationId`.

الضمان **at-least-once** لا exactly-once: قد تصل رسالة مكررة بعد restart أو reconnect، ويجب أن يبقى العميل idempotent. outbox غير المسلّم يبقى دائمًا إلى أن يصل اتصال SSE محلي، ولا توجد خدمة خارجية أو broker خلفه.
