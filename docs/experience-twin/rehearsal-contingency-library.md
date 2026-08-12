# Rehearsal Contingency Library

EX.1D defines fourteen reusable, reversible, hypothetical rehearsal
contingencies. They are configuration data and do not invoke an operational or
emergency procedure.

| Category | Arabic intent | Operational effect |
| --- | --- | --- |
| delayed-arrival | تأخر الوصول | None; rehearsal branch only |
| program-overrun | تجاوز البرنامج للمدة | None; timing remains candidate |
| touchpoint-unavailable | نقطة تجربة غير متاحة | None; no readiness mutation |
| scene-content-unavailable | مشهد أو محتوى غير متاح | Honest missing-source state |
| outdoor-show-unavailable | العرض الخارجي غير متاح | No safety recommendation |
| weather-constraint | قيد طقس افتراضي | Hypothetical only; no live weather |
| transport-delay | تأخر النقل | No route or duration invented |
| vip-route-change | تغيير مسار كبار الشخصيات | No route is generated |
| media-moment-delay | تأخر اللحظة الإعلامية | Rehearsal ordering only |
| catering-delay | تأخر الضيافة | Rehearsal branch only |
| accessibility-support-failure | تعذر دعم الإتاحة | Records a concern; no field claim |
| missing-owner | مالك تشغيلي مفقود | Stays missing |
| missing-approval | اعتماد مفقود | Stays unapproved |
| missing-evidence | دليل مفقود | Stays unverified |

Each record declares trigger, truth class, affected moments, personas and
sites, candidate alternative, required decision authority, required evidence,
expected impact, source traces, and return condition. Activation creates a
`RehearsalBranch`; return closes only that branch. Neither action changes the
primary plan or a governed source record.

Every operator surface labels these records:

> سيناريو افتراضي للاختبار

When required authority, evidence, or approved response is absent, the library
does not manufacture one. The safe action is to record the gap and request a
governed decision.
