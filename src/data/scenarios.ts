import type { ScenarioDefinition } from '../types/scenario';

export const scenarioDefinitions: ScenarioDefinition[] = [
  {
    id: 'visitorJourney',
    nameAr: 'رحلة الزائر',
    nameEn: 'Visitor Journey',
    descriptionAr: 'تمرين إجرائي لمسار الزائر من البوابة إلى مناطق التجربة.',
    steps: [
      {
        id: 'visitor-gate',
        titleAr: 'وصول الزوار',
        messageAr: 'بدء رحلة الزائر من البوابة الشرقية مع إظهار مسار الدخول الرئيسي.',
        durationMs: 1800,
        focusEntityId: 'GATE-001',
        highlightEntityIds: ['GATE-001', 'ROUTE-001'],
        showRoutes: ['ROUTE-001'],
        hideRoutes: ['ROUTE-002', 'ROUTE-003'],
        changes: [{ entityId: 'GATE-001', status: 'ready', readiness: 98, riskLevel: 'low' }]
      },
      {
        id: 'visitor-reception',
        titleAr: 'الاستقبال والتوجيه',
        messageAr: 'الزوار ينتقلون إلى منطقة الاستقبال للتحقق والتوجيه.',
        durationMs: 1800,
        focusEntityId: 'ZONE-001',
        highlightEntityIds: ['ZONE-001', 'ROUTE-001'],
        changes: [{ entityId: 'ZONE-001', status: 'ready', readiness: 96 }]
      },
      {
        id: 'visitor-exhibition',
        titleAr: 'الوصول إلى المعارض',
        messageAr: 'توجيه الحركة نحو منطقة المعارض مع مراقبة كثافة التدفق.',
        durationMs: 1800,
        focusEntityId: 'ZONE-002',
        highlightEntityIds: ['ZONE-002', 'ROUTE-001'],
        changes: [{ entityId: 'ZONE-002', status: 'needsAttention', readiness: 76, riskLevel: 'medium' }]
      },
      {
        id: 'visitor-plaza',
        titleAr: 'الانتقال إلى الساحة',
        messageAr: 'استكمال الرحلة في ساحة الفعاليات وربطها بالمنصة الرئيسية.',
        durationMs: 1800,
        focusEntityId: 'ZONE-004',
        highlightEntityIds: ['ZONE-004', 'STAGE-001', 'ROUTE-001'],
        changes: [{ entityId: 'ZONE-004', status: 'ready', readiness: 90 }]
      }
    ]
  },
  {
    id: 'siteReadiness',
    nameAr: 'جاهزية الموقع',
    nameEn: 'Site Readiness',
    descriptionAr: 'فحص سريع لمؤشرات الجاهزية ومناطق التأخير التشغيلية.',
    steps: [
      {
        id: 'readiness-overview',
        titleAr: 'نظرة عامة',
        messageAr: 'قراءة شاملة لحالة الموقع قبل فتح التشغيل الكامل.',
        durationMs: 1600,
        focusEntityId: 'SITE-001',
        highlightEntityIds: ['SITE-001'],
        hideRoutes: ['ROUTE-001', 'ROUTE-002', 'ROUTE-003'],
        changes: [{ entityId: 'SITE-001', status: 'preparing', readiness: 70 }]
      },
      {
        id: 'readiness-service-delay',
        titleAr: 'تأخير الخدمات',
        messageAr: 'ممر الخدمات ومنطقة الخدمات الخلفية هما أعلى نقاط المتابعة حالياً.',
        durationMs: 1900,
        focusEntityId: 'SERVICE-001',
        highlightEntityIds: ['ZONE-005', 'SERVICE-001', 'ROUTE-003'],
        showRoutes: ['ROUTE-003'],
        changes: [
          { entityId: 'ZONE-005', status: 'delayed', readiness: 43, riskLevel: 'high' },
          { entityId: 'SERVICE-001', status: 'delayed', readiness: 47, riskLevel: 'high' }
        ]
      },
      {
        id: 'readiness-halls',
        titleAr: 'جاهزية القاعات',
        messageAr: 'القاعة الجنوبية جاهزة، والقاعة الشمالية تحتاج متابعة تجهيز نهائية.',
        durationMs: 1900,
        focusEntityId: 'HALL-001',
        highlightEntityIds: ['HALL-001', 'HALL-002'],
        changes: [
          { entityId: 'HALL-001', status: 'preparing', readiness: 80, riskLevel: 'medium' },
          { entityId: 'HALL-002', status: 'ready', readiness: 88, riskLevel: 'low' }
        ]
      },
      {
        id: 'readiness-executive-summary',
        titleAr: 'قرار المتابعة',
        messageAr: 'الموقع قابل للتشغيل المشروط مع أولوية لفريق الخدمات اللوجستية.',
        durationMs: 1800,
        focusEntityId: 'ZONE-005',
        highlightEntityIds: ['ZONE-005', 'SERVICE-001'],
        changes: [{ entityId: 'SITE-001', status: 'needsAttention', readiness: 72, riskLevel: 'medium' }]
      }
    ]
  },
  {
    id: 'evacuation',
    nameAr: 'الإخلاء',
    nameEn: 'Evacuation',
    descriptionAr: 'سيناريو استجابة يبرز مسار الإخلاء ونقاط التجمع والبوابات الحرجة.',
    steps: [
      {
        id: 'evacuation-trigger',
        titleAr: 'تفعيل الاستجابة',
        messageAr: 'تم تفعيل حالة طوارئ افتراضية في ساحة الفعاليات.',
        durationMs: 1500,
        focusEntityId: 'ZONE-004',
        highlightEntityIds: ['ZONE-004'],
        hideRoutes: ['ROUTE-001', 'ROUTE-003'],
        changes: [{ entityId: 'ZONE-004', status: 'emergency', readiness: 52, riskLevel: 'critical' }]
      },
      {
        id: 'evacuation-route',
        titleAr: 'فتح مسار الإخلاء',
        messageAr: 'إظهار مسار الإخلاء وتوجيه الحركة إلى نقاط التجمع.',
        durationMs: 1800,
        focusEntityId: 'ROUTE-002',
        highlightEntityIds: ['ROUTE-002', 'GATE-003'],
        showRoutes: ['ROUTE-002'],
        changes: [{ entityId: 'GATE-003', status: 'ready', readiness: 96, riskLevel: 'medium' }]
      },
      {
        id: 'evacuation-assembly-a',
        titleAr: 'نقطة التجمع أ',
        messageAr: 'توجيه الكثافة الغربية إلى نقطة التجمع أ.',
        durationMs: 1700,
        focusEntityId: 'ASSEMBLY-001',
        highlightEntityIds: ['ASSEMBLY-001', 'ROUTE-002'],
        changes: [{ entityId: 'ASSEMBLY-001', status: 'ready', readiness: 98, riskLevel: 'low' }]
      },
      {
        id: 'evacuation-assembly-b',
        titleAr: 'نقطة التجمع ب',
        messageAr: 'توجيه الحركة الجنوبية إلى نقطة التجمع ب عبر بوابة الطوارئ.',
        durationMs: 1700,
        focusEntityId: 'ASSEMBLY-002',
        highlightEntityIds: ['ASSEMBLY-002', 'GATE-003', 'ROUTE-002'],
        changes: [{ entityId: 'ASSEMBLY-002', status: 'ready', readiness: 97, riskLevel: 'low' }]
      },
      {
        id: 'evacuation-stabilize',
        titleAr: 'استقرار الحالة',
        messageAr: 'تثبيت المسارات الحرجة وإبقاء مركز العمليات على متابعة مباشرة.',
        durationMs: 1600,
        focusEntityId: 'SITE-001',
        highlightEntityIds: ['SITE-001', 'ROUTE-002'],
        changes: [{ entityId: 'SITE-001', status: 'highRisk', readiness: 64, riskLevel: 'high' }]
      }
    ]
  }
];

export function getScenarioDefinition(id: ScenarioDefinition['id']): ScenarioDefinition {
  const fallbackScenario = scenarioDefinitions[0]!;
  return scenarioDefinitions.find((scenario) => scenario.id === id) ?? fallbackScenario;
}
