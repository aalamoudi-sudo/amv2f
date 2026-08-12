# KAP Zone Mapping Review

## الحالة الحالية

| المنطقة | الحالة | GeometryReference | طبقات | الثقة |
| --- | --- | --- | --- | --- |
| `ZONE-ARRIVAL-001` | `unmapped` | null | 0 | unknown |
| `ZONE-AGES-TUNNEL-001` | `unmapped` | null | 0 | unknown |
| `ZONE-SHOW-001` | `unmapped` | null | 0 | unknown |
| `ZONE-PHOTO-MEDIA-001` | `unmapped` | null | 0 | unknown |
| `ZONE-DINNER-VIP-001` | `unmapped` | null | 0 | unknown |

لم تُنشأ مواءمة suggested أو candidate لأن الملف لم يتحول محليًا. أسماء المناطق
مأخوذة من الحزمة المرشحة ولا تثبت حدودًا أو مواقع داخل CAD.

## سير المراجعة عند وصول التحويل

1. تحقق lineage وبصمة المشتق والأداة والإصدار.
2. اعرض الطبقات والهندسة المنقحة في Canvas.
3. اختر geometry فعلية ثم entityId قائمًا.
4. سجل actor وسبب المواءمة.
5. اعرض conflicts قبل حفظ candidate revision.
6. راجع before/after ثم ارفعها إلى reviewed بصورة صريحة.
7. لا تنشئ approved-working دون معتمد mapping مستقل.

لا توجد route geometry أو capacities أو heights أو safety geometry في هذه
المراجعة.
