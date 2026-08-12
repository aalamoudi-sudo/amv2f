# ADR-003 — Trusted Gateway and Durable Local Store

**الحالة:** معتمد لتنفيذ مختبر Stage 3F.1 المحلي

**القرار:** تقبل المنصة capture source محدودًا فقط عبر بوابة محلية موثقة، تعيد بناء `IoTObservation` القانونية ثم تمرره عبر Stage 3D إلى SQLite append-only transaction وoutbox/SSE.

## الدافع

Stage 3F.0 أثبت العقود والتحقق والمختبر في الذاكرة، لكنه لم يثبت durability أو authentication أو restart semantics. لا يجوز توصيل Browser بجهاز أو broker أو قاعدة بيانات، ولا يجوز أن يصبح backend المحلي ادعاء جهاز حي أو هوية إنتاج.

## القرار المعماري

- Fastify يعمل على `127.0.0.1` فقط افتراضيًا.
- `SourceAuthenticator` المحلي يأخذ secret من environment؛ future identity ليست منفذة.
- SQLite المدمج هو تنفيذ `DurableEventStore` للمختبر. PostgreSQL بديل على المنفذ نفسه.
- observation/event/outbox/attempt تقفل في transaction واحدة. failed transaction لا تترك accepted partial state.
- observation/event append-only على مستوى DB triggers. التصحيح event جديد لاحقًا.
- outbox + SSE at-least-once، replay بـ`Last-Event-ID`، والعميل يزيل التكرار. لا exactly-once claim.
- وقت البوابة `gateway-local-untrusted` ولا authoritative time.
- واجهة IoT تختار مصدرًا واحدًا صراحة ولا fallback تلقائيًا.

## العواقب

الإيجابي: استمرار تاريخ IoT المحلي بعد restart، منع broker/vendor coupling، وفصل browser/source/database.

السلبي المقصود: لا HA ولا external delivery ولا encrypted production store ولا identity federation ولا device connection. تحتاج هذه قدرًا منفصلًا من الموافقة والسياسة والاختبارات قبل أي integration حقيقي.
