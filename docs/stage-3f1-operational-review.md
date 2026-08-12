# Stage 3F.1 — مراجعة تشغيلية

## قرار الحقيقة

القراءة المقبولة تصل فقط إلى `reported`/`sensor.observed`. لا تستطيع البوابة تعديل baseline أو readiness أو decision أو verified projection أو alarm معتمد أو workflow. المسار يعيد استخدام `CaptureEnvelope` وProvenance وStage 3D validation و`OperationalEvent` بدل مسار حقيقة موازٍ.

## حالات المشغل

مساحة IoT عربية RTL تفرض اختيارًا واضحًا بين `المحاكاة المحلية` و`البوابة المحلية الدائمة`. لكل مصدر حالة مستقلة؛ عند تعطل البوابة تظهر الرسالة:

`البوابة المحلية غير متاحة — لم يتم التحويل إلى بيانات المحاكاة`

وتعرض البوابة الجاهزة:

`بوابة محلية دائمة — لا يوجد جهاز خارجي متصل`

الحالات الظاهرة تشمل الاتصال والجاهزية والتراجع والانقطاع ورفض توثيق المصدر والاستعادة بعد restart والحجر وSSE reconnecting وآخر قراءة محفوظة وقاعدة بيانات فارغة.

## التسلسل والحداثة

البوابة تحسب stale وclock-untrusted وsequence-gap وout-of-range من السجل والعقد والوقت المحلي. stale والتعارض يذهبان إلى quarantine ولا يستبدلان آخر قراءة. sequence gap يظل observation مبلّغة مع quality flag، وليس incident أو alarm معتمد.

## المراجعة البشرية

الحجر مرئي لكنه لا يفتح approval أو command/control. أي عمل تشغيلي لاحق يحتاج authority وpolicy ومسار governed action منفصلًا.
