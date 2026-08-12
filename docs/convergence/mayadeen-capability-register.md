# سجل قدرات Mayadeen — Mission Canvas RC1

## الغرض

هذا السجل هو الإسقاط البشري للملف القانوني
`mayadeen-capability-register.json`. يمنع اختفاء قدرة من خارطة المنتج لمجرد أنها
غير ظاهرة في عرض العميل، ويفصل بين ما يعمل الآن وما ينتظر بيانات أو اعتمادًا أو
مرحلة مستقبلية.

## قاعدة القراءة

| الحالة | معناها |
|---|---|
| `integrated` | تعمل داخل المسار الموحد وبنفس هوية المشروع والحقيقة. |
| `built-but-disconnected` | عقد أو تنفيذ موجود، لكنه غير موصول بمصدر KAP حقيقي أو خدمة تشغيلية. |
| `experimental` | مختبر معزول لا يملك حقيقة تشغيلية. |
| `blocked-by-data` | واجهة الربط جاهزة لكن الأصل أو البيانات المؤهلة غير موجودة. |
| `planned` | قدرة محفوظة في الخريطة وليست منفذة أو مفعلة. |
| `superseded-with-history-preserved` | استبدلها مسار أحدث مع بقاء تاريخها. |

لا تعني `integrated` اعتمادًا تشغيليًا. هي تصف تكامل القدرة البرمجية فقط.

## التجارب الثلاث

| التجربة | القيمة | الحقيقة المعروضة افتراضيًا |
|---|---|---|
| عرض العميل | الأيام، الشخصيات، خريطة التجربة، الرحلة، Web3D | شارة حقيقة موجزة؛ التفاصيل عند الطلب |
| مركز التشغيل | الجاهزية، القرارات، الملاك، الأدلة، المسارات والرصد المبلغ | الإسقاطات القانونية لكل مجال |
| المختبر التقني | الاستلام، التأليف، CAD، المحولات، البصمات والمخططات | التفاصيل التقنية والقيود الكاملة |

تستهلك التجارب الثلاث الهويات نفسها: المشروع والفعالية والموقع والكيان والمنطقة
والمشهد. لا توجد نسخة «مجمّلة» مستقلة من حقيقة KAP.

## إسقاط Mission Control

| السياق | المحرك | العدسة | عمق العرض | البيانات | الحالة | المحول المستقبلي |
|---|---|---|---|---|---|---|
| المشروع والفعالية | Portfolio + Event Runtime | جميع العدسات | الجميع | Project/Event packages | integrated | Backend runtime repository |
| اليوم والشخصية والرحلة | Experience Twin + V.11 | التجربة | العميل والقيادة | ExperiencePack + candidate journey | integrated | Operational source repository |
| المنطقة والكيان والمشهد | Spatial truth + Scene Gateway | المكان | الجميع | candidate anchors + verified derivative | integrated | Registered spatial/Web3D adapter |
| المتطلبات والدليل والرصد | Readiness + Evidence + IoT projection | التشغيل | القيادة والمختبر | legal domain projections | integrated / disconnected source | Trusted production stores |
| المشكلة والسلطة والأثر | Decision Engine | القرار | القيادة والمختبر | DecisionRecord | integrated | Durable decision repository |
| البروفة والافتراضات | Digital Rehearsal | المستقبل | العميل والقيادة | frozen rehearsal plan | integrated | Approved simulation adapter |
| المصدر والإصدار | Provenance + trust boundaries | جميع العدسات | الحقيقة والمختبر | trace/evidence registries | integrated | Trusted identity, time and custody |
| الإخراج المادي | Tangible Command Surface | المستقبل | القيادة والمختبر | same projectionVersion | built-but-disconnected | Projection Gateway / Stage 6 |
| التفسير والمقارنة | MissionAdvisor contract | جميع العدسات | غير مفعّل | لا مزود أو نموذج | planned | Replaceable governed AI adapter |

كل القدرات الحالية في JSON مرتبطة بأحد هذه السياقات أو المحركات. تبقى Cesium
وOpenUSD/Omniverse وAnyLogic وDeepStream/Metropolis وCisco Spaces/BLE/UWB
وTemporal/Camunda وvisionOS/AR وعتاد الإسقاط مسجلة كمحولات مستقبلية معطلة؛ لم
يُثبت أي SDK منها.

## ملخص القدرات

| القدرة | الحالة | مدخل التشغيل الحالي | الخطوة التالية |
|---|---|---|---|
| محفظة المشاريع | integrated | `workspace=portfolio` | إبقاء التجارب الثلاث ضمن المشروع نفسه |
| عزل المشروع | integrated | AppShell route | رفض كل سياق أجنبي بلا fallback |
| حزم الفعاليات | integrated | `workspace=configuration` | مستودع إنتاجي موثوق مستقبلًا |
| محرك القرار | integrated | `workspace=decisions` | هوية ووقت وموافقة إنتاجية |
| ذكاء الجاهزية | integrated | `workspace=readiness` | متطلبات وسلطات وأدلة KAP الحقيقية |
| الأدلة والمصدر | integrated | Integration/Readiness | مخزن أدلة موثوق |
| الالتقاط التشغيلي | integrated | `workspace=integration` | مصادر مصرح بها فقط |
| بوابة IoT | built-but-disconnected | `workspace=iot` + local gateway | نشر ومصدر منفصلان |
| استلام CAD والمكان | integrated | `workspace=spatial-authoring` | نقاط ضبط وسلطة هندسية |
| القيادة المكانية | integrated | `workspace=spatial-command` | هندسة مسجلة عبر محول |
| خريطة التجربة | integrated | `experienceMode=story` | عدم تحويل السرد إلى Route |
| الخريطة التنفيذية | integrated | Spatial executive mode | قرارات مؤهلة مستقبلًا |
| رحلة الزائر | integrated | `experienceMode=journey` | مصدر مسار وسلطة عند الحاجة |
| الأيام الأربعة | integrated | `workspace=experience-twin` | استكمال المدخلات حسب اليوم |
| الشخصيات واللحظات | integrated | selectors | مصالحة ملفات التشغيل |
| V.02/V.11 | integrated | route context | مراجعة أحمد والسلطات |
| Web3D | integrated | `mapMode=web3d` | تصدير استوديو وتسجيل هندسي |
| 360 | blocked-by-data | scene panorama slot | بانوراما KAP حقيقية 2:1 |
| عرض العميل | integrated | `golden=entry|map|scene` | بوابة أحمد المرئية |
| مركز التشغيل | integrated | command/readiness/decisions | تحسين التنقل فقط بعد البوابة |
| المختبرات التقنية | integrated | technical workspaces | إبقاؤها خارج العرض الافتراضي |
| مسرع التسليم | integrated | `experienceMode=delivery` | تمرير كل حزمة جديدة عبره |
| البروفة الرقمية | integrated | `workspace=experience-rehearsal` | مراجعة مرشح V.11 أولًا |
| جذر ثقة الجاهزية | integrated | readiness legal gateway | هوية ووقت ومستودع إنتاجي |
| بوابة المحولات | built-but-disconnected | adapter contracts | مصدر ومحول معتمدان |
| Cesium | planned | لا يوجد SDK | تأجيل حتى بيانات مسجلة وموافقة |
| المحاكاة | planned | لا يوجد؛ Stage 4 لم يبدأ | بدء رسمي مستقل فقط |
| AI | planned | لا يوجد | بيانات وحوكمة وقرار R&D |
| الفيزيائي والإسقاط | built-but-disconnected | معيار وعقود فقط | ملف نشر ومعايرة واعتماد Stage 6 |
| الرحلة الذهبية | integrated | entry → map → scene | مراجعة أحمد ثم التوسعة |
| MissionContext | integrated | `mission=canvas` | Backend read session مستقبلًا |
| MissionGraphProjection | integrated | read-only composition | Repository إسقاط قابل للاستبدال |
| MissionCanvas | integrated | العدسات الخمس | مراجعة أحمد للاتجاه والمنتج |
| Tangible Command Surface | built-but-disconnected | `missionView=tangible` | ملف نشر ومعايرة وبوابة Stage 6 |
| MissionAdvisor | planned | Interface فقط | موافقة R&D وحوكمة ومزود قابل للاستبدال |

## حدود KAP الحالية

- V.11 حزمة `received-validated-working-candidate` وليست `SpatialRoute`.
- V.02 محفوظ تاريخيًا ولا يستبدله رقم V.11 تلقائيًا.
- 1 نوفمبر ظاهر، والرحلة التشغيلية ورحلة الزائر والمسار والانتقال المشترك فيه
  `not-applicable`.
- مشتق Web3D حقيقي ومتحقق البصمة، لكنه نية تصميم غير مسجلة هندسيًا، ليس as-built
  وليس 360 وليس دليل جاهزية.
- علاقة المشهد بـ`ENTITY-KAP-OP-006` و`ZONE-AGES-TUNNEL-001` تبقى
  `proposed / medium`.
- العدسات الخمس تحافظ على الكيان نفسه ولا تمنحه سلطة جديدة.
- لا يوجد مصدر حي أو محرك محاكاة أو جهاز مادي متصل.
- جاهزية KAP تبقى `cannot-determine`.
- Stage 4 لم يبدأ.

تفاصيل المصدر والاعتماد والتبعيات لكل قدرة موجودة في ملف JSON المجاور.
