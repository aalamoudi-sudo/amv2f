# Four-Day Digital Rehearsal

Arabic label: `بروفة رقمية لمسار تجربة الزائر`

Permanent disclosure:

> تسلسل مرشح للمراجعة، وليس محاكاة تشغيلية حية

## Controller

`reduceDigitalRehearsal` is a deterministic reducer over a candidate journey.
It supports play, pause, resume, previous, next, jump, restart, journey/day and
persona selection, day comparison, lens change through selection, and exit by
leaving the workspace.

No authoritative clock is used. Playback advances the authored sequence at a
local presentation interval only.

## Synchronized Projection

Changing the step updates the same selection context used by:

- timeline;
- related candidate marker;
- zone and experience-area references;
- candidate scene reference;
- Experience Intent;
- read-only readiness, decision, evidence, and source projection;
- URL deep link.

Manual interaction pauses playback. Browser history and refresh restore only
valid state for the active project and event.

## Prohibited Effects

The rehearsal cannot:

- write an assessment or readiness state;
- approve or close a decision;
- create, verify, or approve evidence;
- assign an owner or authority;
- create geometry, a physical route, capacity, or safety claim;
- claim live time, crowd behavior, prediction, or simulation;
- mutate a baseline or activate an ExperiencePack.

## Four-Day Candidate

| Day | Date | Primary persona | Source attendance |
| --- | --- | --- | --- |
| ما قبل التدشين | 2026-10-31 | الموظفون وعائلاتهم | أكثر من 350، وليس سعة |
| التدشين الملكي | 2026-11-01 | الراعي الملكي وكبار الضيوف | غير محدد |
| زيارة أمير منطقة الرياض | 2026-11-02 | القيادات الإقليمية | 100، 18:00–21:00 |
| المؤتمر الصحفي | 2026-11-03 | الإعلام وصنّاع المحتوى | 200، 17:00–21:00 |

Day 2 preserves Qasr Al-Awja and King Abdullah Gardens as two site candidates.
It does not add a second approved Venue. Main-show, projection, drones, and
fireworks remain spatially unresolved.
