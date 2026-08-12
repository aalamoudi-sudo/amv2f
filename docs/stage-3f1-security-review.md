# Stage 3F.1 — مراجعة الأمن

**الحكم:** مناسب لمختبر محلي معزول فقط، وليس production identity أو اتصال جهاز حي.

| التهديد | الضبط المحلي | حد الادعاء |
| --- | --- | --- |
| Spoofing | `SourceAuthenticator` قابل للاستبدال وBearer secret من environment فقط، مع مقارنة ثابتة الزمن. | ليس PKI أو هوية إنتاج. |
| Replay | idempotency/source identity/device-stream-sequence تحفظ في SQLite عبر قيود فريدة. | لا يعالج distributed multi-site replay. |
| Credential leakage | لا secret في browser أو fixture أو SQLite أو OpenAPI أو screenshot؛ logger معطل وAPI لا تعيد headers. | لا يوجد vault أو rotation production. |
| Cross-event injection | البوابة تقارن event/venue/context مع registry وتهمل IDs العميلية المشتقة. | registry نفسه محلي خيالي. |
| Payload abuse | content type و64 KiB body limit افتراضي وAjv وrate limit وCORS allowlist. | لا يوجد WAF أو perimeter. |
| Malformed input | error handler عربي آمن بلا stack، والمدقق Never-throw. | لا توجد isolation process مستقلة. |
| Denial of service | loopback فقط، rate limit، SQLite timeout، وحدود body. | ليس مقاومة DoS على شبكة عامة. |
| Quarantine misuse | conflict/stale لا ينشئان event مقبول أو outbox؛ read-only UI بلا clear. | review/approval workflow مؤجل. |
| Database corruption | startup يفشل closed، readiness يعلن durable store unavailable، والمهاجرات transactionally rollback. | لا backup أو DR production. |
| Log leakage | Fastify logger معطل ولا يسجل authorization أو body. | observability production مؤجل. |

## مراجعة الهوية المستقبلية

عند وجود موافقة منفصلة، تستبدل واجهة `SourceAuthenticator` فقط. الخيارات المقبولة للمراجعة لاحقًا: mTLS، OAuth2 client credentials، broker-managed identities، أو hardware-backed identities. لا ينفذ هذا sprint أيًا منها.

## Controls recovery

- الإصدار المستقبلي للمخطط يفشل closed.
- البيانات التالفة لا تجعل API تقبل إدخالًا جزئيًا.
- triggers تمنع تعديل أو حذف accepted observations/events.
- لا endpoint لإعادة ضبط المختبر؛ الاختبار المؤقت وحده ينظف مساره.
