# Stage 3F.1 — مراجعة معمارية

## الحكم

التصميم event-agnostic: event/venue/entity/zone/datastream كلها بيانات registry وليست constants في Core أو UI. التهيئة الافتراضية محلية خيالية فقط لا تمثل فعالية حقيقية.

## طبقات قابلة للاستبدال

| الطبقة | المنفذ الحالي | الاستبدال لاحقًا |
| --- | --- | --- |
| Source identity | `SourceAuthenticator` محلي | mTLS/OAuth2/broker/hardware identity بعد موافقة. |
| Ingress | Fastify HTTP محلي | HTTP/MQTT/BLE/UWB/Modbus/vendor API خلف adapter، لا في Core. |
| Durable store | `DurableEventStore` + SQLite | PostgreSQL ينفذ المنفذ نفسه بلا تغيير العقود. |
| Delivery | SQLite transactional outbox + SSE | consumer أو broker لاحق عبر outbox adapter. |
| Browser | HTTP/SSE source فقط | لا database import ولا device connection. |

## ضمانات Stage 3F.0 وStage 3D

- `IoTDeviceRegistryRecord` و`IoTStreamDefinition` و`IoTObservation` و`IoTSpatialBinding` لم تُنسخ كعقود Gateway جديدة.
- hash القانوني يعاد حسابه من observation المعاد بناؤها.
- CaptureEnvelope وProvenance وOperationalEvent مبنية بالـStage 3D adapter والـvalidators نفسها.
- append-only truth محفوظ في SQLite؛ التصحيح سجل جديد مرتبط في مرحلة لاحقة.
- source time وgateway time لا يوصفان بالسلطوية؛ `gateway-local-untrusted` صريح.
- لا منطق vendor أو event-specific دخل core.

## قرار SQLite

SQLite مناسب هنا لأن العملية واحدة محلية ويجب إثبات transaction/restart/failure semantics بلا خدمة خارجية. لا يثبت cluster writes أو multi-region availability أو production backup. يستبدل PostgreSQL `DurableEventStore` عندما تعتمد Stage لاحقة متطلبات transaction/concurrency/retention حقيقية.
