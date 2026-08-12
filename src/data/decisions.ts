import type { DecisionOption, DecisionRecord, LegacyDecisionRecordInput } from '../types/decision';
import type { EvidenceReference, ImpactLevel, SpatialEntityId } from '../types/spatial';
import { migrateLegacyDecisionRecord } from '../services/decisionRelationshipMigration';

const demoEventId = 'EVENT-DEMO-001' as const;
const demoVenueId = 'VENUE-DEMO-001' as const;

function entityIds(...ids: SpatialEntityId[]): SpatialEntityId[] {
  return ids;
}

function evidence(id: string, titleAr: string, status: EvidenceReference['status'] = 'pending'): EvidenceReference {
  return {
    id,
    type: 'exercise',
    titleAr,
    source: 'حزمة قرارات تجريبية مؤقتة',
    capturedAt: '2026-07-10T10:00:00Z',
    status
  };
}

function impact(level: ImpactLevel, summaryAr: string, dimensions: Partial<Record<'operational' | 'safety' | 'visitor' | 'schedule' | 'dependency' | 'resource', ImpactLevel>>) {
  return { level, summaryAr, dimensions };
}

function option(optionId: string, titleAr: string, descriptionAr: string, expectedImpact: string, risks: string[]): DecisionOption {
  return { optionId, titleAr, descriptionAr, expectedImpact, risks };
}

function history(
  ...entries: Array<[DecisionRecord['status'], string, string, string?]>
): DecisionRecord['changeHistory'] {
  return entries.map(([status, changedAt, changeReason, changedBy], index) => ({
    revision: index + 1,
    status,
    changedAt,
    changedBy: changedBy ?? 'منسق القرارات التجريبي',
    changeReason
  }));
}

const legacyDemoDecisions: LegacyDecisionRecordInput[] = [
  {
    decisionId: 'DECISION-001',
    title: 'تثبيت جاهزية المنطقة ذات الأثر الأعلى',
    description: 'قرار تشغيلي تجريبي لتحديد الإجراء الذي يحمي الافتتاح ومسار الزوار.',
    eventId: demoEventId,
    venueId: demoVenueId,
    relatedEntityIds: entityIds('ZONE-005', 'ROUTE-001', 'ROUTE-003'),
    stateContext: 'temporary-demo',
    source: 'ملخص الجاهزية التجريبي',
    sourceType: 'temporary-demo',
    createdAt: '2026-07-10T09:00:00Z',
    createdBy: 'منسق القرارات التجريبي',
    decisionOwner: 'قائد التشغيل التجريبي',
    responsibleParty: 'مشرف ممر الخدمات',
    approvingAuthority: 'جهة اعتماد التشغيل',
    problemStatement: 'تأخر منطقة ذات أثر مباشر على افتتاح التشغيل ومسار الزوار.',
    decisionType: 'readiness',
    urgency: 'high',
    priority: 0,
    confidence: 'medium',
    evidence: [evidence('DECISION-EVIDENCE-001', 'ملخص حالة ممر الخدمات')],
    assumptions: ['تظل هندسة المسار التجريبي كما هي حتى تصل مراجعة معتمدة.'],
    constraints: ['لا يوجد اعتماد رسمي للمسار في هذه المرحلة.'],
    availableOptions: [
      option('OPTION-001-A', 'إزالة العائق أولاً', 'توجيه الفريق إلى إغلاق العائق قبل تثبيت القرار.', 'خفض أثر التأخير على الافتتاح.', ['يتطلب توفر الفريق في الموعد.']),
      option('OPTION-001-B', 'فتح مشروط', 'فتح محدود مع إبقاء مسار الزوار تحت المراجعة.', 'استمرار جزئي للخدمة.', ['قد يزيد ضغط المتابعة.']),
      option('OPTION-001-C', 'تأجيل الفتح', 'تأجيل القرار حتى اكتمال الدليل والاعتماد.', 'تقليل مخاطرة القرار غير المكتمل.', ['أثر مباشر على الجدول.'])
    ],
    selectedOption: null,
    rejectedOptions: [],
    approvalStatus: 'under-review',
    approvedBy: null,
    approvedAt: null,
    approvalComments: '',
    actionRequired: 'مراجعة الخيارات وتعيين الإجراء قبل موعد التشغيل.',
    assignedTo: null,
    dueAt: '2026-07-12T12:00:00Z',
    escalationLevel: 'elevated',
    status: 'review',
    expectedImpact: impact('high', 'قد يؤثر عدم القرار على الافتتاح ومسار الزوار.', { operational: 'high', visitor: 'high', schedule: 'high', dependency: 'high' }),
    actualImpact: null,
    outcomeStatus: 'not-started',
    lessonsLearned: '',
    revision: 2,
    changeReason: 'رفع القرار التجريبي للمراجعة.',
    changeHistory: history(
      ['draft', '2026-07-10T09:00:00Z', 'إنشاء مسودة القرار التجريبية.'],
      ['review', '2026-07-10T10:00:00Z', 'رفع القرار التجريبي للمراجعة.']
    )
  },
  {
    decisionId: 'DECISION-002',
    title: 'تأكيد مسار الاستجابة قبل الفتح',
    description: 'قرار تمرين محلي لمراجعة أثر السلامة قبل تشغيل المسار المرتبط.',
    eventId: demoEventId,
    venueId: demoVenueId,
    relatedEntityIds: entityIds('ZONE-006', 'ROUTE-002', 'GATE-003'),
    stateContext: 'temporary-demo',
    source: 'مراجعة السلامة التجريبية',
    sourceType: 'exercise',
    createdAt: '2026-07-10T11:00:00Z',
    createdBy: 'مسؤول السلامة التجريبي',
    decisionOwner: 'قائد السلامة التجريبي',
    responsibleParty: 'مسؤول HSE التجريبي',
    approvingAuthority: 'جهة اعتماد السلامة',
    problemStatement: 'يوجد عائق سلامة يحتاج قرار سلطة مختصة قبل فتح المنطقة أو المسار.',
    decisionType: 'safety',
    urgency: 'critical',
    priority: 0,
    confidence: 'medium',
    evidence: [evidence('DECISION-EVIDENCE-002', 'مخطط مراجعة السلامة')],
    assumptions: ['المخطط المستخدم للتمرين ليس اعتماداً رسمياً.'],
    constraints: ['لا يمكن اعتبار المسار آمناً أو معتمداً من هذه الشاشة.'],
    availableOptions: [
      option('OPTION-002-A', 'إيقاف الفتح', 'إبقاء المنطقة مغلقة حتى اعتماد HSE.', 'خفض أثر خطر السلامة.', ['قد يؤثر على الجدول.']),
      option('OPTION-002-B', 'تغيير التوجيه', 'استخدام مسار بديل بعد اعتماده.', 'تقليل الاعتماد على المسار الحالي.', ['يتطلب هندسة وموافقة بديلة.'])
    ],
    selectedOption: null,
    rejectedOptions: [],
    approvalStatus: 'under-review',
    approvedBy: null,
    approvedAt: null,
    approvalComments: '',
    actionRequired: 'إحالة القرار إلى جهة اعتماد السلامة وتوثيق النتيجة.',
    assignedTo: 'مسؤول HSE التجريبي',
    dueAt: '2026-07-11T13:00:00Z',
    escalationLevel: 'urgent',
    status: 'review',
    expectedImpact: impact('high', 'قرار السلامة يؤثر على فتح المنطقة ومسار الاستجابة.', { safety: 'high', operational: 'high', schedule: 'medium' }),
    actualImpact: null,
    outcomeStatus: 'not-started',
    lessonsLearned: '',
    revision: 2,
    changeReason: 'رفع قرار تمرين السلامة للمراجعة.',
    changeHistory: history(
      ['draft', '2026-07-10T11:00:00Z', 'إنشاء مسودة قرار تمرين السلامة.', 'مسؤول السلامة التجريبي'],
      ['review', '2026-07-10T11:30:00Z', 'رفع قرار تمرين السلامة للمراجعة.', 'مسؤول السلامة التجريبي']
    )
  },
  {
    decisionId: 'DECISION-003',
    title: 'إعادة توزيع نقطة التوجيه',
    description: 'قرار تجريبي لمقارنة خيارات تحسين تجربة الزائر عند نقطة التوجيه.',
    eventId: demoEventId,
    venueId: demoVenueId,
    relatedEntityIds: entityIds('ZONE-002', 'ROUTE-001'),
    stateContext: 'temporary-demo',
    source: 'مصدر غير مكتمل في بيانات العرض',
    sourceType: 'manual-update',
    createdAt: '2026-07-10T12:00:00Z',
    createdBy: 'مستخدم العرض المحلي',
    decisionOwner: 'مالك تجربة الزائر التجريبي',
    responsibleParty: 'مشرف التوجيه التجريبي',
    approvingAuthority: 'قائد تجربة الزائر',
    problemStatement: 'تحتاج نقطة التوجيه إلى خيار واضح قبل زيادة الحركة.',
    decisionType: 'visitor-experience',
    urgency: 'medium',
    priority: 0,
    confidence: 'low',
    evidence: [],
    assumptions: ['لا توجد قراءة ميدانية مرفقة بهذا القرار.'],
    constraints: ['الخيارات وصفية ولا تمثل تجربة تشغيلية.'],
    availableOptions: [
      option('OPTION-003-A', 'توسيع نقطة التوجيه', 'تخصيص مساحة أكبر للتوجيه.', 'تحسين وضوح المسار.', ['قد يحتاج موارد إضافية.']),
      option('OPTION-003-B', 'إضافة فريق توجيه', 'تعيين مسؤول إضافي في الموقع.', 'استجابة أسرع للاستفسارات.', ['لا يوجد تعيين فعلي حالياً.'])
    ],
    selectedOption: null,
    rejectedOptions: [],
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    approvalComments: '',
    actionRequired: 'استكمال المصدر والدليل قبل رفع القرار للمراجعة.',
    assignedTo: null,
    dueAt: '2026-07-14T10:00:00Z',
    escalationLevel: 'watch',
    status: 'draft',
    expectedImpact: impact('medium', 'قد يتحسن وضوح مسار الزائر إذا اكتمل الدليل.', { visitor: 'medium', operational: 'low' }),
    actualImpact: null,
    outcomeStatus: 'not-measured',
    lessonsLearned: '',
    revision: 1,
    changeReason: 'إنشاء مسودة قرار تجربة الزائر.',
    changeHistory: history(['draft', '2026-07-10T12:00:00Z', 'إنشاء مسودة قرار تجربة الزائر.', 'مستخدم العرض المحلي'])
  },
  {
    decisionId: 'DECISION-004',
    title: 'تثبيت نقطة الدعم التابعة',
    description: 'قرار تشغيلي تجريبي يتابع اعتماد نقطة الدعم على إغلاق ممر الخدمات.',
    eventId: demoEventId,
    venueId: demoVenueId,
    relatedEntityIds: entityIds('ZONE-007', 'ZONE-005', 'ROUTE-003'),
    stateContext: 'temporary-demo',
    source: 'سجل الخدمات الطبية التجريبي',
    sourceType: 'temporary-demo',
    createdAt: '2026-07-10T15:30:00Z',
    createdBy: 'منسق القرارات التجريبي',
    decisionOwner: 'قائد الخدمات التجريبي',
    responsibleParty: 'مشرف نقطة الدعم الطبي',
    approvingAuthority: 'قائد التشغيل التجريبي',
    problemStatement: 'تتأثر نقطة الدعم بإغلاق عائق منطقة أخرى.',
    decisionType: 'logistics',
    urgency: 'medium',
    priority: 0,
    confidence: 'high',
    evidence: [evidence('DECISION-EVIDENCE-004', 'قائمة تجهيز نقطة الدعم', 'verified')],
    assumptions: ['اعتماد المنطقة التابعة على المنطقة upstream كما هو موصوف في بيانات العرض.'],
    constraints: ['المسار التجريبي غير معتمد.'],
    availableOptions: [option('OPTION-004-A', 'الانتظار المنسق', 'إبقاء الإجراء معلقاً حتى إغلاق العائق upstream.', 'منع تنفيذ منفصل غير متسق.', ['قد يؤخر نقطة الدعم.'])],
    selectedOption: 'OPTION-004-A',
    rejectedOptions: [],
    approvalStatus: 'approved',
    approvedBy: 'مراجع التشغيل التجريبي',
    approvedAt: '2026-07-10T17:00:00Z',
    approvalComments: 'اعتماد محلي لبيانات العرض فقط.',
    actionRequired: 'متابعة إغلاق المنطقة upstream ثم إعادة التحقق.',
    assignedTo: 'مشرف نقطة الدعم الطبي',
    dueAt: '2026-07-12T18:00:00Z',
    escalationLevel: 'elevated',
    status: 'assigned',
    expectedImpact: impact('medium', 'يحمي الاعتماد بين المنطقة التابعة وممر الخدمات.', { dependency: 'high', operational: 'medium', safety: 'medium' }),
    actualImpact: null,
    outcomeStatus: 'pending',
    lessonsLearned: '',
    revision: 4,
    changeReason: 'إسناد تنفيذ خيار الانتظار المنسق.',
    changeHistory: history(
      ['draft', '2026-07-10T15:30:00Z', 'إنشاء مسودة القرار.'],
      ['review', '2026-07-10T16:00:00Z', 'رفع القرار للمراجعة.'],
      ['approved', '2026-07-10T17:00:00Z', 'اعتماد خيار الانتظار المنسق.', 'مراجع التشغيل التجريبي'],
      ['assigned', '2026-07-10T17:15:00Z', 'إسناد تنفيذ خيار الانتظار المنسق.', 'مراجع التشغيل التجريبي']
    )
  },
  {
    decisionId: 'DECISION-005',
    title: 'إغلاق ملاحظة جودة التوجيه',
    description: 'قرار تجريبي مغلق يوضح دورة التحقق وقياس الأثر بعد التنفيذ.',
    eventId: demoEventId,
    venueId: demoVenueId,
    relatedEntityIds: entityIds('ZONE-004'),
    stateContext: 'temporary-demo',
    source: 'قائمة جودة تجريبية',
    sourceType: 'approved-plan',
    createdAt: '2026-07-08T09:00:00Z',
    createdBy: 'قائد الجودة التجريبي',
    decisionOwner: 'قائد الجودة التجريبي',
    responsibleParty: 'مشرف الساحة',
    approvingAuthority: 'قائد التشغيل التجريبي',
    problemStatement: 'احتاجت ملاحظة جودة التوجيه إلى إجراء موثق ثم تحقق من الإغلاق.',
    decisionType: 'quality',
    urgency: 'low',
    priority: 0,
    confidence: 'high',
    evidence: [evidence('DECISION-EVIDENCE-005', 'قائمة تحقق جودة التوجيه', 'verified')],
    assumptions: [],
    constraints: [],
    availableOptions: [option('OPTION-005-A', 'تحديث التوجيه', 'تحديث نقطة التوجيه وفق القائمة.', 'تحسين وضوح التعليمات.', [])],
    selectedOption: 'OPTION-005-A',
    rejectedOptions: [],
    approvalStatus: 'approved',
    approvedBy: 'قائد التشغيل التجريبي',
    approvedAt: '2026-07-08T12:00:00Z',
    approvalComments: 'اعتماد محلي لتمرين دورة القرار.',
    actionRequired: 'حفظ درس مستفاد بعد التحقق.',
    assignedTo: 'مشرف الساحة',
    dueAt: '2026-07-09T12:00:00Z',
    escalationLevel: 'none',
    status: 'closed',
    expectedImpact: impact('low', 'تحسين وضوح التوجيه في الحالة التجريبية.', { visitor: 'low', operational: 'low' }),
    actualImpact: impact('low', 'تم التحقق من إغلاق الملاحظة في بيانات العرض.', { visitor: 'low', operational: 'low' }),
    outcomeStatus: 'positive',
    completionEvidenceIds: ['DECISION-EVIDENCE-005'],
    completionNote: 'اكتمل تحديث التوجيه وفق قائمة التحقق التجريبية.',
    verifiedBy: 'مراجع الجودة التجريبي',
    verifiedAt: '2026-07-09T13:00:00Z',
    verificationEvidenceIds: ['DECISION-EVIDENCE-005'],
    closedBy: 'قائد الجودة التجريبي',
    closedAt: '2026-07-09T14:00:00Z',
    closureReason: 'اكتمل الإجراء وقياس أثره وتوثيق دليل التحقق المحلي.',
    lessonsLearned: 'تظهر قيمة القرار عندما يرتبط الإجراء بدليل تحقق واضح.',
    revision: 8,
    changeReason: 'إغلاق القرار بعد تحقق تجريبي.',
    changeHistory: history(
      ['draft', '2026-07-08T09:00:00Z', 'إنشاء مسودة القرار.', 'قائد الجودة التجريبي'],
      ['review', '2026-07-08T10:00:00Z', 'رفع القرار للمراجعة.', 'قائد الجودة التجريبي'],
      ['approved', '2026-07-08T12:00:00Z', 'اعتماد خيار تحديث التوجيه.', 'قائد التشغيل التجريبي'],
      ['assigned', '2026-07-08T12:15:00Z', 'إسناد تحديث التوجيه إلى مشرف الساحة.', 'قائد التشغيل التجريبي'],
      ['in-progress', '2026-07-09T09:00:00Z', 'بدء تنفيذ تحديث التوجيه.', 'مشرف الساحة'],
      ['completed', '2026-07-09T12:00:00Z', 'اكتمال تحديث التوجيه وحفظ دليل الإكمال.', 'مشرف الساحة'],
      ['verified', '2026-07-09T13:00:00Z', 'توثيق التحقق من النتيجة.', 'مراجع الجودة التجريبي'],
      ['closed', '2026-07-09T14:00:00Z', 'إغلاق القرار بعد تحقق تجريبي.', 'قائد الجودة التجريبي']
    )
  }
];

export const demoDecisions: DecisionRecord[] = legacyDemoDecisions.map(migrateLegacyDecisionRecord).map((decision) => ({
  ...decision,
  // One demo record is deliberately non-positional so consumers must read relationType.
  relationships: decision.decisionId === 'DECISION-001' ? [...decision.relationships].reverse() : decision.relationships
}));

export function cloneDemoDecisions(): DecisionRecord[] {
  return demoDecisions.map((decision) => ({
    ...decision,
    relationships: decision.relationships.map((relation) => ({ ...relation })),
    evidence: decision.evidence.map((item) => ({ ...item })),
    assumptions: [...decision.assumptions],
    constraints: [...decision.constraints],
    availableOptions: decision.availableOptions.map((item) => ({ ...item, risks: [...item.risks] })),
    rejectedOptions: [...decision.rejectedOptions],
    expectedImpact: { ...decision.expectedImpact, dimensions: { ...decision.expectedImpact.dimensions } },
    actualImpact: decision.actualImpact ? { ...decision.actualImpact, dimensions: { ...decision.actualImpact.dimensions } } : null,
    completionEvidenceIds: [...decision.completionEvidenceIds],
    verificationEvidenceIds: [...decision.verificationEvidenceIds],
    changeHistory: decision.changeHistory.map((item) => ({ ...item }))
  }));
}
