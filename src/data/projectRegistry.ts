import {
  eventThemePackages,
  kapCandidateEventTheme,
  neutralFallbackEventTheme
} from './eventThemePackages';
import { kapCandidateSpatialIntake } from './kapCandidateSpatialIntake';
import { kapReadinessPreparationPackId } from './readinessPacks';
import { kapSpatialCommandConfigurationId } from './spatialCommandExperienceIds';
import { kapProjectId } from './kapProjectIds';
import { conferenceExperienceTwinPackId, kapExperienceSourceId, kapExperienceTwinPackId } from './experienceTwinIds';
import { kapDesignAssetId, kapDesignSourceId } from './kapDesignIds';
import { ProjectRegistry } from '../services/projectRegistry';
import type {
  ProjectEventRecord,
  ProjectOperationalPackRecord,
  ProjectVenueRecord,
  ProjectWorkspace
} from '../types/projectWorkspace';

export { kapProjectId };
export const referenceExhibitionProjectId = 'PROJECT-REFERENCE-EXHIBITION-001';
export const referenceConferenceProjectId = 'PROJECT-REFERENCE-CONFERENCE-001';
export const referenceFestivalProjectId = 'PROJECT-REFERENCE-FESTIVAL-001';
export const localDemoProjectId = 'PROJECT-DEMO-LOCAL-001';
export const localDemoRuntimePackId = 'RUNTIME-PACK-MAYADEEN-LOCAL-DEMO';
export const demoExperienceProjectId = 'PROJECT-DEMO-EXPERIENCE-001';
export const referenceExperienceProjectId = 'PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001';

const projects: ProjectWorkspace[] = [
  {
    projectId: kapProjectId,
    organizationId: 'ORG-MAYADEEN-001',
    nameAr: 'افتتاح وتدشين حدائق الملك عبدالله',
    nameEn: 'King Abdullah Parks Opening and Inauguration',
    description: 'حاوية مشروع مرشحة مبنية على مصادر KAP الحالية؛ لا تثبت جاهزية تشغيلية أو هندسة معتمدة.',
    projectStatus: 'candidate',
    truthContext: 'temporary-demo',
    projectType: 'government-opening',
    eventIds: ['EVENT-KAP-OPENING-2026'],
    venueIds: ['VENUE-KAP-001'],
    defaultEventId: 'EVENT-KAP-OPENING-2026',
    themeId: kapCandidateEventTheme.themeId,
    operationalPackIds: [
      'EXPERIENCE-PACK-KAP-OPENING-2026-CANDIDATE',
      kapSpatialCommandConfigurationId,
      kapReadinessPreparationPackId,
      kapExperienceTwinPackId
    ],
    sourceReferences: [
      { sourceId: 'SOURCE-KAP-PILOT-DEFINITION-001', classification: 'candidate', statusAr: 'حزمة تأليف مرشحة', noteAr: 'المناطق الخمس مثبتة منطقيًا فقط.' },
      { sourceId: 'SOURCE-KAP-DWG-PROVISIONAL-001', classification: 'authoritative', statusAr: 'هوية مصدر CAD معتمدة', noteAr: 'المعرّف التاريخي ثابت للبصمة نفسها؛ اعتماد المصدر لا يمنح تسجيلًا هندسيًا أو baseline.' },
      { sourceId: 'AUTH-KAP-DWG-FOUNDER-APPROVED-20260729', classification: 'authoritative', statusAr: 'founder-approved-cad-source', noteAr: 'اعتماد هوية المصدر والاستخدام المضبوط فقط؛ الاستخراج والمقياس وCRS ونقاط الضبط معلقة.' },
      { sourceId: 'SOURCE-ASSET-KAP-GOVERNANCE-PPTX-001', classification: 'authoritative', statusAr: 'مصدر حوكمة المشروع معتمد', noteAr: 'يحدد الهيكل ومسار الاعتماد والتصعيد، ولا يثبت الجاهزية التشغيلية.' },
      { sourceId: 'SOURCE-KAP-PRESENTATION-V03-2026', classification: 'candidate', statusAr: 'هوية فعالية مرشحة', noteAr: 'صور المراجعة review-only.' },
      { sourceId: 'SOURCE-ASSET-KAP-ZONING-CANDIDATE-001', classification: 'candidate', statusAr: 'تقسيم تشغيلي مرشح موثق البصمة', noteAr: 'يسمح بمؤشرات صورة مرشحة فقط، ولا يمنح هندسة أو مسارات أو سعات.' },
      { sourceId: 'SOURCE-ASSET-KAP-FIELD-MEDIA-INVENTORY-001', classification: 'candidate', statusAr: 'جرد أدلة ميدانية metadata-only', noteAr: 'لا يغير الجاهزية ولا ينشر إحداثيات GPS أو هوية أشخاص.' },
      { sourceId: kapExperienceSourceId, classification: 'candidate', statusAr: 'برنامج وتصميم مرشح موثق البصمة', noteAr: 'مرجع الأيام الأربعة والتصميم؛ لا يثبت جاهزية أو هندسة أو مسارًا أو 360.' },
      { sourceId: kapDesignSourceId, classification: 'authoritative', statusAr: 'مصدر نية تصميم معتمد من المؤسس', noteAr: 'اعتماد المصدر يخص نية التصميم؛ مشتق Web3D تشخيصي مرشح وغير مسجل هندسيًا.' }
    ],
    owner: { organizationId: 'ORG-MAYADEEN-001', displayNameAr: 'مَيادين' },
    dateRange: { startAt: '2026-10-31T00:00:00.000+03:00', endAt: '2026-10-31T23:59:59.000+03:00', timeZone: 'Asia/Riyadh', assumption: true },
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    revision: 5,
    contentHash: 'PROJECT-v5-kap-founder-design-web3d-2026-08-02',
    sourceClassification: 'candidate-real',
    sourceStateAr: 'الحوكمة وCAD مصدران معتمدان · التشغيل غير مُقيّم · الهندسة والمعايرة والاعتماد التشغيلي غير متاحة',
    sourceReadiness: kapCandidateSpatialIntake.sourceReadiness,
    portfolioPresentation: {
      featured: true,
      coverUri: '/visual-direction/kap-cover-review.png',
      spatialCommandSummary: {
        experienceObjectCount: 5,
        openBlockerCount: 8,
        fieldEvidenceStatusAr: 'لقطة جرد ببيانات وصفية فقط: 195 صورة و6 فيديوهات'
      },
      designSceneEntry: {
        sceneAssetId: kapDesignAssetId,
        labelAr: 'استكشف التصميم ثلاثي الأبعاد',
        authorityStatusAr: 'مشتق تشخيصي مرشح'
      }
    }
  },
  {
    projectId: referenceExhibitionProjectId,
    organizationId: 'ORG-MAYADEEN-001',
    nameAr: 'معرض الآفاق المرجعي',
    nameEn: 'Horizons Reference Exhibition',
    description: 'مشروع مرجعي خيالي لاختبار إعادة استخدام المنصة وعزل سياق المشروع.',
    projectStatus: 'active',
    truthContext: 'temporary-demo',
    projectType: 'exhibition',
    eventIds: ['EVENT-EXHIBITION-DEMO-001'],
    venueIds: ['VENUE-EXHIBITION-DEMO-001'],
    defaultEventId: 'EVENT-EXHIBITION-DEMO-001',
    themeId: neutralFallbackEventTheme.themeId,
    operationalPackIds: ['EVENT-PACKAGE-EXHIBITION-DEMO'],
    sourceReferences: [{ sourceId: 'SOURCE-REFERENCE-EXHIBITION-001', classification: 'temporary-demo', statusAr: 'بيانات تجريبية مؤقتة', noteAr: 'خيالية بالكامل ولا تمثل مشروعًا حقيقيًا.' }],
    owner: { organizationId: 'ORG-MAYADEEN-001', displayNameAr: 'مختبر مَيادين المحلي' },
    dateRange: { startAt: '2026-08-20T08:00:00.000Z', endAt: '2026-08-24T22:00:00.000Z', timeZone: 'Asia/Riyadh', assumption: false },
    createdAt: '2026-07-12T08:00:00.000Z',
    updatedAt: '2026-07-12T09:00:00.000Z',
    revision: 1,
    contentHash: 'PROJECT-v1-reference-exhibition-001',
    sourceClassification: 'demo',
    sourceStateAr: 'حزمة مرجعية خيالية · لا بيانات حية'
  },
  {
    projectId: referenceConferenceProjectId,
    organizationId: 'ORG-MAYADEEN-001',
    nameAr: 'مؤتمر جسور المعرفة المرجعي',
    nameEn: 'Knowledge Bridges Reference Conference',
    description: 'مشروع مؤتمر مرجعي خيالي يثبت استقلال الفعالية والموقع والثيم.',
    projectStatus: 'paused',
    truthContext: 'temporary-demo',
    projectType: 'conference',
    eventIds: ['EVENT-CONFERENCE-DEMO-001'],
    venueIds: ['VENUE-CONFERENCE-DEMO-001'],
    defaultEventId: 'EVENT-CONFERENCE-DEMO-001',
    themeId: neutralFallbackEventTheme.themeId,
    operationalPackIds: ['EVENT-PACKAGE-CONFERENCE-DEMO'],
    sourceReferences: [{ sourceId: 'SOURCE-REFERENCE-CONFERENCE-001', classification: 'reference', statusAr: 'مرجع خيالي', noteAr: 'لا صلة له بمصادر KAP أو ثيمها.' }],
    owner: { organizationId: 'ORG-MAYADEEN-001', displayNameAr: 'مختبر مَيادين المحلي' },
    dateRange: { startAt: '2026-08-20T08:00:00.000Z', endAt: '2026-08-24T22:00:00.000Z', timeZone: 'Asia/Riyadh', assumption: false },
    createdAt: '2026-07-12T08:00:00.000Z',
    updatedAt: '2026-07-12T09:00:00.000Z',
    revision: 1,
    contentHash: 'PROJECT-v1-reference-conference-001',
    sourceClassification: 'reference',
    sourceStateAr: 'حزمة مرجعية خيالية · معزولة عن KAP'
  },
  {
    projectId: referenceFestivalProjectId,
    organizationId: 'ORG-MAYADEEN-001',
    nameAr: 'مهرجان الساحات المرجعي',
    nameEn: 'Plazas Reference Festival',
    description: 'مشروع مهرجان مرجعي مؤرشف لاختبار الحالة الآمنة للمشاريع غير المتاحة.',
    projectStatus: 'archived',
    truthContext: 'temporary-demo',
    projectType: 'festival',
    eventIds: ['EVENT-FESTIVAL-DEMO-001'],
    venueIds: ['VENUE-FESTIVAL-DEMO-001'],
    defaultEventId: 'EVENT-FESTIVAL-DEMO-001',
    themeId: neutralFallbackEventTheme.themeId,
    operationalPackIds: ['EVENT-PACKAGE-FESTIVAL-DEMO'],
    sourceReferences: [{ sourceId: 'SOURCE-REFERENCE-FESTIVAL-001', classification: 'reference', statusAr: 'مرجع مؤرشف', noteAr: 'ظاهر للمراجعة لكنه غير قابل للتفعيل.' }],
    owner: { organizationId: 'ORG-MAYADEEN-001', displayNameAr: 'مختبر مَيادين المحلي' },
    dateRange: { startAt: '2026-08-20T08:00:00.000Z', endAt: '2026-08-24T22:00:00.000Z', timeZone: 'Asia/Riyadh', assumption: false },
    createdAt: '2026-07-12T08:00:00.000Z',
    updatedAt: '2026-07-12T09:00:00.000Z',
    revision: 1,
    contentHash: 'PROJECT-v1-reference-festival-001',
    sourceClassification: 'reference',
    sourceStateAr: 'حزمة مرجعية مؤرشفة'
  },
  {
    projectId: localDemoProjectId,
    organizationId: 'ORG-MAYADEEN-001',
    nameAr: 'بيئة مَيادين التشغيلية التجريبية',
    nameEn: 'Mayadeen Local Operational Demo',
    description: 'مشروع ديمو صريح يحفظ قدرة العرض المحلية الموروثة داخل سياق مشروع مستقل.',
    projectStatus: 'active',
    truthContext: 'temporary-demo',
    projectType: 'other',
    eventIds: ['EVENT-DEMO-001'],
    venueIds: ['VENUE-DEMO-001'],
    defaultEventId: 'EVENT-DEMO-001',
    themeId: neutralFallbackEventTheme.themeId,
    operationalPackIds: [localDemoRuntimePackId],
    sourceReferences: [{ sourceId: 'SOURCE-MAYADEEN-LOCAL-DEMO-001', classification: 'temporary-demo', statusAr: 'بيانات عرض محلية موروثة', noteAr: 'خيالية، محلية، وغير مرتبطة بـ KAP أو ببيانات حية.' }],
    owner: { organizationId: 'ORG-MAYADEEN-001', displayNameAr: 'مختبر مَيادين المحلي' },
    dateRange: { startAt: null, endAt: null, timeZone: 'Asia/Riyadh', assumption: false },
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    revision: 1,
    contentHash: 'PROJECT-v1-mayadeen-local-demo-001',
    sourceClassification: 'demo',
    sourceStateAr: 'بيانات مؤقتة محلية · لا backend ولا بيانات حية'
  },
  {
    projectId: demoExperienceProjectId,
    organizationId: 'ORG-MAYADEEN-001',
    nameAr: 'تجربة الزائر العامة التجريبية',
    nameEn: 'Generic Visitor Experience Demo',
    description: 'مشروع ديمو صريح لحزمة Experience Intelligence العامة، منفصل عن KAP.',
    projectStatus: 'active',
    truthContext: 'temporary-demo',
    projectType: 'other',
    eventIds: ['EVENT-DEMO-EXPERIENCE-001'],
    venueIds: ['VENUE-DEMO-EXPERIENCE-001'],
    defaultEventId: 'EVENT-DEMO-EXPERIENCE-001',
    themeId: neutralFallbackEventTheme.themeId,
    operationalPackIds: ['EXPERIENCE-PACK-DEMO-001'],
    sourceReferences: [{ sourceId: 'SOURCE-EXPERIENCE-DEMO-001', classification: 'temporary-demo', statusAr: 'حزمة تجربة خيالية', noteAr: 'لا تمثل KAP أو مشروعًا حقيقيًا.' }],
    owner: { organizationId: 'ORG-MAYADEEN-001', displayNameAr: 'مختبر مَيادين المحلي' },
    dateRange: { startAt: null, endAt: null, timeZone: 'Asia/Riyadh', assumption: false },
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
    revision: 1,
    contentHash: 'PROJECT-v1-experience-demo-001',
    sourceClassification: 'demo',
    sourceStateAr: 'حزمة Experience Intelligence خيالية'
  },
  {
    projectId: referenceExperienceProjectId,
    organizationId: 'ORG-MAYADEEN-001',
    nameAr: 'تجربة مؤتمر مرجعية مستقلة',
    nameEn: 'Independent Conference Experience Reference',
    description: 'مشروع مرجعي يثبت أن محرك التجربة والثيم لا يتسربان بين الفعاليات.',
    projectStatus: 'paused',
    truthContext: 'temporary-demo',
    projectType: 'conference',
    eventIds: ['EVENT-CONFERENCE-TEST-001'],
    venueIds: ['VENUE-CONFERENCE-TEST-001'],
    defaultEventId: 'EVENT-CONFERENCE-TEST-001',
    themeId: neutralFallbackEventTheme.themeId,
    operationalPackIds: ['EXPERIENCE-PACK-CONFERENCE-TEST-001', conferenceExperienceTwinPackId],
    sourceReferences: [{ sourceId: 'SOURCE-EXPERIENCE-CONFERENCE-REFERENCE-001', classification: 'reference', statusAr: 'حزمة تجربة مرجعية', noteAr: 'مستقلة عن KAP وعن حزم runtime التشغيلية.' }],
    owner: { organizationId: 'ORG-MAYADEEN-001', displayNameAr: 'مختبر مَيادين المحلي' },
    dateRange: { startAt: null, endAt: null, timeZone: 'Asia/Riyadh', assumption: false },
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
    revision: 1,
    contentHash: 'PROJECT-v1-experience-conference-reference-001',
    sourceClassification: 'reference',
    sourceStateAr: 'حزمة Experience Intelligence مرجعية'
  }
];

const events: ProjectEventRecord[] = [
  { eventId: 'EVENT-KAP-OPENING-2026', projectId: kapProjectId, nameAr: 'حفل افتتاح وتدشين حدائق الملك عبدالله', nameEn: 'King Abdullah Parks Opening and Inauguration Ceremony', eventType: 'government-cultural-opening', venueIds: ['VENUE-KAP-001'], dateRange: projects[0]!.dateRange, runtimePackageId: null, experiencePackId: 'EXPERIENCE-PACK-KAP-OPENING-2026-CANDIDATE', experienceTwinPackId: kapExperienceTwinPackId, spatialCommandPackId: kapSpatialCommandConfigurationId, readinessPackId: kapReadinessPreparationPackId },
  { eventId: 'EVENT-EXHIBITION-DEMO-001', projectId: referenceExhibitionProjectId, nameAr: 'معرض الآفاق المؤقت', nameEn: 'Temporary Horizons Exhibition', eventType: 'exhibition', venueIds: ['VENUE-EXHIBITION-DEMO-001'], dateRange: projects[1]!.dateRange, runtimePackageId: 'EVENT-PACKAGE-EXHIBITION-DEMO', experiencePackId: null, spatialCommandPackId: null, readinessPackId: null },
  { eventId: 'EVENT-CONFERENCE-DEMO-001', projectId: referenceConferenceProjectId, nameAr: 'مؤتمر جسور المعرفة المؤقت', nameEn: 'Temporary Knowledge Bridges Conference', eventType: 'conference', venueIds: ['VENUE-CONFERENCE-DEMO-001'], dateRange: projects[2]!.dateRange, runtimePackageId: 'EVENT-PACKAGE-CONFERENCE-DEMO', experiencePackId: null, spatialCommandPackId: null, readinessPackId: null },
  { eventId: 'EVENT-FESTIVAL-DEMO-001', projectId: referenceFestivalProjectId, nameAr: 'مهرجان الساحات المؤقت', nameEn: 'Temporary Plazas Festival', eventType: 'festival', venueIds: ['VENUE-FESTIVAL-DEMO-001'], dateRange: projects[3]!.dateRange, runtimePackageId: 'EVENT-PACKAGE-FESTIVAL-DEMO', experiencePackId: null, spatialCommandPackId: null, readinessPackId: null },
  { eventId: 'EVENT-DEMO-001', projectId: localDemoProjectId, nameAr: 'فعالية مَيادين التجريبية المحلية', nameEn: 'Mayadeen Local Demo Event', eventType: 'local-operational-demo', venueIds: ['VENUE-DEMO-001'], dateRange: projects[4]!.dateRange, runtimePackageId: localDemoRuntimePackId, experiencePackId: null, spatialCommandPackId: null, readinessPackId: null },
  { eventId: 'EVENT-DEMO-EXPERIENCE-001', projectId: demoExperienceProjectId, nameAr: 'حزمة عرض تجربة عامة', nameEn: 'Generic Experience Demo', eventType: 'experience-demo', venueIds: ['VENUE-DEMO-EXPERIENCE-001'], dateRange: projects[5]!.dateRange, runtimePackageId: null, experiencePackId: 'EXPERIENCE-PACK-DEMO-001', spatialCommandPackId: null, readinessPackId: null },
  { eventId: 'EVENT-CONFERENCE-TEST-001', projectId: referenceExperienceProjectId, nameAr: 'مؤتمر تجربة مرجعي غير مرتبط', nameEn: 'Independent Experience Reference Conference', eventType: 'conference-reference', venueIds: ['VENUE-CONFERENCE-TEST-001'], dateRange: projects[6]!.dateRange, runtimePackageId: null, experiencePackId: 'EXPERIENCE-PACK-CONFERENCE-TEST-001', experienceTwinPackId: conferenceExperienceTwinPackId, spatialCommandPackId: null, readinessPackId: null }
];

const venues: ProjectVenueRecord[] = [
  { venueId: 'VENUE-KAP-001', projectId: kapProjectId, nameAr: 'حدائق الملك عبدالله', nameEn: 'King Abdullah Parks', cadSourceIds: ['SOURCE-KAP-DWG-PROVISIONAL-001'], geometryStatus: 'provisional' },
  { venueId: 'VENUE-EXHIBITION-DEMO-001', projectId: referenceExhibitionProjectId, nameAr: 'موقع معرض خيالي', nameEn: 'Fictional Exhibition Venue', cadSourceIds: [], geometryStatus: 'unavailable' },
  { venueId: 'VENUE-CONFERENCE-DEMO-001', projectId: referenceConferenceProjectId, nameAr: 'موقع مؤتمر خيالي', nameEn: 'Fictional Conference Venue', cadSourceIds: [], geometryStatus: 'unavailable' },
  { venueId: 'VENUE-FESTIVAL-DEMO-001', projectId: referenceFestivalProjectId, nameAr: 'موقع مهرجان خيالي', nameEn: 'Fictional Festival Venue', cadSourceIds: [], geometryStatus: 'unavailable' },
  { venueId: 'VENUE-DEMO-001', projectId: localDemoProjectId, nameAr: 'موقع العرض المحلي الخيالي', nameEn: 'Fictional Local Demo Venue', cadSourceIds: [], geometryStatus: 'unavailable' },
  { venueId: 'VENUE-DEMO-EXPERIENCE-001', projectId: demoExperienceProjectId, nameAr: 'موقع تجربة عام خيالي', nameEn: 'Fictional Generic Experience Venue', cadSourceIds: [], geometryStatus: 'unavailable' },
  { venueId: 'VENUE-CONFERENCE-TEST-001', projectId: referenceExperienceProjectId, nameAr: 'موقع مؤتمر تجربة مرجعي', nameEn: 'Reference Experience Conference Venue', cadSourceIds: [], geometryStatus: 'unavailable' }
];

const packs: ProjectOperationalPackRecord[] = [
  { packId: 'EXPERIENCE-PACK-KAP-OPENING-2026-CANDIDATE', projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', kind: 'experience' },
  { packId: kapExperienceTwinPackId, projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', kind: 'experience-twin' },
  { packId: kapSpatialCommandConfigurationId, projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', kind: 'spatial-command' },
  { packId: kapReadinessPreparationPackId, projectId: kapProjectId, eventId: 'EVENT-KAP-OPENING-2026', kind: 'readiness' },
  { packId: 'EVENT-PACKAGE-EXHIBITION-DEMO', projectId: referenceExhibitionProjectId, eventId: 'EVENT-EXHIBITION-DEMO-001', kind: 'event-runtime' },
  { packId: 'EVENT-PACKAGE-CONFERENCE-DEMO', projectId: referenceConferenceProjectId, eventId: 'EVENT-CONFERENCE-DEMO-001', kind: 'event-runtime' },
  { packId: 'EVENT-PACKAGE-FESTIVAL-DEMO', projectId: referenceFestivalProjectId, eventId: 'EVENT-FESTIVAL-DEMO-001', kind: 'event-runtime' },
  { packId: localDemoRuntimePackId, projectId: localDemoProjectId, eventId: 'EVENT-DEMO-001', kind: 'event-runtime' },
  { packId: 'EXPERIENCE-PACK-DEMO-001', projectId: demoExperienceProjectId, eventId: 'EVENT-DEMO-EXPERIENCE-001', kind: 'experience' },
  { packId: 'EXPERIENCE-PACK-CONFERENCE-TEST-001', projectId: referenceExperienceProjectId, eventId: 'EVENT-CONFERENCE-TEST-001', kind: 'experience' },
  { packId: conferenceExperienceTwinPackId, projectId: referenceExperienceProjectId, eventId: 'EVENT-CONFERENCE-TEST-001', kind: 'experience-twin' }
];

export const projectRegistry = new ProjectRegistry({
  projects,
  events,
  venues,
  packs,
  themes: eventThemePackages,
  fallbackTheme: neutralFallbackEventTheme
});

export const registeredProjectIds = projects.map((project) => project.projectId);
