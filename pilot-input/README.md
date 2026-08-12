# مدخلات طيار Stage 3E.2

هذا المجلد منطقة استقبال آمنة لحزمة تأليف محلية. يحتوي الآن على بيانات وصفية
منقحة للحزمة المرشحة الخاصة بحفل افتتاح وتدشين حدائق الملك عبدالله، لكنه لا
يحتوي الملفات الخام أو بيانات تشغيلية معتمدة. الحزمة ما زالت `candidate` وليست
`baseline` أو حزمة جاهزة للإنتاج.

## قواعد الاستخدام

- ضع المواد الحساسة في `pilot-input/private/` أو `pilot-input/raw/` أو `pilot-input/evidence/`؛ كلها متجاهلة من Git.
- لا تنسخ DWG أو SKP أو MAX أو Twinmotion أو الصور أو الفيديو إلى المسارات المتتبعة.
- لا تُدخل كلمات مرور أو مفاتيح أو access tokens أو بيانات شخصية في أي قالب.
- استخدم IDs إنجليزية ثابتة، واحتفظ بالتسمية العربية والإنجليزية في حقلين منفصلين.
- اترك المعلومة المجهولة فارغة أو صَنّفها `unknown`؛ لا تخمّنها.
- لا تُعدّل الملفات الأصلية الواردة من أحمد. أنشئ نسخة عمل داخل المسار الخاص.
- التواريخ بصيغة ISO 8601، مثال: `2026-08-20T08:00:00.000Z`.
- نظام الإحداثيات المحلي: متر، right-handed، Z-up. التحويل إلى Three.js يتم عبر `threejs-y-up-v1`.

## الملفات

| الملف | الغرض |
| --- | --- |
| `event.json` | هوية الفعالية وحوكمة حزمة المصدر |
| `venue.json` | الموقع والمرجع المكاني وإصدارات الربط |
| `entities.csv` | العناصر المكانية وهويتها وهندستها المحلية |
| `routes.json` | هندسة المسارات ومصدرها وسلطتها وإصدارها |
| `readiness.csv` | الجاهزية والملكية والمصدر والدليل والأثر |
| `decisions.json` | القرارات والخيارات والسلطة والأثر |
| `roles.csv` | الأدوار والإجراءات والأنواع المسموحة |
| `authorities.csv` | جهات الاعتماد وفصل الواجبات |
| `integration-profiles.json` | ملفات الموائمات ومرشحو التكامل بلا أسرار |
| `projection-profile.json` | بيانات معاينة الإسقاط والمخرج المادي، بلا معايرة |
| `evidence-register.csv` | سجل مراجع الأدلة، لا ملفات الأدلة نفسها |
| `sources-register.csv` | سجل المصادر والمالكين والتصنيف والاحتفاظ |

The English field names are executable contract identifiers. Arabic text explains
their operational meaning. Real source data remains local and uncommitted until
Ahmed explicitly approves its inclusion.

## السجلات المنقحة المتتبعة

- `manifests/kap-pilot-definition-v1.json`: هوية الفعالية والنطاق والافتراض.
- `manifests/kap-cad-intake-v1.json`: حقائق CAD المنقحة بلا الملف الخام.
- `manifests/kap-governance-v1.json`: أدوار المشروع وحدود الهوية والصلاحية.
- `source-register/kap-source-register-v1.json`: بصمات وتصنيفات المصادر المعتمدة للاستقبال.
- `derived-register/kap-derived-register-v1.json`: الأصول المشتقة والمرشحة مع سلسلة المصدر.
- `validation/kap-freeze-gates-v1.json`: جميع بوابات التجميد الحالية وحالتها المانعة.
