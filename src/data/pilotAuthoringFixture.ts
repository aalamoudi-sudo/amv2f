import { buildEventPackageFromSpec, type ReferencePackageSpec } from './referenceEventPackages';
import type { PilotSourceBundle } from '../types/pilotAuthoring';
import { getScenarioPlayerPackConfiguration } from '../services/scenarioPackValidation';

const fictionalPilotSpec: ReferencePackageSpec = {
  packageId: 'EVENT-PACKAGE-PILOT-CIVIC-EXPERIENCE-FICTIONAL',
  eventType: 'controlled-public-experience',
  templateId: 'EVENT-TEMPLATE-CONTROLLED-PUBLIC-EXPERIENCE-V1',
  eventId: 'EVENT-PILOT-CIVIC-001',
  venueId: 'VENUE-PILOT-CIVIC-001',
  titleAr: 'حزمة تأليف خيالية لتجربة عامة محكومة',
  titleEn: 'Fictional Controlled Public Experience Authoring Package',
  descriptionAr: 'نموذج خيالي صريح لاختبار مسار التأليف من المصدر إلى التفعيل المؤقت.',
  descriptionEn: 'Explicit fictional fixture for source-to-temporary-activation authoring tests.',
  eventNameAr: 'تجربة الساحة المدنية الخيالية',
  eventNameEn: 'Fictional Civic Courtyard Experience',
  entities: [
    { id: 'SITE-PLT-001', nameAr: 'موقع التجربة الخيالي', nameEn: 'Fictional Pilot Site', type: 'site', parentId: null, position: [65, 0, 40], scale: [52, 0.2, 34], responsibleParty: 'فريق تأليف خيالي', description: 'حدود مكانية خيالية لاستخدام تقني محلي.' },
    { id: 'ZONE-PLT-001', nameAr: 'منطقة الاستقبال التجريبية', nameEn: 'Pilot Reception Zone', type: 'zone', parentId: 'SITE-PLT-001', position: [52, 0.3, 48], scale: [10, 0.6, 6], readiness: 84, status: 'needsAttention', riskLevel: 'medium', responsibleParty: 'مشرف استقبال خيالي', description: 'منطقة خيالية لاختبار الجاهزية.' },
    { id: 'ZONE-PLT-002', nameAr: 'منطقة التجربة العامة', nameEn: 'Public Experience Zone', type: 'zone', parentId: 'SITE-PLT-001', position: [72, 0.3, 36], scale: [16, 0.6, 10], readiness: 63, status: 'delayed', riskLevel: 'high', responsibleParty: 'مشرف تجربة خيالي', description: 'منطقة خيالية ذات عائق مؤقت.' },
    { id: 'GATE-PLT-001', nameAr: 'بوابة الدخول التجريبية', nameEn: 'Pilot Entry Gate', type: 'gate', parentId: 'SITE-PLT-001', position: [40, 0.7, 49], scale: [3, 1.4, 5], readiness: 91, status: 'ready', riskLevel: 'low', responsibleParty: 'أمن خيالي', description: 'بوابة خيالية للاختبار.' },
    { id: 'STAGE-PLT-001', nameAr: 'منصة الساحة الخيالية', nameEn: 'Fictional Courtyard Stage', type: 'stage', parentId: 'SITE-PLT-001', position: [78, 0.8, 48], scale: [9, 1.5, 6], readiness: 70, responsibleParty: 'تشغيل منصة خيالي', description: 'منصة خيالية لاختبار نوع فعالية جديد.' },
    { id: 'ROUTE-PLT-001', nameAr: 'مسار الدخول التجريبي', nameEn: 'Pilot Entry Route', type: 'route', parentId: 'SITE-PLT-001', position: [57, 0.1, 46], scale: [28, 0.2, 1], responsibleParty: 'حركة زوار خيالية', description: 'تمثيل مسار خيالي.' }
  ],
  routes: [{
    id: 'ROUTE-PLT-001',
    nameAr: 'دخول التجربة الخيالية',
    nameEn: 'Fictional Experience Entry',
    type: 'visitor',
    points: [[39, 0.35, 49], [52, 0.35, 48], [63, 0.35, 43], [72, 0.35, 36]],
    relatedEntityIds: ['GATE-PLT-001', 'ZONE-PLT-001', 'ZONE-PLT-002'],
    color: '#4bd5b5',
    secondaryColor: '#d4fff5'
  }],
  readiness: [
    { zoneId: 'ZONE-PLT-001', readiness: 84, status: 'needsAttention', riskLevel: 'medium', titleAr: 'الاستقبال التجريبي', owner: 'مالك جاهزية خيالي', responsibleParty: 'مشرف استقبال خيالي', confidence: 'high', approvalStatus: 'approved', openingImpact: 'medium', visitorRouteImpact: 'high', relatedRouteIds: ['ROUTE-PLT-001'] },
    { zoneId: 'ZONE-PLT-002', readiness: 63, status: 'delayed', riskLevel: 'high', titleAr: 'التجربة العامة الخيالية', owner: 'مالك تجربة خيالي', responsibleParty: 'مشرف تجربة خيالي', confidence: 'medium', approvalStatus: 'under-review', openingImpact: 'high', visitorRouteImpact: 'high', relatedRouteIds: ['ROUTE-PLT-001'], blockerAr: 'عائق خيالي لاختبار مسار التدخل' }
  ],
  decisions: [{
    decisionId: 'DECISION-PLT-001',
    titleAr: 'حماية فتح التجربة الخيالية',
    problemAr: 'عائق خيالي يهدد موعد فتح المنطقة التجريبية.',
    decisionType: 'readiness',
    urgency: 'high',
    owner: 'مالك قرار خيالي',
    responsibleParty: 'مشرف تجربة خيالي',
    authority: 'مراجعة محلية خيالية مستقلة',
    targetEntityId: 'ZONE-PLT-002',
    affectedEntityIds: ['ROUTE-PLT-001', 'STAGE-PLT-001'],
    expectedImpact: { level: 'high', summaryAr: 'أثر خيالي على الفتح ومسار الدخول.', dimensions: { operational: 'high', schedule: 'high', visitor: 'medium' } }
  }],
  enabledPackIds: ['spatial-foundation', 'zone-readiness', 'decision-engine', 'operational-capture', 'scenario-player', 'spatial-output', 'projection-preview'],
  roleTitles: { operator: 'مشغل نموذج خيالي', owner: 'مالك قرار خيالي', approver: 'مراجع خيالي مستقل' },
  authorityTitles: { operational: 'مراجعة محلية خيالية مستقلة', safety: 'مراجعة سلامة خيالية مستقلة' }
};

export async function createFictionalPilotSourceBundle(): Promise<PilotSourceBundle> {
  const eventPackage = await buildEventPackageFromSpec(fictionalPilotSpec);
  const scenarioConfiguration = getScenarioPlayerPackConfiguration(eventPackage.operationalPackConfiguration);
  if (!scenarioConfiguration) throw new Error('Fictional pilot fixture requires scenario configuration.');
  return {
    schemaVersion: '1.0.0',
    sourceType: 'fictional-example',
    pilotBundleId: 'PILOT-BUNDLE-CIVIC-FICTIONAL-001',
    pilotBundleVersion: '1.0.0',
    eventNameAr: fictionalPilotSpec.eventNameAr,
    eventNameEn: fictionalPilotSpec.eventNameEn,
    eventType: fictionalPilotSpec.eventType,
    eventId: fictionalPilotSpec.eventId,
    venueId: fictionalPilotSpec.venueId,
    startAt: eventPackage.eventInstance.startAt,
    endAt: eventPackage.eventInstance.endAt,
    timeZone: eventPackage.eventInstance.timeZone,
    source: 'نموذج تأليف خيالي داخل مستودع الاختبار',
    sourceOwner: 'مالك نموذج خيالي',
    preparedBy: 'منسق تأليف خيالي',
    preparedAt: '2026-07-13T06:00:00.000Z',
    approvalStatus: 'approved',
    approvedBy: 'مراجع تقني خيالي مستقل',
    approvedAt: '2026-07-13T07:00:00.000Z',
    securityClassification: 'internal',
    privacyClassification: 'none',
    permittedUse: 'اختبار تقني محلي لمسار المرحلة 3E.2 فقط؛ لا استخدام تشغيلي.',
    retentionPolicy: 'يحذف مع النموذج عند استبداله؛ لا يمثل سياسة احتفاظ إنتاجية.',
    revision: 1,
    changeReason: 'إنشاء نموذج خيالي لإثبات قابلية التأليف دون بيانات أحمد.',
    entities: structuredClone(eventPackage.spatialConfiguration.entities),
    routes: structuredClone(eventPackage.routeConfiguration.routes),
    readinessRecords: eventPackage.temporaryDemoSeedData.readinessRecords.map((seed) => structuredClone(seed.record)),
    decisionRecords: eventPackage.temporaryDemoSeedData.decisionRecords.map((seed) => structuredClone(seed.record)),
    requirements: structuredClone(eventPackage.requirementConfiguration),
    roles: structuredClone(eventPackage.roleConfiguration),
    authorities: structuredClone(eventPackage.authorityConfiguration),
    integrationProfiles: structuredClone(eventPackage.integrationProfileConfiguration),
    projectionProfile: structuredClone(eventPackage.projectionProfileConfiguration[0]!),
    physicalOutputProfile: structuredClone(eventPackage.physicalOutputProfileConfiguration[0]!),
    spatialProfile: {
      siteBoundaryId: eventPackage.spatialConfiguration.siteBoundaryId,
      localCoordinateSystem: structuredClone(eventPackage.spatialConfiguration.localCoordinateSystem),
      geographicReference: structuredClone(eventPackage.spatialConfiguration.geographicReference),
      modelReferences: structuredClone(eventPackage.spatialConfiguration.modelReferences),
      spatialMappingVersion: eventPackage.spatialConfiguration.spatialMappingVersion,
      projectionProfileVersion: eventPackage.spatialConfiguration.projectionProfileVersion,
      physicalOutputMappingVersion: eventPackage.spatialConfiguration.physicalOutputMappingVersion
    },
    scenarioConfiguration: structuredClone(scenarioConfiguration),
    captureFixtures: eventPackage.temporaryDemoSeedData.captureFixtures.map((seed) => structuredClone(seed.record)),
    evidenceRegister: [{
      evidenceId: 'EVIDENCE-PILOT-FICTIONAL-001',
      titleAr: 'قائمة تحقق خيالية للتأليف',
      evidenceType: 'checklist',
      sourceId: 'SOURCE-PILOT-FICTIONAL-001',
      owner: 'مالك دليل خيالي',
      capturedAt: '2026-07-13T06:15:00.000Z',
      status: 'verified',
      classification: 'internal',
      uri: null,
      exampleOnly: true
    }],
    sourceRegister: [{
      sourceId: 'SOURCE-PILOT-FICTIONAL-001',
      sourceNameAr: 'سجل مصدر النموذج الخيالي',
      sourceOwner: 'مالك مصدر خيالي',
      sourceType: 'manual-register',
      authorityStatus: 'declared',
      updatedAt: '2026-07-13T06:15:00.000Z',
      retentionPolicy: 'نموذج محلي قابل للحذف.',
      classification: 'internal',
      exampleOnly: true
    }],
    integrationCandidates: [
      {
        candidateId: 'INTEGRATION-CANDIDATE-PILOT-INPUT-001', path: 'input', systemName: 'إدخال موظف أو ملف خارجي مرشح', owner: 'مالك تكامل خيالي', direction: 'input', method: 'manual-local', authenticationRequirement: 'غير مطبق؛ يتطلب هوية إنتاجية مستقبلاً', dataSupplied: ['تحديث منطقة خيالي'], dataReceived: ['ظرف التقاط محلي'], stableIdMapping: 'eventId/venueId/entityId', expectedFrequency: 'عند الطلب في المختبر', errorBehavior: 'رفض السجل وإظهار خطأ عربي', offlineBehavior: 'معاينة طابور محلي فقط', retryBehavior: 'إعادة يدوية مع مفتاح تكرار', evidencePolicy: 'مرجع دليل محلي اختياري في النموذج', securityClassification: 'internal', dataResidency: 'المتصفح المحلي فقط', retention: 'جلسة المختبر', exitExportMethod: 'ملف منقح', sandboxAvailability: 'available-local', credentialAvailability: 'not-required', adapterStatus: 'reference-local', acceptanceCriteria: ['اجتياز عقد المرحلة 3D.1A', 'عدم تعديل الحالة الأساسية']
      },
      {
        candidateId: 'INTEGRATION-CANDIDATE-PILOT-SPATIAL-001', path: 'spatial', systemName: 'مرشح البوابة المكانية', owner: 'مالك هندسة خيالي', direction: 'output', method: 'file', authenticationRequirement: 'لا اتصال خارجي في هذه المرحلة', dataSupplied: ['إحداثيات محلية', 'ربط عناصر'], dataReceived: ['معاينة ثنائية وثلاثية الأبعاد وجغرافية'], stableIdMapping: 'معرّف العنصر الدائم', expectedFrequency: 'عند تجميد كل مراجعة', errorBehavior: 'حجب التفعيل عند مرجع معلق', offlineBehavior: 'ملف محلي فقط', retryBehavior: 'إعادة ترجمة المراجعة', evidencePolicy: 'مصدر هندسة وإصدار إلزاميان', securityClassification: 'internal', dataResidency: 'ملفات محلية', retention: 'حسب سجل المصدر', exitExportMethod: 'ملف حزمة فعالية منظم', sandboxAvailability: 'available-local', credentialAvailability: 'not-required', adapterStatus: 'candidate', acceptanceCriteria: ['صفر مراجع مكانية معلقة', 'تطابق المعرّفات']
      },
      {
        candidateId: 'INTEGRATION-CANDIDATE-PILOT-PHYSICAL-001', path: 'physical', systemName: 'معاينة إخراج مطبوع أو مادي', owner: 'مالك مخرجات خيالي', direction: 'output', method: 'print-export', authenticationRequirement: 'لا أجهزة أو بوابة في هذه المرحلة', dataSupplied: ['حالة إسقاط', 'ملف إسقاط بصري'], dataReceived: ['معاينة مخطط مطبوع فقط'], stableIdMapping: 'معرّف العنصر وإصدار ملف الإسقاط', expectedFrequency: 'عند الطلب بعد التجميد', errorBehavior: 'تصنيف المخرج غير متاح عند نقص الملف', offlineBehavior: 'تصدير محلي', retryBehavior: 'إعادة تصدير المراجعة نفسها', evidencePolicy: 'لا ادعاء معايرة أو تطابق مادي', securityClassification: 'internal', dataResidency: 'الجهاز المحلي', retention: 'حسب سياسة الحزمة', exitExportMethod: 'بيانات مرشح محلية منقحة', sandboxAvailability: 'unavailable', credentialAvailability: 'not-required', adapterStatus: 'not-executable', acceptanceCriteria: ['الالتزام بـ MEIOS-PDT-STD-001', 'عدم إرسال أوامر أجهزة']
      }
    ],
    entityOperationalCoverage: eventPackage.spatialConfiguration.entities.map((entity) => ({
      entityId: entity.id,
      readinessCoverage: eventPackage.temporaryDemoSeedData.readinessRecords.some((seed) => seed.record.zoneId === entity.id) ? 'provided' : 'not-applicable',
      decisionCoverage: eventPackage.temporaryDemoSeedData.decisionRecords.some((seed) => seed.record.relationships.some((relation) => relation.entityId === entity.id)) ? 'provided' : 'not-applicable',
      reasonAr: eventPackage.temporaryDemoSeedData.readinessRecords.some((seed) => seed.record.zoneId === entity.id) || eventPackage.temporaryDemoSeedData.decisionRecords.some((seed) => seed.record.relationships.some((relation) => relation.entityId === entity.id))
        ? 'يوجد سجل خيالي مرتبط بالعنصر داخل النموذج.'
        : 'لا يحتاج النموذج الخيالي إلى سجل مباشر لهذا العنصر.'
    })),
    enabledOperationalPackIds: [...eventPackage.operationalPackConfiguration.enabledPackIds],
    knownLimitations: [
      'كل البيانات خيالية ومؤقتة.',
      'لا هوية موثوقة ولا وقت سلطوي ولا سجل دائم.',
      'المسارات غير معتمدة ميدانياً.',
      'الإسقاط معاينة بصرية بلا أجهزة أو معايرة.'
    ]
  };
}
