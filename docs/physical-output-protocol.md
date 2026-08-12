# بروتوكول المخرج المادي

**المعيار الحاكم:** `MEIOS-PDT-STD-001 v1.0.0`
**Stage 3D:** contract + local preview فقط؛ لا Stage 6 ولا hardware control ولا calibration.

## `PhysicalSceneCommand 1.0.0`

يحمل command ID وبصمة محتوى command وهوية محاولة التسليم، projection version/content hash، output profile وmapping، target device ID، scene ID، entity/route visual states، issue/expiry، sequence، acknowledgement requirement، وsource event IDs.

القواعد:

1. يأخذ نفس هوية محتوى الإسقاط التي يستهلكها 2D و3D، مع أمر مادي مستقل مشتق من payload.
2. لا يحتوي business logic.
3. لا يكتب إلى ledger أو baseline ولا يقبل sensor feedback بصفته output adapter.
4. لا يصبح المجسم أو البروجكتر مصدر حقيقة.
5. أي vendor renderer خلف replaceable adapter.
6. expiry/version mismatch -> stale أو blackout-safe path مستقبلًا.
7. preview acknowledgement واختبار retry محليان ولا يثبتان وصولاً إلى جهاز.

## المعاينة الحالية

`PREVIEW-ONLY-NO-HARDWARE` يعرض entity color/intensity/label محليًا. لا projector، لا TouchDesigner، لا OSC، لا calibration profile، لا device acknowledgement حقيقي.

## شروط أي تجربة مادية لاحقة

موافقة أحمد، deployment profile، equipment-list gate، projection study، model/entity manifest، approved source geometry، safety/AV review، calibration profile، waivers، acceptance plan، وrollback. توثيق العقد لا يمنح شراء أو تشغيلًا.
