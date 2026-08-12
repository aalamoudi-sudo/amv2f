# حدود التحقق — Stage 3D

| القدرة | عامل الآن | محاكاة/محلي | يلزم للإنتاج | الادعاء الممنوع |
| --- | --- | --- | --- | --- |
| Capture envelope | typed + hash verification | source/device clocks محفوظة وغير موثوقة | secure transport + authoritative time policy | live ingestion |
| Event ledger | append/duplicate/replay؛ العقد بلا clear/delete | memory container disposable | durable database + concurrency | audit trail |
| Action gateway | atomic role/evidence/provenance/preconditions path | string actors | auth/authority directory | real approval/execution |
| Evidence | metadata/hash/status | local URI, no binary | immutable storage/custody | legal evidence |
| Provenance | entity/activity/agent graph لكل حدث | production identity/time مجهولان | trusted identity + source adapters + query store | W3C compliance |
| Trust | deterministic transitions | local rules | governed policy + authorities | verified truth |
| Readiness | requirement-derived | fixture requirements | approved requirement pack | verified readiness |
| Offline | queue/replay/conflict | one browser memory | durable device/server protocol | production sync |
| Spatial outputs | SHA-256 projection/command identity + deep synchronization | CSS previews | approved coordinates/renderers | geospatial operation |
| Physical output | command contract | preview only | Stage 6 approvals/calibration | physical control |

## Claim discipline

- واجهة Stage 3D: **مختبر محلي لسلامة تدفق البيانات التشغيلية**.
- المنتج العام: **واجهة عربية للقرار المكاني والتمرين التشغيلي**.
- لا live digital twin، AI، simulation، sensor/camera integration، formal standard certification، calibrated projection، أو operational truth.

## حدود الأمن والخصوصية

hash syntax/integrity وsensitivity/retention fields foundations فقط. لا authentication، authorization service، encryption at rest/in transit، secrets، data residency enforcement، incident response، أو deletion workflow.

## Backend replacement boundary

استبدل `OperationalEventRepository` وqueue/identity/evidence persistence خلف interfaces. لا تسمح لAPI DTO أو localStorage أو vendor schema بالتسرب إلى event/trust/projection domain.

reset في المختبر يستبدل repository محلية كاملة؛ لا توجد عملية حذف في العقد القانوني ولا يجوز تفسير reset بوصفه حذف history إنتاجية.

## قبل live use

approved operational ontology and IDs، real identity/authority، source/data agreements، immutable evidence، durable event store، concurrency/offline protocol، security/privacy/legal reviews، observability/recovery، field acceptance، runbook/support، وAhmed approval.
