# دليل بيانات حزمة القرارات التشغيلية

**الحالة:** دليل عربي أولاً لقالب محلي قابل لإعادة الاستخدام. الأمثلة خيالية ومصنفة `temporary-demo`. لا تمثل اعتماداً أو قراراً حقيقياً.

## الصيغ والمعرفات

- الملفات: `operational-decision-pack.csv` أو `operational-decision-pack.json`.
- الوقت: ISO 8601 مع منطقة زمنية، مثال `2030-01-15T09:30:00Z`.
- القرار: معرف ثابت يبدأ بـ`DECISION-`؛ الحدث `EVENT-`؛ الموقع `VENUE-`.
- العنصر المكاني يلتزم بـ`ZONE-`, `ROUTE-`, `HALL-`, `GATE-`, `ASSET-` وغيرها.
- أعمدة CSV المنظمة مثل `relationships`, `evidence`, `availableOptions`, والآثار تُكتب كـJSON صالح داخل الخلية.

## الهوية والسياق

| field | مطلوب | المعنى / القيم |
| --- | --- | --- |
| `decisionId` | نعم | معرف القرار الفريد. |
| `title`, `description` | نعم | عنوان ووصف عربيان للمستخدم. |
| `eventId`, `venueId` | نعم | مراجع حدث وموقع معروفان في الحزمة. |
| `stateContext` | نعم | `temporary-demo`, `baseline`, `scenario`. لا يُستورد scenario كـbaseline. |
| `source`, `sourceType` | نعم | المصدر؛ النوع: `temporary-demo`, `manual-update`, `exercise`, `approved-plan`, `field-check`. |
| `createdAt`, `createdBy` | نعم | وقت ومنشئ السجل. |

## الملكية والقرار

| field | مطلوب | المعنى / القيم |
| --- | --- | --- |
| `decisionOwner` | نعم | المسؤول عن صحة القرار وحالته. |
| `responsibleParty` | نعم | الجهة المسؤولة عن تنفيذ الإجراء. |
| `approvingAuthority` | نعم | السلطة التي يجب أن تعتمد؛ ليست `approvedBy`. |
| `problemStatement` | قبل review | المشكلة التي تحتاج قراراً. |
| `decisionType` | نعم | `readiness`, `safety`, `quality`, `logistics`, `visitor-experience`, `security`, `technical`, `supplier`, `schedule`, `resource-allocation`. |
| `urgency` | نعم | `low`, `medium`, `high`, `critical`. |
| `priority` | نعم | تشخيصي قديم؛ الواجهة تحسب النموذج الحالي ولا تعرضه. |
| `confidence` | نعم | `low`, `medium`, `high`؛ منفصلة عن الأولوية. |
| `assumptions`, `constraints` | نعم | مصفوفتان، ويمكن أن تكونا فارغتين. |

## الخيارات والعلاقات والأدلة

| field | مطلوب | المعنى / البنية |
| --- | --- | --- |
| `availableOptions` | قبل review | مصفوفة `{optionId,titleAr,descriptionAr,expectedImpact,risks}`. |
| `selectedOption` | قبل approved | معرف موجود في `availableOptions`. |
| `rejectedOptions` | نعم | معرفات خيارات موجودة؛ يمكن أن تكون فارغة. |
| `evidence` | قبل approved | مراجع `{id,type,titleAr,source,capturedAt,status}`. |
| `relationships` | نعم | مصفوفة عقد العلاقة الموضحة أدناه. |

كل `DecisionEntityRelation` يحتاج `relationId`, `decisionId`, `entityId`, `relationType`, `impactLevel`, `descriptionAr`, `source`, `confidence`, `stateContext`. الأنواع: `execution-target`, `affected`, `dependency`, `evidence-source`. لا تكرر `(entityId + relationType)`، ولا تعتمد على ترتيب الصفوف.

## الاعتماد والتنفيذ

| field | مطلوب | المعنى |
| --- | --- | --- |
| `approvalStatus` | نعم | `draft`, `under-review`, `approved`, `rejected`. |
| `approvedBy`, `approvedAt`, `approvalComments` | عند approved | من سجل الاعتماد المحلي ووقته وتعليقه. لا يمثل صلاحية رسمية. |
| `actionRequired`, `assignedTo`, `dueAt` | عند assigned | الإجراء والمنفذ والموعد. |
| `escalationLevel` | نعم | `none`, `watch`, `elevated`, `urgent`. |
| `status` | نعم | `draft`, `review`, `approved`, `assigned`, `in-progress`, `completed`, `verified`, `closed`. |

## القياس والتحقق والإغلاق

| field | مطلوب | المعنى |
| --- | --- | --- |
| `expectedImpact` | نعم | `{level,summaryAr,dimensions}`؛ أثر متوقع لا نتيجة فعلية. |
| `completionEvidenceIds`, `completionNote` | عند completed | واحد منهما على الأقل. |
| `actualImpact`, `outcomeStatus` | عند verified | أثر فعلي غير null ونتيجة `positive`, `mixed`, أو `negative`. |
| `verifiedBy`, `verifiedAt`, `verificationEvidenceIds` | عند verified | متحقق ووقت ومرجع دليل واحد على الأقل. |
| `closedBy`, `closedAt`, `closureReason` | عند closed | معلومات الإغلاق المحلية. |
| `lessonsLearned` | عند closed | درس أو تصريح صريح بعدم تحديد درس. |
| `revision`, `changeReason`, `changeHistory` | نعم | إصدار وسبب وسجل محلي؛ ليست audit trail إنتاجية. |

## سجل دورة القرار الإلزامي

يبدأ `changeHistory` دائماً بمراجعة رقم 1 وحالة `draft`. يسمح بتحديثات متعددة داخل الحالة نفسها، لكن الانتقال بين الحالات يجب أن يتبع الترتيب كاملاً:

`draft → review → approved → assigned → in-progress → completed → verified → closed`

- أرقام المراجعات صحيحة موجبة ومتسلسلة بلا فجوة أو تكرار.
- كل entry يحتوي `changedAt`, `changedBy`, و`changeReason`.
- الأوقات مرتبة ولا تسبق `createdAt`.
- `revision` و`status` في السجل يطابقان آخر entry.
- `approvedAt` لا يسبق الإنشاء؛ `verifiedAt` لا يسبق الاعتماد أو الإكمال؛ `closedAt` لا يسبق التحقق.

القوالب المرفقة تستخدم التاريخ الكامل نفسه الذي يفرضه runtime validator. لا تقبل أمثلة من نوع `draft → assigned` أو `draft → verified → closed`.

## سلامة الأدلة والآثار

- معرفات الأدلة فريدة، وبنية كل دليل كاملة وحالته واحدة من `verified`, `pending`, `missing`.
- كل ID داخل `completionEvidenceIds` أو `verificationEvidenceIds` يجب أن يوجد داخل `evidence`.
- دليل التحقق يجب أن يحمل حالة `verified`; الدليل العام أو pending لا يكفي.
- `expectedImpact` كامل دائماً. `actualImpact` كامل عند التحقق ويحتوي مستوى صالحاً وملخصاً عربياً وأبعاداً معروفة.
- القيم `undefined`, `NaN`, الأبعاد غير المعروفة، والخيارات الناقصة أخطاء مانعة.

## أخطاء مانعة شائعة

معرف قرار مفقود أو مكرر، حدث/موقع/عنصر غير معروف، مصدر أو مالك أو مسؤول أو سلطة مفقودة، حالة دورة أو علاقة غير صالحة، علاقة مكررة، اعتماد بلا دليل أو معتمد أو وقت، إسناد بلا منفذ أو إجراء، تاريخ يقفز أو يرجع، مراجعة مكررة أو غير متسلسلة، تحقق بلا أثر فعلي أو دليل موجود وموثق، إغلاق بلا متحقق أو معلومات إغلاق، أثر مشوه، خيار محدد غير موجود، قياس نتيجة غير مكتمل، أو سيناريو موجه إلى baseline.

يعيد تقرير الاستيراد رقم السجل أو الصف، معرف القرار إن وجد، code ثابتاً، path للحقل، رسالة عربية، وتصنيفاً مانعاً أو تحذيراً. لا يصل سجل مانع إلى حاسبة الأولوية.

المعاينة لا تكتب إلى baseline. القبول يعني **القبول للاختبار المحلي فقط** بعد زوال جميع الأخطاء المانعة.

## English summary

The template is event-agnostic. IDs and enum values remain English; user-facing descriptions remain Arabic. CSV structured cells contain valid JSON. History must cover every lifecycle stage in order. Evidence references must resolve to structured evidence, and verification references must point to evidence with `verified` status. Approval, verification, closure, and history remain local validation contracts only. Imported packs enter preview first, accepted records stay inside the validation workspace, and neither preview nor acceptance updates the operational baseline.
