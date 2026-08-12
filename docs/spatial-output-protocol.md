# بروتوكول المخرج المكاني

## العقد

`SpatialOutputCommand` يحمل schema/output type، `projectionVersion` و`projectionContentHash`، `commandId` و`commandContentHash` و`deliveryAttemptId`، output profile، mapping، state context، visual states، issue/expiry، sequence، وsource events.

كل `SpatialVisualState` يذكر entity/zone، visual state، color token، label، route IDs، highlight، spatial reference، وsource event IDs. لا يستنتج renderer معنى تشغيليًا من اللون أو ترتيب العناصر.

## المخرجات الحالية

- 2D plan preview: حدود وعناصر دقيقة للمقارنة.
- 3D preview: علاقة مكانية وتوجيه تكميلي.
- geospatial preview: نقطة أصل وشبكة محلية توضح عقد التحويل فقط.

المعاينات الثلاث تستخدم هوية محتوى الإسقاط نفسها، ولكل منها أمر مستقل مشتق من payload. retry يحافظ على `commandId` ويغير `deliveryAttemptId`. 2D و3D مكملان؛ لا أفضلية عامة لأحدهما. لا يوجد Cesium أو 3D Tiles أو geocoder أو map feed في Stage 3D.

## الإحداثيات المستقبلية

```text
Venue local frame (approved survey origin)
-> versioned model adapter (Three.js Y-up runtime)
-> Mayadeen exchange frame (right-handed meters, Z-up)
-> approved geographic transform (datum/CRS/version/error bounds)
```

لا يجوز إصدار geographic operational claim قبل source survey وCRS وtransform version وaccuracy evidence وauthority approval.

## فشل آمن

command منتهي أو projection/profile/content/lineage/context/mapping غير متطابق يعرض stale/out-of-sync ولا يُعامل live. Output acknowledgement لا يغير الحقيقة. راجع `projection-and-command-identity.md`.
