# Mission Context and Lenses

## MissionContext

`MissionContext` يجمع الهوية النشطة في عقد واحد:

```text
organizationId, projectId, eventId, venueId,
dayId, personaId, journeyId, momentId, stepId,
entityId, zoneId, routeId, sceneId, decisionId, scenarioId,
missionMode, missionLens, truthContext, projectionVersion
```

القيم القانونية للوضع هي `plan`, `rehearse`, `live`, `incident`, `learn`.
العدسات هي `experience`, `spatial`, `operations`, `decision`, `future`.

المصدر القانوني لليوم والشخصية والرحلة والخطوة والكيان والمشهد يظل
`ExperienceSelectionContext`. MissionContext يضيف الوضع والعدسة وحقيقة المصدر
ونسخة الإسقاط، ولا ينشئ مخزن حالة جديدًا. الرابط العميق وتاريخ المتصفح يعيدان
الاختيار الصالح فقط. أي عدم تطابق بين مشروع أو فعالية أو يوم أو شخصية أو كيان
يفشل بالعربية بلا demo fallback.

`routeId` يبقى `null` في حلقة KAP لأن V.11 لا ينشئ `SpatialRoute`.

## MissionGraphProjection

الإسقاط قراءة قابلة للاستبدال بمستودع Backend مستقبلي. يركب العقود الحالية:

```text
Project -> Event -> Day -> Persona -> Journey -> Moment
        -> Venue -> Zone -> Entity -> Requirement -> Observation
        -> Evidence -> Blocker -> Decision -> Action -> Impact
```

لا يضيف علاقة مفقودة ولا يرقّي مرشحًا. كل قيمة تحفظ تصنيفها: `reported`,
`observed`, `verified`, `approved`, `simulated`, `predicted`, أو `unknown`.
الإسقاط يعلن حدود الطفرات صراحة: لا تعديل baseline أو readiness، ولا تحقق دليل،
ولا اعتماد قرار أو مسار، ولا تحكم جهاز.

## العدسات الخمس

| العدسة | محرك القراءة الحالي | الحقيقة المحفوظة |
|---|---|---|
| التجربة | Experience Pack + V.11 narrative | تسلسل مرشح، لا SpatialRoute |
| المكان | Spatial truth + Scene Gateway + Web3D | proposed/medium، غير مسجل هندسيًا |
| التشغيل | Readiness + Evidence + reported IoT projection | KAP cannot-determine، لا مصدر حي |
| القرار | DecisionRecord projection | لا سجل مرتبط يعني لا قرار منشأ، ولا اعتماد تلقائي |
| المستقبل | Digital Rehearsal projection | بروفة مرشحة، لا محاكاة ولا توقع |

العدسة تغير طريقة القراءة فقط. `entityId`, `zoneId`, اليوم والشخصية والرحلة
واللحظة لا تتغير بسبب تبديل العدسة.

## الحقيقة والوقت

`truthContext` يحفظ المصدر والإصدار والوقت وسلطة المصدر والثقة والتصنيف
والتبعيات. غياب timestamp موثوق يظهر `not-recorded` بدل اختراع وقت. موافقة
المؤسس على استخدام مصدر التصميم لا تعني تسجيلًا هندسيًا أو قبول عميل أو جاهزية.

## MissionAdvisor

الواجهة المستقبلية تحصر الإمكانات في `explain`, `compare`, `simulate`,
`draftRecommendation`. أي تنفيذ مستقبلي يجب أن يكشف المصادر والافتراضات والثقة
والبدائل والأثر والسلطة البشرية. العقد يمنع الاعتماد والتحقق وتغيير الجاهزية
والخط الأساسي والتحكم بالأجهزة وقرار الافتتاح. لا يوجد Provider أو Model في RC1.
