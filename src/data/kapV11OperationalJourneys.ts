import { kapDigitalRehearsalPlan } from './digitalRehearsalPlans';
import { kapNovember1FounderTruthCorrection } from './kapNovember1FounderTruthCorrection';
import { deriveOperationalJourneyDuration, materializeOperationalJourneyCandidatePackage } from '../services/operationalJourneyCandidate';
import type { DeliverySourceInventoryRecord, OperationalDeliveryManifest } from '../types/experienceDelivery';
import type {
  OperationalCandidateTouchpoint,
  OperationalJourneyCandidatePlan,
  OperationalJourneyConflict,
  OperationalJourneyDurationClarification,
  OperationalJourneyGap,
  OperationalJourneyMovementMode,
  OperationalJourneyTravelLegCandidate,
  OperationalJourneyWaypointCandidate,
  OperationalJourneyWaypointKind,
  OperationalJourneyMappingStatus
} from '../types/operationalJourneyCandidate';

const PROJECT_ID = 'PROJECT-KAP-OPENING-2026';
const EVENT_ID = 'EVENT-KAP-OPENING-2026';
const VENUE_ID = 'VENUE-KAP-001';
const PACKAGE_ID = 'OPERATIONAL-DELIVERY-KAP-MAJED-V11-R1';
const SOURCE_ID = 'SOURCE-LOCAL-a5befcff7e2bb8b4';
const SOURCE_NAME = 'اقتراحات الدخول V.11.pdf';
const SOURCE_HASH = 'a5befcff7e2bb8b44c09123fe7fb730eec79bd57bd37398fa9a09753e55b5377';
const SOURCE_SIZE = 3_201_469;
const SOURCE_PAGES = 7;
const SOURCE_AUTHORITY = 'operational-team-supplied-working-candidate' as const;
const DURATION_CLARIFICATION_ID = 'FOUNDER-CLARIFICATION-KAP-V11-DURATION-INCLUSIVE-R1';

export const kapV11SourceExpectation = Object.freeze({
  sourceName: SOURCE_NAME,
  sourceHash: SOURCE_HASH,
  sourceByteSize: SOURCE_SIZE,
  sourcePageCount: SOURCE_PAGES
});

const entity = (number: number) => `ENTITY-KAP-OP-${String(number).padStart(3, '0')}`;
const trace = (page: number) => `TRACE-SOURCE-KAP-MAJED-V11-PAGE-${page}`;

const candidateTouchpointSpecs: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ['FAMILY-GARDEN', 'الحديقة العائلية', []],
  ['DEVONIAN-GARDEN', 'الحديقة الديفونية', []],
  ['MODERN-GARDEN', 'الحديقة الحديثة', ['حديقة الحياة الحديثة']],
  ['POLYNESIAN-GARDEN', 'الحديقة البوليسينية', []],
  ['OPTIONS-GARDEN', 'حديقة الخيارات', []],
  ['EXTERNAL-NATURE-GARDEN', 'الحديقة الطبيعية الخارجية', []]
];

export const kapV11CandidateTouchpoints: readonly OperationalCandidateTouchpoint[] = candidateTouchpointSpecs.map(([key, labelAr, aliasesAr]) => ({
  touchpointId: `TOUCHPOINT-KAP-${key}-CANDIDATE`,
  labelAr,
  aliasesAr: [...aliasesAr],
  classification: 'candidate-touchpoint',
  authorityStatus: SOURCE_AUTHORITY,
  spatialRegistrationStatus: 'unregistered',
  sourceTraceIds: [trace(2), trace(3), trace(4), trace(5), trace(6), trace(7)],
  conflictIds: key === 'MODERN-GARDEN' ? ['CONFLICT-KAP-V11-MODERN-GARDEN-TERMINOLOGY'] : []
}));

const touchpoint = (key: string) => `TOUCHPOINT-KAP-${key}-CANDIDATE`;

interface WaypointSpec {
  letter: string;
  labelAr: string;
  dwellMinutes?: number;
  semanticKind: OperationalJourneyWaypointKind;
  destinationIds?: string[];
  touchpointIds?: string[];
  mappingStatus?: OperationalJourneyMappingStatus;
  notesAr?: string[];
  incomingLegType?: OperationalJourneyTravelLegCandidate['legType'];
}

interface TravelSpec {
  legType: OperationalJourneyTravelLegCandidate['legType'];
  meters: number;
  seconds: number;
  mode: OperationalJourneyMovementMode;
  explicit: boolean;
}

function travelLegs(journeyId: string, page: number, specs: readonly TravelSpec[]): OperationalJourneyTravelLegCandidate[] {
  return specs.map((spec) => ({
    travelLegId: `${journeyId}-LEG-${spec.legType.toUpperCase()}`,
    journeyId,
    legType: spec.legType,
    distanceMeters: spec.meters,
    reportedDurationSeconds: spec.seconds,
    durationIncludedInJourneyTotal: true,
    movementMode: spec.mode,
    movementModeStatus: spec.explicit ? 'explicitly-reported' : 'not-explicitly-established',
    sourcePage: page,
    authorityStatus: SOURCE_AUTHORITY,
    spatialRegistrationStatus: 'unregistered'
  }));
}

function waypoints(journeyId: string, page: number, specs: readonly WaypointSpec[], legs: readonly OperationalJourneyTravelLegCandidate[]): OperationalJourneyWaypointCandidate[] {
  return specs.map((spec, index) => {
    const incoming = spec.incomingLegType
      ? legs.find((leg) => leg.legType === spec.incomingLegType) ?? null
      : index === 0 ? legs.find((leg) => leg.legType === 'entry') ?? null : null;
    const outgoing = index === specs.length - 1 ? legs.find((leg) => leg.legType === 'exit') ?? null : null;
    const destinationIds = spec.destinationIds ?? [];
    const touchpointIds = spec.touchpointIds ?? [];
    const mappingStatus = spec.mappingStatus
      ?? (destinationIds.length ? 'candidate-entity-relationship' : touchpointIds.length ? 'candidate-touchpoint' : 'unmapped-review-required');
    return {
      waypointId: `${journeyId}-WP-${spec.letter}`,
      journeyId,
      sourcePage: page,
      sourceLetter: spec.letter,
      sourceLabelAr: spec.labelAr,
      dwellMinutes: spec.dwellMinutes ?? null,
      semanticKind: spec.semanticKind,
      movementMode: incoming?.movementMode ?? 'not-applicable',
      incomingTravelLegId: incoming?.travelLegId ?? null,
      outgoingTravelLegId: outgoing?.travelLegId ?? null,
      destinationIds,
      touchpointIds,
      destinationMappingStatus: mappingStatus,
      sourceConfidence: 'high',
      authorityStatus: SOURCE_AUTHORITY,
      spatialRegistrationStatus: spec.semanticKind === 'service-action' || spec.semanticKind === 'program-moment' ? 'not-applicable' : 'unregistered',
      notesAr: spec.notesAr ?? []
    };
  });
}

function journey(input: {
  journeyId: string;
  dayId: string;
  date: string;
  page: number;
  labelAr: string;
  personaIds: string[];
  personaLabelsAr: string[];
  start: string;
  end: string;
  reportedTotalMinutes: number;
  originalSourceReportedTotalMinutes?: number;
  travel: TravelSpec[];
  waypointSpecs: WaypointSpec[];
  conflictIds?: string[];
  notesAr?: string[];
}): OperationalJourneyCandidatePlan {
  const legs = travelLegs(input.journeyId, input.page, input.travel);
  const points = waypoints(input.journeyId, input.page, input.waypointSpecs, legs);
  const base = {
    journeyId: input.journeyId,
    packageId: PACKAGE_ID,
    projectId: PROJECT_ID,
    eventId: EVENT_ID,
    venueId: VENUE_ID,
    dayId: input.dayId,
    date: input.date,
    labelAr: input.labelAr,
    personaIds: input.personaIds,
    personaLabelsAr: input.personaLabelsAr,
    sourceId: SOURCE_ID,
    sourcePage: input.page,
    sourceTraceId: trace(input.page),
    sourceRevision: 'V.11',
    sourceAuthority: SOURCE_AUTHORITY,
    candidateStatus: 'received-validated-working-candidate' as const,
    founderReview: 'pending' as const,
    operationalApproval: 'not-established' as const,
    routeApproval: 'not-established' as const,
    engineeringRegistration: 'not-established' as const,
    routeOverlayClassification: 'illustrative-unregistered-route-overlay' as const,
    reportedWindow: { start: input.start, end: input.end, timeZone: 'Asia/Riyadh' as const },
    originalSourceReportedTotalMinutes: input.originalSourceReportedTotalMinutes ?? input.reportedTotalMinutes,
    reportedTotalMinutes: input.reportedTotalMinutes,
    durationAccountingMode: 'inclusive' as const,
    durationClarificationId: DURATION_CLARIFICATION_ID,
    travelLegs: legs,
    waypoints: points,
    conflictIds: input.conflictIds ?? [],
    notesAr: input.notesAr ?? []
  };
  return { ...base, durationReconciliation: deriveOperationalJourneyDuration(base) };
}

const workersJourney = journey({
  journeyId: 'JOURNEY-KAP-20261031-WORKERS-V11', dayId: 'DAY-KAP-2026-10-31', date: '2026-10-31', page: 2,
  labelAr: '31 أكتوبر · العاملون', personaIds: ['PERSONA-KAP-EMPLOYEE-FAMILY'], personaLabelsAr: ['العاملون'], start: '14:30', end: '17:30', reportedTotalMinutes: 180,
  travel: [
    { legType: 'entry', meters: 450, seconds: 30, mode: 'car', explicit: true },
    { legType: 'internal-tour', meters: 1_400, seconds: 18 * 60, mode: 'walking', explicit: true },
    { legType: 'exit', meters: 400, seconds: 5 * 60, mode: 'walking', explicit: true }
  ],
  waypointSpecs: [
    { letter: 'A', labelAr: 'المدخل الرئيسي', dwellMinutes: 2, semanticKind: 'spatial-destination', destinationIds: [entity(1)] },
    { letter: 'B', labelAr: 'نقطة النزول', semanticKind: 'service-action', notesAr: ['نقطة خدمة غير مربوطة تلقائيًا بمرساة مكانية.'] },
    { letter: 'C', labelAr: 'الاستقبال والضيافة', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(2)] },
    { letter: 'D', labelAr: 'مجسم الحدائق', dwellMinutes: 2, semanticKind: 'spatial-destination', destinationIds: [entity(4)] },
    { letter: 'E', labelAr: 'ممر العصور', dwellMinutes: 10, semanticKind: 'spatial-destination', destinationIds: [entity(6)] },
    { letter: 'F', labelAr: 'الحديقة العائلية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('FAMILY-GARDEN')] },
    { letter: 'G', labelAr: 'الحديقة الديفونية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('DEVONIAN-GARDEN')] },
    { letter: 'H', labelAr: 'الحديقة الحديثة', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('MODERN-GARDEN')] },
    { letter: 'I', labelAr: 'ركن الذكريات', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(11)] },
    { letter: 'J', labelAr: 'الحديقة البوليسينية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('POLYNESIAN-GARDEN')] },
    { letter: 'K', labelAr: 'حديقة الخيارات', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('OPTIONS-GARDEN')] },
    { letter: 'L', labelAr: 'الجلسات والضيافة', dwellMinutes: 20, semanticKind: 'spatial-destination', destinationIds: [entity(8)] },
    { letter: 'M', labelAr: 'الصورة الأيقونية', dwellMinutes: 20, semanticKind: 'program-moment', notesAr: ['لحظة برنامج غير مربوطة تلقائيًا بكيان المؤتمر الصحفي أو الصورة التذكارية.'] },
    { letter: 'N', labelAr: 'تسليم الهدايا', dwellMinutes: 5, semanticKind: 'service-action' },
    { letter: 'O', labelAr: 'رحلة الحديقة الطبيعية الخارجية', dwellMinutes: 25, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('EXTERNAL-NATURE-GARDEN')] }
  ],
  notesAr: ['يذكر المصدر توزيع العاملين على مجموعات دون عدد المجموعات أو سعتها.']
});

const mayorJourney = journey({
  journeyId: 'JOURNEY-KAP-20261031-MAYOR-V11', dayId: 'DAY-KAP-2026-10-31', date: '2026-10-31', page: 3,
  labelAr: '31 أكتوبر · الأمين', personaIds: ['PERSONA-KAP-HOST-ORGANIZER'], personaLabelsAr: ['الأمين'], start: '18:00', end: '20:04', reportedTotalMinutes: 124,
  travel: [
    { legType: 'entry', meters: 450, seconds: 30, mode: 'car', explicit: true },
    { legType: 'internal-tour', meters: 1_400, seconds: 18 * 60, mode: 'walking', explicit: true },
    { legType: 'exit', meters: 970, seconds: 4 * 60, mode: 'unknown', explicit: false }
  ],
  waypointSpecs: [
    { letter: 'A', labelAr: 'المدخل الرئيسي', semanticKind: 'spatial-destination', destinationIds: [entity(1)] },
    { letter: 'B', labelAr: 'نقطة النزول', semanticKind: 'service-action' },
    { letter: 'C', labelAr: 'الاستقبال والضيافة', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(2)] },
    { letter: 'D', labelAr: 'مجسم الحدائق', dwellMinutes: 2, semanticKind: 'spatial-destination', destinationIds: [entity(4)] },
    { letter: 'E', labelAr: 'ممر العصور', dwellMinutes: 10, semanticKind: 'spatial-destination', destinationIds: [entity(6)] },
    { letter: 'F', labelAr: 'الحديقة العائلية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('FAMILY-GARDEN')] },
    { letter: 'G', labelAr: 'الحديقة الديفونية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('DEVONIAN-GARDEN')] },
    { letter: 'H', labelAr: 'الحديقة الحديثة', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('MODERN-GARDEN')] },
    { letter: 'I', labelAr: 'ركن الذكريات', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(11)] },
    { letter: 'J', labelAr: 'الحديقة البوليسينية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('POLYNESIAN-GARDEN')] },
    { letter: 'K', labelAr: 'حديقة الخيارات', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('OPTIONS-GARDEN')] },
    { letter: 'L', labelAr: 'الصورة الأيقونية', dwellMinutes: 20, semanticKind: 'program-moment' }
  ],
  conflictIds: ['CONFLICT-KAP-V11-MOVEMENT-MODE-MISSING']
});

const leadershipJourney = journey({
  journeyId: 'JOURNEY-KAP-20261102-LEADERSHIP-V11', dayId: 'DAY-KAP-2026-11-02', date: '2026-11-02', page: 4,
  labelAr: '2 نوفمبر · القيادة', personaIds: ['PERSONA-KAP-REGIONAL-LEADERSHIP', 'PERSONA-KAP-HOST-ORGANIZER'], personaLabelsAr: ['أمير منطقة الرياض', 'نائب أمير المنطقة', 'الأمين'], start: '18:00', end: '19:30', reportedTotalMinutes: 90,
  travel: [
    { legType: 'entry', meters: 1_100, seconds: 5 * 60, mode: 'unknown', explicit: false },
    { legType: 'internal-tour', meters: 2_450, seconds: 15 * 60, mode: 'golf-cart', explicit: true },
    { legType: 'exit', meters: 950, seconds: 4 * 60, mode: 'unknown', explicit: false }
  ],
  waypointSpecs: [
    { letter: 'A', labelAr: 'المدخل الرئيسي', semanticKind: 'spatial-destination', destinationIds: [entity(1)] },
    { letter: 'B', labelAr: 'الاستقبال والعرضة السعودية ومجسم الحدائق والنصب التذكاري', dwellMinutes: 30, semanticKind: 'compound-program-moment', destinationIds: [entity(2), entity(4), entity(5)], notesAr: ['العرضة السعودية لحظة برنامج غير مربوطة تلقائيًا بمرساة.'] },
    { letter: 'C', labelAr: 'حديقة الخيارات', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('OPTIONS-GARDEN')] },
    { letter: 'D', labelAr: 'الحديقة البوليسينية', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('POLYNESIAN-GARDEN')] },
    { letter: 'E', labelAr: 'ممر العصور', dwellMinutes: 6, semanticKind: 'spatial-destination', destinationIds: [entity(6)] },
    { letter: 'F', labelAr: 'الحديقة العائلية', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('FAMILY-GARDEN')] },
    { letter: 'G', labelAr: 'الحديقة الديفونية', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('DEVONIAN-GARDEN')] },
    { letter: 'H', labelAr: 'الحديقة الحديثة · نهاية الجولة', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('MODERN-GARDEN')] }
  ],
  conflictIds: ['CONFLICT-KAP-V11-MOVEMENT-MODE-MISSING']
});

const guestsJourney = journey({
  journeyId: 'JOURNEY-KAP-20261102-GUESTS-V11', dayId: 'DAY-KAP-2026-11-02', date: '2026-11-02', page: 5,
  labelAr: '2 نوفمبر · الضيوف', personaIds: ['PERSONA-KAP-ROYAL-VIP'], personaLabelsAr: ['الضيوف'], start: '18:00', end: '19:30', reportedTotalMinutes: 90,
  travel: [
    { legType: 'entry', meters: 450, seconds: 30, mode: 'car', explicit: true },
    { legType: 'entry-transfer', meters: 420, seconds: 3 * 60, mode: 'golf-cart', explicit: true },
    { legType: 'internal-tour', meters: 1_400, seconds: 10 * 60, mode: 'golf-cart', explicit: true },
    { legType: 'exit', meters: 420, seconds: 3 * 60, mode: 'golf-cart', explicit: true }
  ],
  waypointSpecs: [
    { letter: 'A', labelAr: 'المدخل الرئيسي', semanticKind: 'spatial-destination', destinationIds: [entity(1)] },
    { letter: 'B', labelAr: 'نقطة النزول وركوب عربات الجولف', semanticKind: 'service-action', incomingLegType: 'entry-transfer' },
    { letter: 'C', labelAr: 'الاستقبال والعرضة السعودية ومجسم الحدائق والنصب التذكاري', dwellMinutes: 30, semanticKind: 'compound-program-moment', destinationIds: [entity(2), entity(4), entity(5)], notesAr: ['العرضة السعودية لحظة برنامج غير مربوطة تلقائيًا بمرساة.'] },
    { letter: 'D', labelAr: 'حديقة الخيارات', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('OPTIONS-GARDEN')] },
    { letter: 'E', labelAr: 'الحديقة البوليسينية', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('POLYNESIAN-GARDEN')] },
    { letter: 'F', labelAr: 'ممر العصور', dwellMinutes: 6, semanticKind: 'spatial-destination', destinationIds: [entity(6)] },
    { letter: 'G', labelAr: 'الحديقة العائلية', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('FAMILY-GARDEN')] },
    { letter: 'H', labelAr: 'الحديقة الديفونية', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('DEVONIAN-GARDEN')] },
    { letter: 'I', labelAr: 'حديقة الحياة الحديثة', dwellMinutes: 6, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('MODERN-GARDEN')], notesAr: ['الاسم يختلف عن «الحديقة الحديثة» في الصفحات الأخرى.'] },
    { letter: 'J', labelAr: 'نقطة نهاية الرحلة', semanticKind: 'unresolved-touchpoint', mappingStatus: 'unmapped-review-required' },
    { letter: 'K', labelAr: 'تسليم الهدايا', dwellMinutes: 5, semanticKind: 'service-action' }
  ],
  conflictIds: ['CONFLICT-KAP-V11-MODERN-GARDEN-TERMINOLOGY']
});

const hostMinisterJourney = journey({
  journeyId: 'JOURNEY-KAP-20261103-HOST-MINISTER-V11', dayId: 'DAY-KAP-2026-11-03', date: '2026-11-03', page: 6,
  labelAr: '3 نوفمبر · الأمين ووزير الإعلام', personaIds: ['PERSONA-KAP-HOST-ORGANIZER', 'PERSONA-KAP-REGIONAL-LEADERSHIP'], personaLabelsAr: ['الأمين', 'وزير الإعلام'], start: '18:00', end: '21:35', reportedTotalMinutes: 215,
  travel: [
    { legType: 'entry', meters: 450, seconds: 30, mode: 'car', explicit: true },
    { legType: 'internal-tour', meters: 1_750, seconds: 20 * 60, mode: 'walking', explicit: true },
    { legType: 'exit', meters: 950, seconds: 4 * 60, mode: 'unknown', explicit: false }
  ],
  waypointSpecs: [
    { letter: 'A', labelAr: 'المدخل الرئيسي', semanticKind: 'spatial-destination', destinationIds: [entity(1)] },
    { letter: 'B', labelAr: 'نقطة النزول', semanticKind: 'service-action' },
    { letter: 'C', labelAr: 'الاستقبال والضيافة', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(2)] },
    { letter: 'D', labelAr: 'مجسم الحدائق والنصب التذكاري', dwellMinutes: 3, semanticKind: 'compound-program-moment', destinationIds: [entity(4), entity(5)] },
    { letter: 'E', labelAr: 'ممر العصور', dwellMinutes: 10, semanticKind: 'spatial-destination', destinationIds: [entity(6)] },
    { letter: 'F', labelAr: 'الحديقة العائلية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('FAMILY-GARDEN')] },
    { letter: 'G', labelAr: 'الحديقة الديفونية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('DEVONIAN-GARDEN')] },
    { letter: 'H', labelAr: 'الحديقة الحديثة', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('MODERN-GARDEN')] },
    { letter: 'I', labelAr: 'ركن الذكريات', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(11)] },
    { letter: 'J', labelAr: 'الحديقة البوليسينية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('POLYNESIAN-GARDEN')] },
    { letter: 'K', labelAr: 'حديقة الخيارات', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('OPTIONS-GARDEN')] },
    { letter: 'L', labelAr: 'المؤتمر الصحفي', dwellMinutes: 60, semanticKind: 'spatial-destination', destinationIds: [entity(9)] },
    { letter: 'M', labelAr: 'العشاء', dwellMinutes: 30, semanticKind: 'spatial-destination', destinationIds: [entity(7)] },
    { letter: 'N', labelAr: 'منطقة كبار الشخصيات', dwellMinutes: 20, semanticKind: 'spatial-destination', destinationIds: [entity(10)] }
  ],
  conflictIds: ['CONFLICT-KAP-V11-MOVEMENT-MODE-MISSING']
});

const mediaJourney = journey({
  journeyId: 'JOURNEY-KAP-20261103-MEDIA-V11', dayId: 'DAY-KAP-2026-11-03', date: '2026-11-03', page: 7,
  labelAr: '3 نوفمبر · الإعلام', personaIds: ['PERSONA-KAP-MEDIA-CONTENT'], personaLabelsAr: ['الإعلاميون'], start: '17:00', end: '21:35', reportedTotalMinutes: 275, originalSourceReportedTotalMinutes: 255,
  travel: [
    { legType: 'entry', meters: 450, seconds: 30, mode: 'car', explicit: true },
    { legType: 'internal-tour', meters: 1_550, seconds: 18 * 60, mode: 'walking', explicit: true },
    { legType: 'exit', meters: 300, seconds: 3 * 60, mode: 'unknown', explicit: false }
  ],
  waypointSpecs: [
    { letter: 'A', labelAr: 'المدخل الرئيسي', semanticKind: 'spatial-destination', destinationIds: [entity(1)] },
    { letter: 'B', labelAr: 'نقطة النزول', semanticKind: 'service-action' },
    { letter: 'C', labelAr: 'الاستقبال والضيافة', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(2)] },
    { letter: 'D', labelAr: 'مجسم الحدائق', dwellMinutes: 2, semanticKind: 'spatial-destination', destinationIds: [entity(4)] },
    { letter: 'E', labelAr: 'ممر العصور', dwellMinutes: 10, semanticKind: 'spatial-destination', destinationIds: [entity(6)] },
    { letter: 'F', labelAr: 'الحديقة العائلية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('FAMILY-GARDEN')] },
    { letter: 'G', labelAr: 'الحديقة الديفونية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('DEVONIAN-GARDEN')] },
    { letter: 'H', labelAr: 'الحديقة الحديثة', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('MODERN-GARDEN')] },
    { letter: 'I', labelAr: 'ركن الذكريات', dwellMinutes: 5, semanticKind: 'spatial-destination', destinationIds: [entity(11)] },
    { letter: 'J', labelAr: 'الحديقة البوليسينية', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('POLYNESIAN-GARDEN')] },
    { letter: 'K', labelAr: 'حديقة الخيارات', dwellMinutes: 12, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('OPTIONS-GARDEN')] },
    { letter: 'L', labelAr: 'المؤتمر الصحفي', dwellMinutes: 60, semanticKind: 'spatial-destination', destinationIds: [entity(9)] },
    { letter: 'M', labelAr: 'منطقة الضيافة', dwellMinutes: 60, semanticKind: 'spatial-destination', destinationIds: [entity(8)] },
    { letter: 'N', labelAr: 'منطقة العشاء', dwellMinutes: 30, semanticKind: 'spatial-destination', destinationIds: [entity(7)] },
    { letter: 'O', labelAr: 'توزيع الهدايا', dwellMinutes: 5, semanticKind: 'service-action' },
    { letter: 'P', labelAr: 'الرحلة الخارجية للحديقة الطبيعية', dwellMinutes: 25, semanticKind: 'unresolved-touchpoint', touchpointIds: [touchpoint('EXTERNAL-NATURE-GARDEN')] }
  ],
  conflictIds: ['CONFLICT-KAP-V11-MOVEMENT-MODE-MISSING'],
  notesAr: ['الإجمالي 275 دقيقة مثبت كتوضيح مؤسس؛ القراءة السابقة 255 دقيقة محفوظة في سجل التشخيص ولا تمثل حاجبًا نشطًا.']
});

const journeys = [workersJourney, mayorJourney, leadershipJourney, guestsJourney, hostMinisterJourney, mediaJourney];

export const kapV11DurationClarification: OperationalJourneyDurationClarification = {
  clarificationId: DURATION_CLARIFICATION_ID,
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  effectiveDate: '2026-08-02',
  recordedAt: '2026-08-02T00:00:00+03:00',
  timeTrust: 'founder-directed-date',
  authorityType: 'founder-product-authority',
  authorityReferenceId: 'FOUNDER-DIRECTIVE-KAP-V11-INCLUSIVE-DURATION',
  approvedBy: 'Ahmed',
  approvalScope: 'candidate-duration-accounting',
  sourceRevision: 'V.11',
  durationAccountingMode: 'inclusive',
  affectedJourneyIds: journeys.map((item) => item.journeyId),
  resolvedConflictIds: [
    'CONFLICT-KAP-V11-WORKERS-DURATION-BUFFER',
    'CONFLICT-KAP-V11-MAYOR-DURATION-OVERLAP',
    'CONFLICT-KAP-V11-GUESTS-DURATION-BUFFER',
    'CONFLICT-KAP-V11-HOST-MINISTER-DURATION-OVERLAP',
    'CONFLICT-KAP-V11-MEDIA-TOTAL-VS-WINDOW',
    'CONFLICT-KAP-V11-MEDIA-CALCULATED-DURATION'
  ],
  resolvedGapIds: ['DURATION-ACCOUNTING-RULE-REQUIRED', 'GAP-KAP-V11-MEDIA-DURATION-CONFIRMATION'],
  previousDiagnosticAr: 'حُفظت قراءة 255 دقيقة والجمع التسلسلي 283.5 دقيقة وفرق 8.5 دقيقة عن النافذة كتشخيص سابق غير فعّال.',
  founderClarificationAr: 'الإجمالي المبلّغ يمثل الرحلة كاملة، ومدد الحركة داخلة فيه ولا تُضاف مرة أخرى إلى مدد المحطات. مقطع 450 متر و30 ثانية يتم بالسيارة.',
  legalProjectionAr: 'تُسجل رحلة الإعلام عند 275 دقيقة، مطابقة لنافذة 17:00–21:35، وتبقى مكونات التوقف والحركة وصفية داخل الغلاف الزمني الشامل.',
  limitationsAr: [
    'لا يثبت التوضيح هندسة المسار أو التسجيل الإحداثي أو السلامة أو السعة.',
    'لا يحول المسافة والمدة إلى سرعة تشغيل معتمدة.',
    'لا ينشئ اعتماد HSE أو اعتماد عميل أو جاهزية تشغيلية.'
  ]
};

function openConflict(
  conflictId: string,
  titleAr: string,
  detailAr: string,
  severity: OperationalJourneyConflict['severity'],
  journeyIds: string[],
  sourceTraceIds: string[],
  requiredResolverAr: string
): OperationalJourneyConflict {
  return { conflictId, titleAr, detailAr, severity, journeyIds, sourceTraceIds, status: 'open', requiredResolverAr, resolutionId: null, resolutionAr: null };
}

function resolvedDurationConflict(
  conflictId: string,
  titleAr: string,
  detailAr: string,
  severity: OperationalJourneyConflict['severity'],
  journeyIds: string[],
  sourceTraceIds: string[]
): OperationalJourneyConflict {
  return {
    conflictId,
    titleAr,
    detailAr,
    severity,
    journeyIds,
    sourceTraceIds,
    status: 'resolved-by-founder-clarification',
    requiredResolverAr: 'مغلق بتوضيح المؤسس لمحاسبة المدة',
    resolutionId: DURATION_CLARIFICATION_ID,
    resolutionAr: 'resolved-by-inclusive-duration-accounting'
  };
}

export const kapV11JourneyConflicts: readonly OperationalJourneyConflict[] = [
  openConflict('CONFLICT-KAP-V11-MOVEMENT-MODE-MISSING', 'وسائل حركة الخروج أو الدخول غير مثبتة', 'بعض الأرجل تسجل مسافة ومدة بلا وسيلة حركة صريحة.', 'warning', [mayorJourney.journeyId, leadershipJourney.journeyId, hostMinisterJourney.journeyId, mediaJourney.journeyId], [trace(3), trace(4), trace(6), trace(7)], 'مالك المسار'),
  openConflict('CONFLICT-KAP-V11-MODERN-GARDEN-TERMINOLOGY', 'الحديقة الحديثة مقابل حديقة الحياة الحديثة', 'تستخدم صفحة الضيوف اسم «حديقة الحياة الحديثة»، بينما تستخدم الصفحات الأخرى «الحديقة الحديثة».', 'warning', [workersJourney.journeyId, mayorJourney.journeyId, leadershipJourney.journeyId, guestsJourney.journeyId, hostMinisterJourney.journeyId, mediaJourney.journeyId], [trace(2), trace(3), trace(4), trace(5), trace(6), trace(7)], 'مالك المحتوى والمصدر')
];

export const kapV11ResolvedJourneyConflicts: readonly OperationalJourneyConflict[] = [
  resolvedDurationConflict('CONFLICT-KAP-V11-WORKERS-DURATION-BUFFER', 'فاصل حسابي سابق في رحلة العاملين', 'الجمع التسلسلي السابق 177.5 دقيقة مقابل إجمالي شامل 180 دقيقة؛ ليس حاجبًا نشطًا.', 'warning', [workersJourney.journeyId], [trace(2)]),
  resolvedDurationConflict('CONFLICT-KAP-V11-MAYOR-DURATION-OVERLAP', 'تداخل حسابي سابق في رحلة الأمين', 'الجمع التسلسلي السابق 124.5 دقيقة مقابل إجمالي شامل 124 دقيقة؛ ليس حاجبًا نشطًا.', 'warning', [mayorJourney.journeyId], [trace(3)]),
  resolvedDurationConflict('CONFLICT-KAP-V11-GUESTS-DURATION-BUFFER', 'فاصل حسابي سابق في رحلة الضيوف', 'الجمع التسلسلي السابق 87.5 دقيقة مقابل إجمالي شامل 90 دقيقة؛ ليس حاجبًا نشطًا.', 'warning', [guestsJourney.journeyId], [trace(5)]),
  resolvedDurationConflict('CONFLICT-KAP-V11-HOST-MINISTER-DURATION-OVERLAP', 'تداخل حسابي سابق في رحلة الأمين ووزير الإعلام', 'الجمع التسلسلي السابق 217.5 دقيقة مقابل إجمالي شامل 215 دقيقة؛ ليس حاجبًا نشطًا.', 'warning', [hostMinisterJourney.journeyId], [trace(6)]),
  resolvedDurationConflict('CONFLICT-KAP-V11-MEDIA-TOTAL-VS-WINDOW', 'قراءة 255 مقابل نافذة 275 دقيقة', 'حُفظت القراءة السابقة 255 دقيقة؛ القيمة المرشحة الحالية 275 دقيقة وتطابق نافذة 17:00–21:35.', 'blocking', [mediaJourney.journeyId], [trace(7)]),
  resolvedDurationConflict('CONFLICT-KAP-V11-MEDIA-CALCULATED-DURATION', 'فرق الجمع التسلسلي السابق 8.5 دقيقة', 'الجمع السابق 283.5 دقيقة لمكونات قد تتداخل داخل الغلاف الشامل؛ فرق 8.5 دقيقة محفوظ تاريخيًا وغير فعّال.', 'blocking', [mediaJourney.journeyId], [trace(7)])
];

export const kapV11OperationalGaps: readonly OperationalJourneyGap[] = [
  ['ROUTE-APPROVAL-AUTHORITY', 'جهة اعتماد المسار', true, 'سلطة المسار'],
  ['ROUTE-OWNER', 'مالك مسار مسمى', true, 'التشغيل'],
  ['ROUTE-CONTROLLER', 'متحكم مسار مسمى', true, 'التشغيل'],
  ['GATE-IDS', 'معرّفات البوابات', true, 'الموقع والهندسة'],
  ['EDITABLE-ROUTE-SOURCE', 'مصدر مسار قابل للتحرير', true, 'الهندسة'],
  ['CAD-REVISION-RELATIONSHIP', 'علاقة مراجعة CAD', true, 'الهندسة'],
  ['COORDINATE-REGISTRATION', 'التسجيل الإحداثي', true, 'الهندسة'],
  ['NORTH-CONTROL-POINTS', 'الشمال ونقاط الضبط', true, 'الهندسة والمساحة'],
  ['ROUTE-CAPACITIES', 'سعات المسارات', true, 'التشغيل وHSE'],
  ['GROUP-SIZES', 'أحجام المجموعات', true, 'التشغيل'],
  ['GOLF-CART-FLEET', 'عدد وسعة عربات الجولف', true, 'النقل'],
  ['BOARDING-DURATION', 'مدة الصعود', false, 'النقل'],
  ['ACCESSIBILITY-ROUTE', 'مسار الإتاحة', true, 'الإتاحة وHSE'],
  ['EMERGENCY-ROUTE', 'مسار الطوارئ', true, 'HSE'],
  ['EVACUATION-INTERACTION', 'التفاعل مع الإخلاء', true, 'HSE'],
  ['HSE-REVIEW', 'مراجعة HSE', true, 'HSE'],
  ['SECURITY-REVIEW', 'المراجعة الأمنية', true, 'الأمن'],
  ['PROTOCOL-APPROVAL', 'اعتماد المراسم', true, 'المراسم'],
  ['ALTERNATIVE-ROUTE', 'مسار بديل', true, 'التشغيل وHSE'],
  ['WEATHER-CONTINGENCY', 'خطة طقس بديلة', true, 'التشغيل وHSE'],
  ['DELAY-TOLERANCE', 'حدود تحمل التأخير', false, 'البرنامج'],
  ['EVIDENCE-REQUIREMENTS', 'قواعد الأدلة', true, 'التحقق'],
  ['CHECKPOINT-OWNERS', 'ملاك نقاط التحقق', true, 'التشغيل'],
  ['COMMUNICATIONS-PLAN', 'خطة الاتصالات', true, 'التشغيل والأمن']
].map(([key, labelAr, blocking, requiredAuthorityAr]) => ({ gapId: `GAP-KAP-V11-${key}`, labelAr, blocking, requiredAuthorityAr, status: 'open', resolutionId: null, resolutionAr: null })) as OperationalJourneyGap[];

export const kapV11ResolvedOperationalGaps: readonly OperationalJourneyGap[] = [
  {
    gapId: 'DURATION-ACCOUNTING-RULE-REQUIRED',
    labelAr: 'قاعدة محاسبة مدة الرحلة',
    blocking: false,
    requiredAuthorityAr: 'المؤسس',
    status: 'resolved-by-founder-clarification',
    resolutionId: DURATION_CLARIFICATION_ID,
    resolutionAr: 'اعتماد نمط inclusive لجميع رحلات V.11 الست.'
  },
  {
    gapId: 'GAP-KAP-V11-MEDIA-DURATION-CONFIRMATION',
    labelAr: 'تأكيد مدة رحلة إعلام 3 نوفمبر',
    blocking: false,
    requiredAuthorityAr: 'المؤسس',
    status: 'resolved-by-founder-clarification',
    resolutionId: DURATION_CLARIFICATION_ID,
    resolutionAr: 'الإجمالي المرشح 275 دقيقة ويطابق نافذة 17:00–21:35.'
  }
];

const sourceInventory: DeliverySourceInventoryRecord = {
  sourceRecordId: SOURCE_ID,
  localOpaqueSourceId: 'LOCAL-SOURCE-a5befcff7e2bb8b4',
  originalFilename: SOURCE_NAME,
  safeDisplayFilename: SOURCE_NAME,
  sourceType: 'pdf',
  mimeType: 'application/pdf',
  byteSize: SOURCE_SIZE,
  sha256: SOURCE_HASH,
  fingerprintState: 'verified',
  sourceOwner: 'operations-workstream',
  suppliedBy: 'Majed Qasim',
  suppliedAt: null,
  revision: 'V.11',
  claimedApprovalStatus: 'working-candidate',
  verifiedAuthorityStatus: SOURCE_AUTHORITY,
  confidentialityClassification: 'internal',
  retentionClassification: 'project-record-candidate',
  relevantDayIds: [...new Set(journeys.map((item) => item.dayId))],
  relevantPersonaIds: [...new Set(journeys.flatMap((item) => item.personaIds))],
  relevantDestinationIds: [...new Set(journeys.flatMap((item) => item.waypoints.flatMap((waypoint) => waypoint.destinationIds)))],
  relevantWorkstreamIds: ['WORKSTREAM-KAP-OPERATIONS'],
  extractionStatus: 'structured-preview-ready',
  conflictStatus: 'unresolved',
  acceptanceStatus: 'awaiting-founder-review',
  modifiedAtReported: '2026-08-01T22:07:00+03:00',
  pathDisclosure: 'redacted'
};

export const kapV11OperationalDeliveryManifest: OperationalDeliveryManifest = {
  schemaVersion: '1.0.0',
  manifestId: PACKAGE_ID,
  sourceId: SOURCE_ID,
  filename: SOURCE_NAME,
  hash: SOURCE_HASH,
  size: SOURCE_SIZE,
  revision: 11,
  authority: SOURCE_AUTHORITY,
  approvalStatus: 'candidate',
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  day: null,
  persona: sourceInventory.relevantPersonaIds,
  schedule: journeys.map((item) => ({
    scheduleEntryId: `SCHEDULE-${item.journeyId}`,
    dayId: item.dayId,
    personaIds: item.personaIds,
    momentId: null,
    startsAtReported: `${item.date}T${item.reportedWindow.start}:00+03:00`,
    endsAtReported: `${item.date}T${item.reportedWindow.end}:00+03:00`,
    timeZone: 'Asia/Riyadh',
    status: item.durationReconciliation.blockingConflict ? 'conflicting' : 'candidate',
    sourceTraceIds: [item.sourceTraceId]
  })),
  routeCandidate: journeys.map((item) => ({
    routeCandidateId: item.journeyId,
    dayId: item.dayId,
    personaIds: item.personaIds,
    destinationIds: [...new Set(item.waypoints.flatMap((waypoint) => waypoint.destinationIds))],
    status: item.durationReconciliation.blockingConflict ? 'conflicting' : 'candidate',
    geometryStatus: 'source-reference-only',
    sourceTraceIds: [item.sourceTraceId]
  })),
  destinationIds: sourceInventory.relevantDestinationIds,
  owner: null,
  responsibleParty: null,
  verificationAuthority: null,
  approvalAuthority: null,
  evidenceRule: [],
  dependency: kapV11OperationalGaps.map((gap) => gap.labelAr),
  restriction: [
    'لا تحويل إلى SpatialRoute قبل مصدر هندسي قابل للتحرير وسلطة مسار.',
    'تفاصيل المسار التشغيلي محجوبة افتراضيًا عن عرض العميل.',
    'لا تغير الحزمة الجاهزية أو القرار أو البروفة المجمدة.'
  ],
  conflict: kapV11JourneyConflicts.map((conflict) => ({
    conflictId: conflict.conflictId,
    summaryAr: conflict.titleAr,
    status: 'open',
    sourceTraceIds: conflict.sourceTraceIds
  })),
  notes: [
    'ست رحلات مرشحة مستخرجة بشريًا من الصفحات 2–7 بعد تحقق البصمة والفحص البصري.',
    'محاسبة المدة شاملة: الحركة والتوقف مكونات داخل الإجمالي ولا تُجمع فوقه.',
    'لا يمثل رقم V.11 سلطة استبدال تلقائية لـ V.02.'
  ],
  sourceInventory
};

export const kapV11OperationalJourneyPackage = materializeOperationalJourneyCandidatePackage({
  schemaVersion: '1.0.0',
  packageId: PACKAGE_ID,
  projectId: PROJECT_ID,
  eventId: EVENT_ID,
  venueId: VENUE_ID,
  sourceId: SOURCE_ID,
  sourceName: SOURCE_NAME,
  sourceHash: SOURCE_HASH,
  sourceByteSize: SOURCE_SIZE,
  sourcePageCount: SOURCE_PAGES,
  sourceAuthority: SOURCE_AUTHORITY,
  packageStatus: 'received-validated-working-candidate',
  intakeState: 'awaiting-founder-review',
  fingerprintStatus: 'verified',
  founderReview: 'pending',
  operationalApproval: 'not-established',
  routeApproval: 'not-established',
  canonicalSpatialRouteCount: 0,
  rawSourceRetention: 'private-local-outside-git',
  browserPathDisclosure: 'redacted',
  routeOverlayClassification: 'illustrative-unregistered-route-overlay',
  sourceMetadata: {
    producer: 'macOS 15.6 Quartz PDFContext',
    createdAtReported: '2026-08-01T22:07:00+03:00',
    modifiedAtReported: '2026-08-01T22:07:00+03:00',
    pdfVersion: '1.4',
    encrypted: false,
    pageSizePoints: { width: 1_152, height: 648 }
  },
  manifest: kapV11OperationalDeliveryManifest,
  journeys,
  candidateTouchpoints: [...kapV11CandidateTouchpoints],
  conflicts: [...kapV11JourneyConflicts],
  resolvedConflicts: [...kapV11ResolvedJourneyConflicts],
  gaps: [...kapV11OperationalGaps],
  resolvedGaps: [...kapV11ResolvedOperationalGaps],
  durationClarifications: [kapV11DurationClarification],
  truthCorrectionRevisions: [kapNovember1FounderTruthCorrection],
  dayScopes: [
    {
      dayId: 'DAY-KAP-2026-10-31', date: '2026-10-31', labelAr: '31 أكتوبر', sourceScopeStatus: 'covered-by-package', correctionRevisionId: null,
      operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false,
      contextRelationship: 'single-event-context'
    },
    {
      dayId: 'DAY-KAP-2026-11-01', date: '2026-11-01', labelAr: '1 نوفمبر', sourceScopeStatus: 'not-applicable-by-founder-direction', correctionRevisionId: kapNovember1FounderTruthCorrection.correctionId,
      operationalJourneyStatus: 'not-applicable', visitorJourneyStatus: 'not-applicable', spatialRouteRequired: false, sharedVisitorTransitionRequired: false,
      contextRelationship: 'separate-ceremony-activation-contexts-no-shared-transition'
    },
    {
      dayId: 'DAY-KAP-2026-11-02', date: '2026-11-02', labelAr: '2 نوفمبر', sourceScopeStatus: 'covered-by-package', correctionRevisionId: null,
      operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false,
      contextRelationship: 'single-event-context'
    },
    {
      dayId: 'DAY-KAP-2026-11-03', date: '2026-11-03', labelAr: '3 نوفمبر', sourceScopeStatus: 'covered-by-package', correctionRevisionId: null,
      operationalJourneyStatus: 'candidate', visitorJourneyStatus: 'candidate', spatialRouteRequired: true, sharedVisitorTransitionRequired: false,
      contextRelationship: 'single-event-context'
    }
  ],
  applicableRouteDayIds: ['DAY-KAP-2026-10-31', 'DAY-KAP-2026-11-02', 'DAY-KAP-2026-11-03'],
  routeScopeCoverage: 'complete-for-current-applicable-days',
  sourceRelationship: {
    relationshipId: 'SOURCE-RELATIONSHIP-KAP-V02-TO-V11-PROPOSED',
    previousSourceId: 'SOURCE-KAP-ENTRY-PROPOSALS-V02',
    incomingSourceId: SOURCE_ID,
    relationship: 'proposed-supersession',
    status: 'pending-founder-review',
    automaticSupersessionAllowed: false,
    notesAr: ['رقم الملف الأعلى لا يثبت سلطة الاستبدال.', 'يبقى V.02 دليلًا مرشحًا؛ أي محتوى سابق ليوم 1 نوفمبر لا يغير تصحيح المؤسس بأن الرحلة التشغيلية غير منطبقة.']
  },
  rehearsalComparison: {
    frozenPlanId: kapDigitalRehearsalPlan.planId,
    frozenPlanHash: kapDigitalRehearsalPlan.planHash,
    frozenPlanRevision: kapDigitalRehearsalPlan.revision,
    incomingPackageId: PACKAGE_ID,
    proposedRevisionStatus: 'preview-only',
    frozenPlanMutationAllowed: false,
    readinessMutationAllowed: false,
    decisionApprovalAllowed: false,
    differencesAr: [
      'V.11 يقدم ست رحلات يوم/شخصية وتوقيتات ومسافات وتوقفات لم تكن جزءًا من الخطة المجمدة.',
      'توضيح المؤسس يثبت محاسبة مدة شاملة، ويغلق جمع المكونات كتعارض نشط دون تغيير هندسة المسار أو جاهزيته.',
      'يغطي V.11 جميع أيام الرحلات المنطبقة حاليًا: 31 أكتوبر و2 و3 نوفمبر؛ 1 نوفمبر غير منطبق تشغيليًا بتصحيح مؤسس متتبع.',
      'يبقى سياقا قصر العوجا والحدائق منفصلين في 1 نوفمبر بلا خط انتقال أو مدة أو افتراض جمهور مشترك.',
      'رسوم V.11 تبقى مراجع توضيحية غير مسجلة ولا تستبدل المسار القصصي أو الهندسي.',
      'يلزم قرار أحمد لإنشاء مراجعة بروفة مرشحة لاحقة؛ الخطة المجمدة الحالية لم تتغير.'
    ]
  }
}, kapV11SourceExpectation);

export function findKapV11Journey(journeyId: string): Readonly<OperationalJourneyCandidatePlan> | null {
  return kapV11OperationalJourneyPackage.journeys.find((journeyCandidate) => journeyCandidate.journeyId === journeyId) ?? null;
}
