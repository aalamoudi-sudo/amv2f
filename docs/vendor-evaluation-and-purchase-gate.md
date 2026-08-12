# بوابة تقييم وشراء المورّد

## القرار الحالي

لا يوجد مورّد معتمد أو مطلوب في Stage 3D. كل التقنيات الخارجية تبقى Adapters قابلة للاستبدال.

## Gate إلزامي قبل أي purchase أو live pilot

| البند | دليل القبول المطلوب |
| --- | --- |
| API/webhook | وثيقة إصدار، auth، limits، examples واختبار sandbox |
| Raw export | تصدير كامل قابل للقراءة دون اشتراك دائم |
| Stable IDs | mapping إلى Mayadeen IDs واختبار عدم تغيرها |
| Data ownership | عقد يثبت ملكية Mayadeen وحق portability/deletion |
| Offline | queue/retry/conflict/recovery موثقة ومجربة |
| Schema evolution | versioning/deprecation/migration policy |
| Error semantics | structured errors، retryable vs terminal، idempotency |
| Security/residency | threat review، encryption، tenancy، region، incident process |
| Replaceability | secondary adapter أو tested exit path |
| Pricing scale | cost model للحجم والاحتفاظ والegress والدعم |
| Retention/exit | export validation، termination، deletion evidence |
| Conformance | Stage 3D harness + domain-specific acceptance cases |

## عملية القرار

1. تعريف المشكلة والمستخدم والقرار والنتيجة والبديل الأبسط.
2. build/buy/partner/delay comparison.
3. Ahmed approves a bounded experiment, budget, data class and exit criteria.
4. استخدم anonymized/synthetic sandbox أولًا.
5. adapter يمر conformance بلا تعديل core.
6. security/privacy/legal/operations/CTO reviews.
7. field test بsuccess/failure thresholds وrollback.
8. procurement approval مستقل؛ نجاح تقني لا يعني شراء.

## أسباب رفض فوري

لا raw export، proprietary identity only، direct write to baseline، undocumented retries، mandatory cloud with no exit، opaque retention، output feedback into truth، أو عدم قبول الاختبار الحتمي.

## التصرف المقترح حسب القدرة

- **Build:** canonical IDs/events/trust/projection/action/conformance.
- **Buy:** commodity hardware or mature source capability بعد gate.
- **Partner:** reality capture، specialized sensors، AV/calibration، field deployment.
- **Delay:** live feeds، CV، geospatial production، physical control حتى اكتمال الهوية/backend/field protocol.
