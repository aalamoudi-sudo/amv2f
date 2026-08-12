import type { ZoneId, ZoneReadinessRecord } from '../types/spatial';

export const demoZoneReadiness: ZoneReadinessRecord[] = [
  {
    zoneId: 'ZONE-001',
    readiness: 94,
    status: 'ready',
    riskLevel: 'low',
    stateContext: 'temporary-demo',
    source: 'حزمة التحقق التجريبية - استقبال الزوار',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-10T08:30:00Z',
    updatedBy: 'مشرف بيانات العرض',
    owner: 'فريق تجربة الزوار',
    responsibleParty: 'مشرف الاستقبال',
    evidence: [
      {
        id: 'EVIDENCE-001',
        type: 'checklist',
        titleAr: 'قائمة تحقق الاستقبال',
        source: 'حزمة العرض التجريبية',
        capturedAt: '2026-07-10T08:15:00Z',
        status: 'verified'
      }
    ],
    confidence: 'high',
    approvalStatus: 'approved',
    approvedBy: 'مراجع التشغيل التجريبي',
    approvedAt: '2026-07-10T09:00:00Z',
    revision: 3,
    changeReason: 'تثبيت حالة الاستقبال بعد مراجعة القائمة التجريبية.',
    targetReadinessDate: '2026-07-15',
    blockers: [],
    dependencies: [],
    requiredAction: 'مراجعة دورية قبل الافتتاح.',
    escalationLevel: 'none',
    dueAt: '2026-07-13T12:00:00Z',
    operationalImpact: {
      opening: 'low',
      visitorRoutes: 'medium',
      safety: 'low',
      dependentAreas: 'medium',
      summaryAr: 'جاهزية مستقرة مع أثر متوسط على بداية مسار الزوار.'
    },
    relatedRouteIds: ['ROUTE-001'],
    openingImpact: 'low'
  },
  {
    zoneId: 'ZONE-002',
    readiness: 86,
    status: 'preparing',
    riskLevel: 'medium',
    stateContext: 'temporary-demo',
    source: 'تحديث مدير منطقة المعارض التجريبي',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-10T10:15:00Z',
    updatedBy: 'منسق بيانات العرض',
    owner: 'إدارة المعارض',
    responsibleParty: 'مشرف تجهيز المعارض',
    evidence: [],
    confidence: 'medium',
    approvalStatus: 'submitted',
    approvedBy: null,
    approvedAt: null,
    revision: 2,
    changeReason: 'رفع الحالة للمراجعة مع بقاء دليل نقاط التحقق ناقصاً.',
    targetReadinessDate: '2026-07-14',
    blockers: [],
    dependencies: [],
    requiredAction: 'إرفاق دليل جاهزية نقاط التحقق قبل اعتماد الحالة.',
    escalationLevel: 'watch',
    dueAt: '2026-07-12T16:00:00Z',
    operationalImpact: {
      opening: 'medium',
      visitorRoutes: 'high',
      safety: 'medium',
      dependentAreas: 'medium',
      summaryAr: 'الجاهزية مرتفعة نسبياً، لكن غياب الدليل يمنع توصية موثوقة.'
    },
    relatedRouteIds: ['ROUTE-001'],
    openingImpact: 'medium'
  },
  {
    zoneId: 'ZONE-003',
    readiness: 61,
    status: 'delayed',
    riskLevel: 'high',
    stateContext: 'temporary-demo',
    source: 'سجل متابعة الضيافة التجريبي',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-09T14:00:00Z',
    updatedBy: 'منسق بيانات العرض',
    owner: 'فريق الضيافة',
    responsibleParty: 'مشرف تجهيز الضيافة',
    evidence: [
      {
        id: 'EVIDENCE-003',
        type: 'field-note',
        titleAr: 'ملاحظة تجهيز الضيافة',
        source: 'سجل تجريبي محلي',
        capturedAt: '2026-07-09T13:45:00Z',
        status: 'pending'
      }
    ],
    confidence: 'medium',
    approvalStatus: 'under-review',
    approvedBy: null,
    approvedAt: null,
    revision: 4,
    changeReason: 'فتح عائق تجهيزات الضيافة للمراجعة.',
    targetReadinessDate: '2026-07-16',
    blockers: [
      {
        id: 'BLOCKER-003',
        titleAr: 'تأخر تجهيزات منطقة الضيافة',
        owner: 'مشرف تجهيز الضيافة',
        severity: 'high',
        status: 'open',
        dueAt: '2026-07-12T12:00:00Z'
      }
    ],
    dependencies: [],
    requiredAction: 'تأكيد خطة معالجة العائق وتحديث دليل الإنجاز.',
    escalationLevel: 'elevated',
    dueAt: '2026-07-12T12:00:00Z',
    operationalImpact: {
      opening: 'medium',
      visitorRoutes: 'medium',
      safety: 'low',
      dependentAreas: 'low',
      summaryAr: 'تأخر تجهيزات الضيافة قد يؤثر على ترتيب الافتتاح والخدمة.'
    },
    relatedRouteIds: ['ROUTE-001'],
    openingImpact: 'medium'
  },
  {
    zoneId: 'ZONE-004',
    readiness: 92,
    status: 'ready',
    riskLevel: 'medium',
    stateContext: 'temporary-demo',
    source: 'ملاحظة تشغيلية تجريبية للساحة',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-10T07:45:00Z',
    updatedBy: 'مراقب المشهد التجريبي',
    owner: 'إدارة الساحات',
    responsibleParty: 'مشرف الساحة',
    evidence: [
      {
        id: 'EVIDENCE-004',
        type: 'field-note',
        titleAr: 'ملاحظة تحتاج تحققاً',
        source: 'مراقبة تجريبية محلية',
        capturedAt: '2026-07-10T07:30:00Z',
        status: 'pending'
      }
    ],
    confidence: 'low',
    approvalStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    revision: 1,
    changeReason: 'إدخال نسبة مرتفعة مع إبقاء الثقة منخفضة لحين التحقق.',
    targetReadinessDate: '2026-07-13',
    blockers: [],
    dependencies: [],
    requiredAction: 'إعادة التحقق من السعة ومسار الحركة ميدانياً.',
    escalationLevel: 'watch',
    dueAt: '2026-07-13T10:00:00Z',
    operationalImpact: {
      opening: 'medium',
      visitorRoutes: 'high',
      safety: 'high',
      dependentAreas: 'medium',
      summaryAr: 'النسبة مرتفعة، لكن الثقة المنخفضة تمنع اعتماد الحالة.'
    },
    relatedRouteIds: ['ROUTE-001', 'ROUTE-002'],
    openingImpact: 'medium'
  },
  {
    zoneId: 'ZONE-005',
    readiness: 58,
    status: 'delayed',
    riskLevel: 'high',
    stateContext: 'temporary-demo',
    source: 'حزمة متابعة الخدمات التجريبية',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-09T09:20:00Z',
    updatedBy: 'منسق الخدمات التجريبي',
    owner: 'فريق الخدمات اللوجستية',
    responsibleParty: 'مشرف ممر الخدمات',
    evidence: [
      {
        id: 'EVIDENCE-005',
        type: 'checklist',
        titleAr: 'قائمة فحص ممر الخدمات',
        source: 'حزمة العرض التجريبية',
        capturedAt: '2026-07-09T09:00:00Z',
        status: 'verified'
      }
    ],
    confidence: 'high',
    approvalStatus: 'approved',
    approvedBy: 'مراجع التشغيل التجريبي',
    approvedAt: '2026-07-09T11:00:00Z',
    revision: 5,
    changeReason: 'اعتماد وصف العائق مع بقاء الجاهزية منخفضة.',
    targetReadinessDate: '2026-07-12',
    blockers: [
      {
        id: 'BLOCKER-005',
        titleAr: 'حاجز مفتوح في ممر الخدمات',
        owner: 'مشرف ممر الخدمات',
        severity: 'high',
        status: 'open',
        dueAt: '2026-07-11T15:00:00Z'
      }
    ],
    dependencies: [],
    requiredAction: 'إزالة العائق والتحقق من استمرارية مسار الزائر الرئيسي.',
    escalationLevel: 'urgent',
    dueAt: '2026-07-11T15:00:00Z',
    operationalImpact: {
      opening: 'high',
      visitorRoutes: 'high',
      safety: 'medium',
      dependentAreas: 'high',
      summaryAr: 'منطقة عالية الأثر؛ أي تأخر يضغط على مسار الزائر الرئيسي ومناطق تابعة.'
    },
    relatedRouteIds: ['ROUTE-001', 'ROUTE-003'],
    openingImpact: 'high'
  },
  {
    zoneId: 'ZONE-006',
    readiness: 79,
    status: 'needsAttention',
    riskLevel: 'critical',
    stateContext: 'temporary-demo',
    source: 'مراجعة السلامة التجريبية',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-10T12:00:00Z',
    updatedBy: 'منسق السلامة التجريبي',
    owner: 'فريق السلامة والطوارئ',
    responsibleParty: 'مسؤول HSE التجريبي',
    evidence: [
      {
        id: 'EVIDENCE-006',
        type: 'plan',
        titleAr: 'مخطط مراجعة السلامة',
        source: 'مخطط تجريبي محلي',
        capturedAt: '2026-07-10T11:30:00Z',
        status: 'pending'
      }
    ],
    confidence: 'medium',
    approvalStatus: 'under-review',
    approvedBy: null,
    approvedAt: null,
    revision: 2,
    changeReason: 'رفع عائق سلامة يتطلب مراجعة HSE قبل الاعتماد.',
    targetReadinessDate: '2026-07-13',
    blockers: [
      {
        id: 'BLOCKER-006',
        titleAr: 'حاجز سلامة يحتاج اعتماد HSE',
        owner: 'مسؤول HSE التجريبي',
        severity: 'critical',
        status: 'open',
        dueAt: '2026-07-11T13:00:00Z'
      }
    ],
    dependencies: [],
    requiredAction: 'إكمال مراجعة HSE قبل فتح المنطقة أو مسار الإخلاء.',
    escalationLevel: 'urgent',
    dueAt: '2026-07-11T13:00:00Z',
    operationalImpact: {
      opening: 'high',
      visitorRoutes: 'medium',
      safety: 'high',
      dependentAreas: 'high',
      summaryAr: 'لا يمكن اعتبار الحالة صالحة للتشغيل قبل مراجعة HSE.'
    },
    relatedRouteIds: ['ROUTE-002'],
    openingImpact: 'high'
  },
  {
    zoneId: 'ZONE-007',
    readiness: 66,
    status: 'preparing',
    riskLevel: 'medium',
    stateContext: 'temporary-demo',
    source: 'سجل الخدمات الطبية التجريبي',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-10T15:30:00Z',
    updatedBy: 'منسق بيانات العرض',
    owner: 'فريق الخدمات الطبية',
    responsibleParty: 'مشرف نقطة الدعم الطبي',
    evidence: [
      {
        id: 'EVIDENCE-007',
        type: 'checklist',
        titleAr: 'قائمة تجهيز نقطة الدعم',
        source: 'حزمة عرض تجريبية',
        capturedAt: '2026-07-10T15:00:00Z',
        status: 'verified'
      }
    ],
    confidence: 'high',
    approvalStatus: 'submitted',
    approvedBy: null,
    approvedAt: null,
    revision: 2,
    changeReason: 'إظهار اعتماد المنطقة على إغلاق ممر الخدمات أولاً.',
    targetReadinessDate: '2026-07-14',
    blockers: [
      {
        id: 'BLOCKER-007',
        titleAr: 'انتظار إغلاق عائق المنطقة upstream',
        owner: 'فريق الخدمات اللوجستية',
        severity: 'medium',
        status: 'open',
        dueAt: '2026-07-12T12:00:00Z'
      }
    ],
    dependencies: ['ZONE-005'],
    requiredAction: 'متابعة إغلاق ZONE-005 ثم إعادة فحص نقطة الدعم.',
    escalationLevel: 'elevated',
    dueAt: '2026-07-12T18:00:00Z',
    operationalImpact: {
      opening: 'medium',
      visitorRoutes: 'low',
      safety: 'high',
      dependentAreas: 'medium',
      summaryAr: 'المنطقة تعتمد على إغلاق ممر الخدمات قبل تثبيت جاهزيتها.'
    },
    relatedRouteIds: ['ROUTE-003'],
    openingImpact: 'medium'
  },
  {
    zoneId: 'ZONE-008',
    readiness: 74,
    status: 'needsAttention',
    riskLevel: 'medium',
    stateContext: 'temporary-demo',
    source: 'سجل مركز الإعلام التجريبي',
    sourceType: 'temporary-demo',
    updatedAt: '2026-07-01T08:00:00Z',
    updatedBy: 'منسق بيانات العرض',
    owner: 'إدارة الإعلام',
    responsibleParty: 'مشرف مركز الإعلام',
    evidence: [
      {
        id: 'EVIDENCE-008',
        type: 'field-note',
        titleAr: 'ملاحظة تجهيز قديمة',
        source: 'سجل تجريبي محلي',
        capturedAt: '2026-07-01T07:45:00Z',
        status: 'verified'
      }
    ],
    confidence: 'medium',
    approvalStatus: 'expired',
    approvedBy: null,
    approvedAt: null,
    revision: 1,
    changeReason: 'انتهت صلاحية آخر تحديث وتحتاج المنطقة إلى إعادة إدخال.',
    targetReadinessDate: '2026-07-08',
    blockers: [],
    dependencies: [],
    requiredAction: 'تحديث السجل المتأخر وإرفاق دليل حديث.',
    escalationLevel: 'elevated',
    dueAt: '2026-07-09T12:00:00Z',
    operationalImpact: {
      opening: 'medium',
      visitorRoutes: 'low',
      safety: 'low',
      dependentAreas: 'low',
      summaryAr: 'الإجراء متأخر والسجل منتهي الصلاحية، لذلك لا يمكن الاعتماد عليه.'
    },
    relatedRouteIds: [],
    openingImpact: 'medium',
    expiresAt: '2026-07-08T23:59:59Z'
  }
];

export function cloneDemoZoneReadiness(): ZoneReadinessRecord[] {
  return demoZoneReadiness.map((record) => ({
    ...record,
    evidence: record.evidence.map((evidence) => ({ ...evidence })),
    blockers: record.blockers.map((blocker) => ({ ...blocker })),
    dependencies: [...record.dependencies],
    relatedRouteIds: [...record.relatedRouteIds],
    operationalImpact: { ...record.operationalImpact }
  }));
}

export function getDemoZoneReadiness(zoneId: ZoneId): ZoneReadinessRecord | undefined {
  return demoZoneReadiness.find((record) => record.zoneId === zoneId);
}
