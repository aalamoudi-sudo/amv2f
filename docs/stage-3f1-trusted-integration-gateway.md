# Stage 3F.1 — البوابة الموثوقة والتدفق الدائم

**الحالة:** أساس محلي مكتمل بعد اجتياز بوابات الجودة في هذا المستودع

**النطاق:** بوابة TypeScript محلية على `127.0.0.1`، مصدر محاكى آمن، وSQLite محلي. لا يوجد جهاز أو Broker أو cloud أو SDK مورّد أو credential إنتاجي.

## النتيجة

تضيف Stage 3F.1 مسارًا دائمًا فوق عقود Stage 3F.0 ومسار الحقيقة في Stage 3D:

```text
Local source simulator
  -> local source authentication
  -> schema + registry + scope validation
  -> canonical IoTObservation
  -> CaptureEnvelope + Provenance + Stage 3D validation
  -> one SQLite transaction
     -> append-only observation
     -> append-only operational event (reported)
     -> ingestion attempt
     -> transactional outbox
  -> local HTTP/SSE workspace
```

القبول لا يغير baseline أو readiness أو decisions أو verified projection أو alarm معتمد أو workflow. الحدث الناتج `sensor.observed` و`reported` فقط.

## التخزين الدائم

يستخدم المختبر `node:sqlite` المدمج في Node `>=22.13.0`، مع `WAL` و`foreign_keys` و`synchronous=FULL`. لم تضف SQLite dependency خارجية لأن runtime المرفق يدعمها مباشرة. SQLite اختيار مختبر محلي قابل للاستبدال، لا ادعاء قاعدة بيانات إنتاجية أو HA أو تشفير أو retention مؤسسي.

منفذ `DurableEventStore` هو الحد الوحيد الذي تحتاج PostgreSQL إلى تنفيذه لاحقًا. لا تعتمد عقود IoT أو HTTP أو الواجهة على SQL أو `DatabaseSync`.

المهاجرات الحالية تصل إلى الإصدار `3` وتحفظ:

- revisions لسجل الأجهزة وتعريفات datastream.
- محاولات الإدخال، بما فيها الرفض والتكرار والحجر.
- الملاحظات القانونية المقبولة والأحداث التشغيلية وCaptureEnvelope وProvenance.
- الحجر وoutbox وهويات منع التكرار.
- إصدار migration وفهارس المصدر والتسلسل والنطاق.

Triggers تمنع `UPDATE` و`DELETE` للملاحظات والأحداث المقبولة. التصحيح مستقبلًا يجب أن يكون سجلًا جديدًا مرتبطًا، وليس تعديلًا للتاريخ. لا توجد API أو واجهة لمسح السجل؛ تنظيف المختبر موجود فقط في أدوات الاختبار المؤقتة.

## الوقت والهوية

المصدر يرسل capture محدودًا ولا يرسل `observationId` أو `payloadHash` أو `platformReceivedAt` أو `eventId` أو `outboxId` أو trust assertion. البوابة تعيد بناء كل ذلك بصورة حتمية.

`platformReceivedAt` هو وقت بوابة محلية فقط وتصنيفه `gateway-local-untrusted`. لا يمثل ساعة سلطوية ولا يثبت زمن جهاز أو هوية إنتاجية.

## تشغيل محلي

```bash
pnpm dev:gateway
pnpm dev:app
pnpm dev:stack
pnpm simulate:gateway
pnpm test:gateway
```

`pnpm simulate:gateway` يتطلب `MAYADEEN_IOT_GATEWAY_SECRET` في البيئة فقط، ويرفض أي `MAYADEEN_IOT_GATEWAY_URL` ليس `http://127.0.0.1` أو `http://localhost`. ملف `.env.example` يحتوي placeholders ولا يتضمن سرًا صالحًا.

## ما بقي خارج النطاق

- أي جهاز، MQTT broker، Bluetooth، UWB، Modbus، HTTP vendor API أو cloud.
- mTLS وOAuth2 client credentials وbroker-managed identity وhardware-backed identity؛ هذه بدائل مستقبلية موثقة فقط.
- deployment، PKI، HSM، encryption at rest، tenancy، observability production أو policy retention.
- command/control والكاميرات وAI والمحاكاة وStage 4.

## مدخلات Stage 3F.2 المطلوبة من أحمد

لا تبدأ Stage 3F.2 إلا بعد توفير موافقة مكتوبة تشمل:

1. حالة استخدام واحدة وجهاز/نظام مصدر واحد ومالك تشغيلي واضح.
2. معرفات event/venue/entity معتمدة وربط مكاني مراجع، لا geometry مفبركة.
3. عقد datastream مجمد: الوحدة والحدود والحداثة والتسلسل وحالات الجودة.
4. قرار هوية مناسب: mTLS أو OAuth2 أو broker identity أو hardware-backed identity، مع مالك للأسرار.
5. سياسة وقت ومزامنة، احتفاظ وخصوصية، أمن شبكي، incident response وrollback.
6. قبول موائم قابل للاستبدال، مع معيار نجاح مقابل استيراد CSV/JSON يدوي.
7. تصريح منفصل لأي اتصال خارجي أو جهاز أو شبكة أو procurement.
