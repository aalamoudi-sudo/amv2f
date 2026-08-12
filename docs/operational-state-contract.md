# عقد الحالة التشغيلية

## النطاق الحالي

هذا العقد هو تعريف TypeScript لحزمة جاهزية المناطق في Stage 3A. يصف ما يلزم لتقييم محلي شفاف، ولا ينشئ Backend أو نظام تدقيق أو اعتماداً متعدد المستخدمين.

المسار الحالي هو:

`بيانات تجريبية مؤقتة → حالة أساسية محلية → طبقة سيناريو محلية`

ولا يجوز تقديم أي طبقة على أنها حقيقة تشغيلية حية.

## الحقول الحرجة الآن

`zoneId`, `stateContext`, `source`, `sourceType`, `updatedAt`, `updatedBy`, `owner`, `responsibleParty`, `readiness`, `confidence`, `approvalStatus`, `evidence`, `revision`, `changeReason`, `targetReadinessDate`, `blockers`, `dependencies`, `requiredAction`, `escalationLevel`, `dueAt`, `operationalImpact`, `relatedRouteIds`, and `openingImpact` are required for this local validation pack. An approved record additionally requires `approvedBy` and `approvedAt`.

## الحقول المؤجلة

Revision history as an immutable server record, user identity, permissions, durable approvals, audit events, conflict resolution, evidence storage, and source adapters are later contracts. They must not be implied by the current local UI.

## تعريفات القرار

- **Readiness**: تقدير نسبة اكتمال متطلبات المنطقة في السجل.
- **Confidence**: ثقة الفريق في دقة السجل ومصدره.
- **Owner**: المالك accountable لصحة الحالة.
- **Responsible party**: المنفذ responsible للإجراء.
- **Evidence**: مرجع منظم يمكن فحصه، لا وصف تجميلي.
- **Approval**: حالة محلية مطلوبة لتقليل الالتباس، وليست توقيعاً إنتاجياً.
- **Operational impact**: أثر موصوف على الافتتاح والمسارات والسلامة والمناطق التابعة.

## عزل الحالة

تبدأ بيانات العرض في `temporary-demo`. التعديلات المحلية تحفظ في `baseline` وتزيد `revision`. بدء سيناريو ينسخ الأساس إلى `scenario`، ويعاد الأساس عند الإيقاف أو إعادة الضبط. لا يجوز لخطوات السيناريو تعديل `baselineZoneReadiness`.

## قواعد لا يجوز تجاوزها

1. لا claim تشغيلي دون `source` وتصنيف حالة.
2. لا claim جاهزية دون `owner` و`evidence`.
3. لا claim مسار معتمد دون هندسة ومصدر وسلطة وإصدار واعتماد مكتملة.
4. لا يسمى التسلسل المبرمج simulation.
5. لا يسمى preset بصري معايرة مادية.
