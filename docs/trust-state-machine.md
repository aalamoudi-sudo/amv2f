# آلة حالة الثقة

## الحالات

`reported -> corroborated -> verified -> approved` مع مخارج `rejected` و`superseded` تحفظ التاريخ.

| الحالة | المعنى | شرط الحد الأدنى | تغير verified projection؟ |
| --- | --- | --- | --- |
| reported | مصدر معروف أرسل observation | source + valid contract | لا |
| corroborated | مصدر مستقل يدعم الادعاء | supporting source مختلف | لا |
| verified | قاعدة تحقق أو verifier مخول + evidence verified | verifier/evidence/independence | نعم حسب policy |
| approved | authority معتمدة بعد verification | authority + prior verified | نعم |
| rejected | الادعاء مرفوض لكنه محفوظ | سبب رفض | لا |
| superseded | ادعاء أحدث موثوق استبدله | trusted correction relation | لا كقيمة حالية |

`sourceConfidence` يصف جودة المصدر ولا يحل محل assertion state. readiness/evidence completeness/approval coverage كذلك مقاييس مستقلة.

## فصل الأدوار

عندما تتطلب القاعدة الاستقلال، لا يجوز للشخص نفسه أن يكون executor وverifier، ولا للapprover أن يساوي executor أو verifier. Stage 3D يختبر IDs نصية فقط؛ التنفيذ الحقيقي يحتاج identity وauthority directory وpolicy backend.

## فشل آمن

- missing evidence/authority -> rejected أو requires review.
- unverified correction -> يبقى في ledger ولا يسقط verified state.
- rejected/superseded -> لا حذف.
- transition غير مسموح -> رسالة عربية وقاعدة فاشلة.

هذه rules حتمية وليست AI.
