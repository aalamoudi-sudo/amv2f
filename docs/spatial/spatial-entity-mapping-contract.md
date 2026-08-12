# Spatial Entity Mapping Contract

`SpatialEntityMapping` يربط كيانًا ثابتًا بمرجع هندسة صريح داخل مصدر محدد. يحمل:

`mappingId`, `projectId`, `eventId`, `venueId`, `entityId`, `sourceId`,
`sourceHash`, `geometryReference`, `layerReferences`, `mappingMethod`,
`mappingStatus`, `mappedBy`, `reviewedBy`, `approvedBy`, `revision`,
`changeReason`, `confidence`.

الحالات: `unmapped`, `suggested`, `candidate`, `reviewed`, `approved-working`,
`rejected`, `superseded`.

## قواعد الحماية

- Name/geometry automation ينتج `suggested` فقط.
- `approved-working` يحتاج reviewedBy وapprovedBy.
- GeometryReference نفسه لا يسند لكيانين متعارضين بصمت.
- mapping خارج project/event/venue النشط مرفوض.
- entityId يجب أن يكون في سجل المناطق الثابتة.
- التراجع ينشئ superseded revision ولا يعدل السجل السابق.
- CAD linework لا ينتج RouteDefinition أو route authority.

بعد وجود mapping في `reviewed` على الأقل، يبني Spatial Adapter lineage واحدة تحمل
sourceHash وmappingRevision وspatialProjectionVersion وtransformVersion، ثم تمرر
النسخة نفسها إلى Experience وExecutive و2D و3D وProjection Preview.
