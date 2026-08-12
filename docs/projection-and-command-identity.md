# هوية الإسقاط وأوامر الإخراج

## هوية الإسقاط

يبني `canonicalProjectionContent` تمثيلاً حتمياً يشمل:

- schema version و`stateContext`.
- `projectionConfigurationVersion` و`spatialMappingVersion`.
- source-event lineage المرتب: event ID، revision، payload hash، وبصمة محتوى الحدث.
- rejected وsuperseded IDs المؤثرة.
- الحالات الكاملة للعناصر: disposition، assertion، label، readiness، contributing events، واللون الدلالي.
- الحالات القانونية لمتطلبات الجاهزية.

تُرتب الأحداث والمتطلبات والمعرّفات قبل serialization عبر `stableSerialize`، ثم تُحسب SHA-256. الناتج:

```text
projectionContentHash = SHA-256(canonical projection content)
projectionVersion = PROJECTION-v1-<projectionContentHash>
```

`generatedAt` ووقت العرض غير داخلين في الهوية الدلالية. تغييرهما وحده لا يغير البصمة. تغيير حدث سابق، label، requirement، readiness، assertion، disposition، التهيئة، الربط، أو السياق يغيرها.

## هوية الأمر

لكل 2D و3D وgeospatial وphysical command:

```text
commandContentHash = SHA-256(canonical command payload without identity fields)
commandId = COMMAND-<OUTPUT>-v1-<commandContentHash>
deliveryAttemptId = DELIVERY-<command identity>-<attempt>
```

تتضمن الحمولة `projectionVersion` و`projectionContentHash` و`outputProfileVersion` وmapping وcontext وsequence وlineage والحالات المرئية. لذلك يغير ملف إخراج أو محتوى أمر مختلف هويته. retry يحتفظ بـ`commandId` ويستعمل محاولة تسليم مختلفة.

## تحقق التزامن

لا يكفي تطابق النص `projectionVersion`. يعيد المدقق حساب بصمة الإسقاط وبصمة كل أمر، ثم يقارن context، profile، mapping، lineage، عدد العناصر، كل حالة عنصر، IDs المعروفة، وحالة المخرج المادي. أي تعديل في payload مع إبقاء النص القديم يفشل.

هذه الهوية تكشف اختلاف المحتوى محلياً؛ لا تثبت توقيعاً رقمياً أو مصدرًا موثوقاً أو تسليماً حياً.
