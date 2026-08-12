# بوابة الأفعال المحكومة

## القرار المعماري

لا يغيّر الموظف أو التطبيق property مباشرة. يرسل `ActionSubmission` إلى `ActionGateway` وفق `ActionDefinition` بإصدار ثابت. النتيجة التشغيلية، لا نجاح الاستدعاء التقني، تحدد التطبيق.

## ما يتحقق منه Gateway

- actor وrole والسلطة.
- وجود target entity.
- current-state precondition.
- action/instruction version.
- required sequence/dependencies.
- evidence types.
- location reference.
- state-context isolation.
- idempotency وoffline sequence.
- approval وindependent verifier عند الحاجة.
- حل evidence وprovenance وعلاقتهما بالهدف والسياق والفعل.
- إعادة حساب SHA-256 للفعل ومطابقته مع `payloadHash` المرفوع.
- ربط الحدث الناتج حرفياً بهوية الحدث والهدف والسياق والأدلة والمصدر والموائم وهوية التسليم للفعل المقبول.

النتائج: `accepted`, `rejected`, `requires-review`, `exception-created`, `conflict-detected`, `duplicate-ignored`.

## الذرية المحلية

الترتيب الثابت هو: validation ثم evidence/provenance resolution ثم event construction ثم event contract validation ثم إعادة حل الأدلة والمصدر ثم action-to-event binding ثم repository append ثم idempotency index commit. يطابق الربط `payloadHash` و`idempotencyKey` و`offlineSequence` وsource record/system وadapter ID/version، إضافة إلى event/entity/context/references.

فشل factory أو binding أو repository لا يثبت المفتاح ولا يضيف حالة جزئية، لذلك يمكن retry آمن. المستودع، لا ذاكرة البوابة، يميز الإعادة المطابقة عن التعارض. نفس المفتاح والبصمة يعيدان `duplicate-ignored`، بينما المحتوى القانوني المختلف للمفتاح نفسه ينتج `conflict-detected` حتى بعد إنشاء بوابة جديدة فوق المستودع المحلي نفسه.

المسار المقبول المعروض في المختبر يصل من submission إلى event append ثم trust/projection/output. هو إثبات محلي للعقد فقط، لا تنفيذ حقل ولا workflow durable.

## Zero-entry action

يفترض العقد أن event/venue/zone/entity/assignment/actor/time/instruction/current state/responsible party/decision/context معروفة مسبقاً. الإدخال البشري يقتصر على حكم يحتاج إنساناً: تأكيد، استثناء، measurement، evidence، أو escalation. لا يوجد raw property editor ولا فعل `set-readiness`؛ المدقق يرفض تعديل نسبة الجاهزية المباشر.

## ما هو محلي الآن

تعريفات `confirm-work-completion`, `verify-work`, و`report-exception` ومحاكاة القبول ورفض السلطة والدليل. actor IDs نصوص fixtures وليست هويات موثقة. لا يعتبر ذلك RBAC أو approval رسميًا.

## البديل الأبسط

نموذج checklist مع توقيع مشرف. يبقى مناسباً إذا لم تثبت التجربة أن prefill والـvalidation يخفضان وقت الإدخال أو الخطأ. Gateway يصبح ذا قيمة فقط عندما تقاس جودة القرار والتنفيذ.

## مرجع خارجي

فصل action عن property edit يتوافق مفاهيمياً مع [Palantir Action Types](https://www.palantir.com/docs/foundry/action-types/overview) وsubmission criteria، لكنه تنفيذ Mayadeen مستقل ولا يستخدم Palantir أو يدعي التكافؤ.
