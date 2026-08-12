# Stage 3F.1 — دليل الاستعادة المحلي

## تشغيل وفحص

```bash
MAYADEEN_IOT_GATEWAY_SECRET=temporary-local-value pnpm dev:gateway
curl http://127.0.0.1:8787/health/live
curl http://127.0.0.1:8787/health/ready
```

لا تضع السر في shell history مشترك أو screenshot أو fixture. استخدم قيمة محلية مؤقتة فقط.

## restart متعمد

1. أوقف العملية المحلية.
2. أعد تشغيلها بنفس `MAYADEEN_IOT_GATEWAY_DB`.
3. افحص `GET /health/ready`: `restartRecovered` يدل على تاريخ محفوظ، وoutbox `pending` يدل على رسائل تنتظر SSE.
4. افحص `GET /api/iot/v1/observations` و`GET /api/iot/v1/quarantine`.
5. أعد إرسال capture مطابق؛ يجب أن تكون النتيجة `duplicate-ignored` بلا event أو outbox جديدين.

## مخزن غير متاح أو تالف

- لا تحذف قاعدة بيانات تشغيلية مفترضة من API أو الواجهة؛ لا يوجد endpoint لذلك.
- إذا أعلن `/health/ready` أن durable store `unavailable`، تعامل مع البوابة كغير متاحة ولا تحول الواجهة إلى المحاكاة.
- سجّل سبب المختبر محليًا، وانسخ ملف DB فقط وفق سياسة مصرح بها مستقبلًا. لا توجد سياسة backup/forensics production في هذه المرحلة.
- unknown future migration version يفشل closed؛ لا تخفض الإصدار أو تعدل جدول migration يدويًا.

## outbox وSSE

- افتح مساحة البوابة أو `GET /api/iot/v1/events/stream`؛ يعيد الخادم pending events ثم يحفظ محاولة التسليم.
- قد تصل رسالة مكررة؛ استهلك `notificationId` وSSE `id` بصورة idempotent.
- لا يوجد exactly-once أو delivery إلى نظام خارجي ضمن هذا المختبر.

## فحوص ما قبل الإغلاق

```bash
pnpm test:gateway
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
pnpm build
git diff --check
```
