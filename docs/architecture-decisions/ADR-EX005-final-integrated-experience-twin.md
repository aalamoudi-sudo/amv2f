# ADR-EX005 — Final Integrated Experience Twin

- Status: Accepted for EX.1F feature review
- Date: 2026-08-01
- Scope: additive local candidate review

## Context

EX.1A–EX.1D أنشأت حزمة تجربة وStory Map ومشاهد محكومة وبروفة رقمية. وصلت ثلاثة مصادر مؤسس إضافية، لكن دمجها مباشرة في الحزمة أو في UI مخصص كان سيخلط سلطة المصدر بالحقيقة التشغيلية ويكرر مخازن الاختيار.

## Decision

نعتمد `FourDayExperienceTruthProjection` كإسقاط حتمي، read-only، وعميق التجميد. يجمع manifests وfacts وtraces وconflicts وdays وpersonas وjourneys وroute candidates وdestinations وcontent candidates وasset requirements، مع بصمة محتوى لا تشمل حالة العرض.

واجهة `ExperienceIntegratedReview` عامة ومحمّلة عند الطلب، وتقرأ الإسقاط وفق `projectId + eventId + venueId`. لا يحتوي Core على شرط باسم KAP. تبقى البيانات الخاصة بالمشروع في سجل البيانات والmanifest.

تستخدم الأسطح كلها `ExperienceSelectionContext` نفسه، ويضيف العقد `reviewMode` و`presentationStep` و`presentationPaused`. يبقى view state خارج بصمة الحقيقة.

## Authority separation

- تحقق SHA والحجم والصفحات يثبت تطابق اللقطة فقط.
- `founder-supplied-working-candidate` لا يعني اعتماد العميل أو الهندسة أو HSE.
- حقيقة البرنامج لا تنتج readiness أو evidence verification أو decision approval.
- Story Map لا تتحول إلى `SpatialRoute`.
- marker لا يثبت حالة تشغيلية.
- إعادة البصمة لا تعالج تعارضًا أو ترقية غير قانونية.

## Restricted information

الحقائق المقيدة تحمل `clientVisibility=hidden` و`operationalUsability=blocked`. لا تدخل تفاصيل HSE المكانية الدقيقة للألعاب النارية في إسقاط المتصفح أو عرض العميل أو ZIP.

## Consequences

### Positive

- تجربة مراجعة واحدة بدل مختبرات منفصلة.
- مصالحة قابلة للاختبار والتكرار.
- بقاء المحركات الحالية والهوية المكانية والروابط العميقة.
- إمكانية استبدال الملفات والمشهد والمحرك المكاني لاحقًا دون تغيير Core.

### Constraints

- الإسقاط المحلي ليس مستودع تدقيق إنتاجيًا.
- التوقيت المحلي للاستخراج غير موثوق.
- لا توجد سلطة تفعيل أو جاهزية أو هندسة.
- 360 وGLB الإنتاجي مفقودان.

## Rejected alternatives

- دمج PDFs الخام في المتصفح: مرفوض للحجم والحقوق والخصوصية والسلطة.
- اختيار مسار من الصور: مرفوض لغياب السلطة والهندسة.
- تحويل الصور المسطحة إلى 360 مزعوم: مرفوض لعدم صدق الوسيط.
- مخزن اختيار مستقل لعرض العميل: مرفوض لتفادي الانحراف بين الأسطح.
- بدء Stage 4 أو إدخال SDK: مرفوض خارج التفويض.

## Wave A Addendum

يضيف `ADR-EX006` غلاف الإنتاج المرئي وعقدي استلام التشغيل والاستوديو. لا
يستبدل هذا القرار إسقاط EX.1F ولا يغيّر سلطة أي مصدر؛ المعاينة والقبول الوصفي
والربط ثلاث عمليات منفصلة، وتظل موجتا B وC معلقتين حتى وصول الملفات الحقيقية.
