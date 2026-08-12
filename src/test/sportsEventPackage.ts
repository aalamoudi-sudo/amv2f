import type { ReferencePackageSpec } from '../data/referenceEventPackages';

export const sportsTestSpec: ReferencePackageSpec = {
  packageId: 'EVENT-PACKAGE-SPORTS-TEST',
  eventType: 'sports-event-test',
  templateId: 'EVENT-TEMPLATE-SPORTS-TEST-V1',
  eventId: 'EVENT-SPORTS-TEST-001',
  venueId: 'VENUE-SPORTS-TEST-001',
  titleAr: 'حزمة فعالية رياضية اختبارية',
  titleEn: 'Sports Test Package',
  descriptionAr: 'حزمة اختبارية بإحداثيات مزاحة ونطاق مكاني مختلف.',
  descriptionEn: 'Offset sports test configuration.',
  eventNameAr: 'فعالية المضمار الاختبارية',
  eventNameEn: 'Track Test Event',
  entities: [
    { id: 'SITE-SPRT-001', nameAr: 'موقع المضمار', nameEn: 'Track Site', type: 'site', parentId: null, position: [250, 0, -180], scale: [120, 0.2, 70], responsibleParty: 'غرفة اختبار', description: 'موقع اختبار مزاح.' },
    { id: 'ZONE-SPRT-001', nameAr: 'منطقة دخول الفرق', nameEn: 'Team Entry', type: 'zone', parentId: 'SITE-SPRT-001', position: [220, 0.3, -165], scale: [16, 0.6, 10], readiness: 63, status: 'needsAttention', riskLevel: 'high', responsibleParty: 'تشغيل الفرق', description: 'منطقة اختبار.' },
    { id: 'ZONE-SPRT-002', nameAr: 'منطقة الجمهور', nameEn: 'Spectator Zone', type: 'zone', parentId: 'SITE-SPRT-001', position: [278, 0.3, -195], scale: [22, 0.6, 14], readiness: 91, status: 'ready', riskLevel: 'low', responsibleParty: 'تشغيل الجمهور', description: 'منطقة اختبار.' },
    { id: 'GATE-SPRT-001', nameAr: 'بوابة الفرق', nameEn: 'Team Gate', type: 'gate', parentId: 'SITE-SPRT-001', position: [195, 0.7, -165], scale: [3, 1.4, 6], readiness: 80, responsibleParty: 'الأمن المحلي', description: 'بوابة اختبار.' },
    { id: 'ROUTE-SPRT-001', nameAr: 'مسار الفرق', nameEn: 'Team Route', type: 'route', parentId: 'SITE-SPRT-001', position: [220, 0.1, -170], scale: [45, 0.2, 1], responsibleParty: 'تشغيل الفرق', description: 'مسار اختبار.' }
  ],
  routes: [{ id: 'ROUTE-SPRT-001', nameAr: 'حركة الفرق', nameEn: 'Team Flow', type: 'service', points: [[190, 0.35, -165], [220, 0.35, -165], [250, 0.35, -180]], relatedEntityIds: ['GATE-SPRT-001', 'ZONE-SPRT-001'], color: '#f2b84b', secondaryColor: '#fff0bc' }],
  readiness: [
    { zoneId: 'ZONE-SPRT-001', readiness: 63, status: 'needsAttention', riskLevel: 'high', titleAr: 'دخول الفرق', owner: 'قائد التشغيل', responsibleParty: 'مشرف الفرق', confidence: 'medium', approvalStatus: 'under-review', openingImpact: 'high', visitorRouteImpact: 'medium', relatedRouteIds: ['ROUTE-SPRT-001'], blockerAr: 'اختبار عائق دخول الفرق' },
    { zoneId: 'ZONE-SPRT-002', readiness: 91, status: 'ready', riskLevel: 'low', titleAr: 'الجمهور', owner: 'قائد الجمهور', responsibleParty: 'مشرف الجمهور', confidence: 'high', approvalStatus: 'under-review', openingImpact: 'medium', visitorRouteImpact: 'low', relatedRouteIds: [] }
  ],
  decisions: [{ decisionId: 'DECISION-SPRT-001', titleAr: 'حماية موعد دخول الفرق', problemAr: 'العائق الاختباري يؤخر دخول الفرق.', decisionType: 'schedule', urgency: 'high', owner: 'قائد التشغيل', responsibleParty: 'مشرف الفرق', authority: 'مراجعة رياضية محلية', targetEntityId: 'ZONE-SPRT-001', affectedEntityIds: ['GATE-SPRT-001', 'ROUTE-SPRT-001'], expectedImpact: { level: 'high', summaryAr: 'أثر اختباري على الجدول.', dimensions: { schedule: 'high', operational: 'high' } } }],
  enabledPackIds: ['spatial-foundation', 'zone-readiness', 'decision-engine', 'operational-capture', 'scenario-player', 'spatial-output', 'projection-preview'],
  roleTitles: { operator: 'مشغل الفعالية الرياضية', owner: 'مالك القرار الرياضي', approver: 'مراجع رياضي محلي' },
  authorityTitles: { operational: 'مراجعة رياضية محلية', safety: 'مراجعة سلامة رياضية محلية' }
};
