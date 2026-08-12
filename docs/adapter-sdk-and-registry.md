# Adapter SDK والسجل

## العقد

`AdapterManifest 1.0.0` يعلن ID/type/version/schema versions/capabilities/direction/online/offline/batch/streaming/evidence/spatial/tasking/health/configuration/vendor metadata.

واجهات الإدخال: `system`, `sensor`, `reality-capture`, `human-action`, `workflow`, `asset-management`.
واجهات الإخراج: `spatial-2d`, `spatial-3d`, `geospatial`, `workflow`, `reporting`, `physical-output`.

core لا يحتوي اسم مورّد. أي implementation خارجي يجب أن يدعم configuration validation، capability discovery، health، normalization/ingestion أو delivery، acknowledgement، retry، error semantics، وconformance.

## المحاكيات المرجعية

المختبر يسجل عشرة manifests حتمية: work-order، schedule، sensor، reality-capture، governed human action، workflow result، و2D/3D/geospatial/physical output. كل واحد يمر الآن بمساره المناسب في harness، مع النتيجة الفردية في `adapter-conformance-matrix.md`. هي fixtures محلية وليست integrations.

## Conformance gate

يفحص `adapterConformance.ts`:

1. manifest وschema version.
2. deterministic normalization.
3. provenance ينتجه input adapter وتُحل علاقته دون fallback مختلق من المضيف.
4. duplicate/idempotent retry.
5. error and offline path.
6. entity/context/evidence integrity.
7. output acknowledgement.
8. عدم امتلاك output adapter قدرة ingest تمنحه feedback إلى baseline.

نجاح reference adapter يثبت صلاحية harness المحلية فقط، لا صلاحية منتج مورّد. شراء أو pilot مورّد يحتاج gate منفصلًا في `vendor-evaluation-and-purchase-gate.md`.

`IntegrationLabEngine` لا يعرف IDs خاصة بالـfixture؛ يستقبل event/venue/entities/labels/requirements/actions/evidence/provenance/adapters/mappings/profiles عبر `IntegrationLabConfiguration`. التهيئتان الافتراضية والبديلة تثبتان قابلية الحقن، لا تمثلان Stage 3E event-package engine.
