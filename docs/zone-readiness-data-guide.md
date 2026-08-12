# دليل بيانات جاهزية المناطق

هذه القوالب مخصصة لحزمة تحقق محلية. السجلات الحالية تجريبية مؤقتة، ولا تمثل مصدراً حياً أو اعتماداً رسمياً للجاهزية.

## Zone readiness data guide

Use `templates/zone-readiness-template.csv` for tabular preparation and `templates/zone-readiness-template.json` when nested evidence, blockers, and impact objects must remain structured. Code, IDs, enum values, and field names remain English; operational descriptions may be Arabic.

## الحقول / Fields

| Field | Required | Meaning / المعنى |
| --- | --- | --- |
| `zoneId` | نعم / Yes | معرف منطقة ثابت وفق `ZONE-###`. |
| `readiness` | نعم / Yes | نسبة الجاهزية من 0 إلى 100؛ ليست درجة الثقة. |
| `status` | نعم / Yes | الحالة التشغيلية الموصوفة في عقد الحالة الحالي. |
| `riskLevel` | نعم / Yes | مستوى الخطر: `low`, `medium`, `high`, `critical`. |
| `stateContext` | نعم / Yes | `temporary-demo`, `baseline`, or `scenario`. لا تستورد السيناريو إلى الأساس. |
| `source` | نعم / Yes | اسم المصدر الذي أنتج التحديث. |
| `sourceType` | نعم / Yes | `temporary-demo`, `manual-update`, `approved-plan`, `field-check`, or `exercise`. |
| `updatedAt` | نعم / Yes | آخر تحديث بصيغة ISO 8601، مثل `2026-01-01T08:00:00Z`. |
| `updatedBy` | نعم / Yes | الشخص الذي أدخل آخر تحديث. |
| `owner` | نعم / Yes | الجهة المسؤولة عن صحة الحالة، وليست بالضرورة منفذ الإجراء. |
| `responsibleParty` | نعم / Yes | الجهة أو الشخص المسؤول عن تنفيذ الإجراء. |
| `evidence` | عند الاعتماد / Required for approval | مصفوفة مراجع منظمة: `id`, `type`, `titleAr`, `source`, `capturedAt`, `status`. |
| `confidence` | نعم / Yes | `low`, `medium`, or `high` لثقة البيانات، منفصلة عن `readiness`. |
| `approvalStatus` | نعم / Yes | `draft`, `submitted`, `under-review`, `approved`, `rejected`, or `expired`. |
| `approvedBy`, `approvedAt` | عند `approved` / When approved | جهة وتاريخ الاعتماد. لا يطبق هذا النموذج اعتماداً متعدد المستخدمين. |
| `revision` | نعم / Yes | رقم مراجعة يزداد مع كل تعديل محلي. |
| `changeReason` | نعم / Yes | سبب آخر تغيير. |
| `targetReadinessDate` | نعم / Yes | تاريخ الهدف بصيغة `YYYY-MM-DD` أو ISO. |
| `blockers` | اختياري / Optional | عوائق منظمة مع `id`, `titleAr`, `owner`, `severity`, `status`, `dueAt`. |
| `dependencies` | اختياري / Optional | معرفات مناطق يجب أن تكون معروفة في المجموعة. |
| `requiredAction` | نعم / Yes | الإجراء التالي القابل للتنفيذ. |
| `escalationLevel` | نعم / Yes | `none`, `watch`, `elevated`, or `urgent`. |
| `dueAt` | نعم / Yes | موعد الإجراء بصيغة ISO 8601. |
| `operationalImpact` | نعم / Yes | أثر `opening`, `visitorRoutes`, `safety`, `dependentAreas`, وملخص عربي. |
| `relatedRouteIds` | اختياري / Optional | معرفات المسارات المرتبطة، مثل `ROUTE-001`. |
| `openingImpact` | نعم / Yes | أثر الحالة على الافتتاح: `none`, `low`, `medium`, `high`. |
| `expiresAt` | اختياري / Optional | وقت انتهاء صلاحية البيانات بصيغة ISO 8601. |

## الفرق بين الملكية والمسؤولية

`owner` يملك صحة الحالة ويجيب عن سؤال: هل هذا الوصف صحيح ومحدث؟ أما `responsibleParty` فينفذ الإجراء المطلوب ويجيب عن سؤال: من سيغلق العائق؟ لا يجوز استخدام اسم واحد تلقائياً للغرضين دون قرار تشغيلي.

## الحالة الأساسية والسيناريو والبيانات التجريبية

- `temporary-demo`: بيانات خيالية ثابتة للتحقق من الواجهة، وتظهر للمستخدم بوضوح كـ **بيانات تجريبية مؤقتة**.
- `baseline`: الحالة المحلية المرجعية التي لا تمثل حقيقة تشغيلية حية ما لم يصل مصدر معتمد.
- `scenario`: طبقة تمرين فوق الأساس، ولا يجوز أن تستبدل الأساس أو تحفظ فوقه.

## معنى الاعتماد والثقة

`approvalStatus=approved` يعني أن السجل يحمل حقول دليل وسلطة اعتماد مكتملة وفق هذا العقد المحلي فقط. لا يعني أنه نظام اعتماد إنتاجي. `confidence` يصف الثقة في دقة البيانات، ولا يرفع أو يخفض نسبة الجاهزية تلقائياً.

## أخطاء تحقق شائعة / Common validation errors

- معرف منطقة مفقود أو غير معروف أو مكرر.
- غياب `owner` أو `source` أو تاريخ ISO صالح.
- نسبة جاهزية خارج 0–100 أو قيمة ثقة/اعتماد غير معروفة.
- اعتماد سجل دون دليل منظم أو دون `approvedBy` و`approvedAt`.
- موعد هدف أقدم من وقت التحديث.
- اعتماديات تشير إلى منطقة غير موجودة.
- إدخال سجل `scenario` في مجموعة `baseline`.
- انتهاء الصلاحية؛ يظهر كتحذير ويحتاج تحديثاً قبل أي استخدام تشغيلي.

لا تقبل خدمة التحقق السجلات ذات أخطاء العقد بصمت، ولا تحول السجل غير المكتمل إلى توصية موثوقة.
