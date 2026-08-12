import type { JourneyId } from './spatialTypes';

export const EVENT_PROPOSAL_DOCUMENT = 'عرض تدشين حدائق الملك عبدالله — Rev06' as const;

export type EventProposalPlaceKind =
  | 'garden'
  | 'entrance'
  | 'parking'
  | 'arrival'
  | 'hospitality'
  | 'route-place'
  | 'experience'
  | 'exit';

export type ExecutivePlaceStatus = 'VERIFIED' | 'PARTIAL' | 'UNMAPPED';
export type PlaceLocationConfidence = 'verified' | 'high' | 'unmapped';

export interface EventProposalPlace {
  id: string;
  displayNameAr: string;
  kind: EventProposalPlaceKind;
  eventSourcePages: number[];
  journeyIds: JourneyId[];
  locationConfidence: PlaceLocationConfidence;
  executiveStatus: ExecutivePlaceStatus;
  executiveMapEligible: boolean;
  notesAr?: string;
}

const place = (
  id: string,
  displayNameAr: string,
  kind: EventProposalPlaceKind,
  eventSourcePages: number[],
  journeyIds: JourneyId[],
  locationConfidence: PlaceLocationConfidence,
  executiveStatus: ExecutivePlaceStatus,
  notesAr?: string,
): EventProposalPlace => ({
  id,
  displayNameAr,
  kind,
  eventSourcePages,
  journeyIds,
  locationConfidence,
  executiveStatus,
  executiveMapEligible: locationConfidence === 'verified' || locationConfidence === 'high',
  notesAr,
});

const allPrimaryJourneys: JourneyId[] = ['workers', 'mayor', 'prince', 'guests', 'mayorMedia', 'media'];

/**
 * Executive place vocabulary is whitelisted by the Event Proposal only.
 * Rhino establishes location; Illustrator never adds names; the Knowledge
 * Guide may enrich an already-whitelisted place through an explicit alias.
 */
export const eventProposalPlaces: EventProposalPlace[] = [
  place('mainEntrance', 'المدخل الرئيسي', 'entrance', [7, 8, 25, 26, 34, 35], allPrimaryJourneys, 'unmapped', 'PARTIAL'),
  place('guestParking', 'المواقف', 'parking', [7, 26, 35], ['workers', 'guests', 'media'], 'unmapped', 'PARTIAL'),
  place('dropoff', 'نقطة النزول', 'arrival', [7, 8, 26, 34, 35], ['workers', 'mayor', 'guests', 'mayorMedia', 'media'], 'unmapped', 'PARTIAL'),
  place('receptionHospitality', 'الاستقبال والضيافة', 'hospitality', [7, 8, 34, 35], ['workers', 'mayor', 'mayorMedia', 'media'], 'unmapped', 'PARTIAL'),
  place('ceremonialReception', 'الاستقبال والعرضة السعودية', 'experience', [25, 26, 27], ['prince', 'guests'], 'unmapped', 'PARTIAL'),
  place('gardenModel', 'مجسم الحدائق', 'experience', [7, 8, 25, 26, 34, 35, 115, 116, 117], allPrimaryJourneys, 'unmapped', 'PARTIAL'),
  place('memorial', 'النصب التذكاري', 'experience', [25, 26, 34, 111, 112, 113, 114], ['prince', 'guests', 'mayorMedia'], 'unmapped', 'PARTIAL'),
  place('eraWalk', 'ممر العصور', 'route-place', [7, 8, 25, 26, 34, 35, 118, 119, 120, 121, 122, 123, 124, 125], allPrimaryJourneys, 'unmapped', 'PARTIAL'),
  place('optionsGarden', 'حديقة الخيارات', 'garden', [7, 8, 25, 26, 34, 35], allPrimaryJourneys, 'high', 'VERIFIED'),
  place('plioceneGarden', 'الحديقة البليوسينية', 'garden', [7, 8, 25, 26, 34, 35], allPrimaryJourneys, 'high', 'VERIFIED'),
  place('familyGarden', 'الحديقة العائلية', 'garden', [7, 8, 25, 26, 34, 35], allPrimaryJourneys, 'unmapped', 'UNMAPPED', 'كيان رحلة صحيح بلا بصمة تنفيذية دقيقة معتمدة.'),
  place('devonianGarden', 'الحديقة الديفونية', 'garden', [7, 8, 25, 26, 34, 35], allPrimaryJourneys, 'high', 'VERIFIED'),
  place('modernGarden', 'الحديقة الحديثة', 'garden', [7, 8, 25, 26, 34, 35], allPrimaryJourneys, 'unmapped', 'UNMAPPED', 'الاسم التنفيذي من عرض التدشين؛ لا تُستخدم تسمية الدليل المعرفي كبديل مرئي.'),
  place('natureGarden', 'حديقة الطبيعة', 'garden', [7, 35], ['workers', 'media'], 'unmapped', 'UNMAPPED', 'مسار خارجي اختياري؛ لا توجد بصمة تنفيذية دقيقة معتمدة.'),
  place('memoryCorner', 'ركن الذكريات', 'experience', [7, 8, 34, 35, 108, 109, 110], ['workers', 'mayor', 'mayorMedia', 'media'], 'unmapped', 'PARTIAL'),
  place('iconPhoto', 'الصورة الأيقونية', 'experience', [7, 8], ['workers', 'mayor'], 'unmapped', 'PARTIAL'),
  place('hospitalityArea', 'منطقة الضيافة', 'hospitality', [7, 34, 35], ['workers', 'mayorMedia', 'media'], 'unmapped', 'PARTIAL'),
  place('pressConference', 'المؤتمر الصحفي', 'experience', [34, 35, 126, 127, 128, 129, 130, 131], ['mayorMedia', 'media'], 'unmapped', 'PARTIAL'),
  place('dinnerArea', 'منطقة العشاء', 'hospitality', [34, 35, 99, 100, 101, 102, 103, 104, 105, 106, 107], ['mayorMedia', 'media'], 'unmapped', 'PARTIAL'),
  place('vipArea', 'منطقة كبار الشخصيات', 'hospitality', [25, 26, 34, 78], ['prince', 'guests', 'mayorMedia'], 'unmapped', 'PARTIAL'),
  place('journeyEnd', 'نقطة نهاية الرحلة', 'exit', [26], ['guests'], 'unmapped', 'PARTIAL'),
  place('giftDelivery', 'تسليم الهدايا', 'experience', [7, 26, 35], ['workers', 'guests', 'media'], 'unmapped', 'PARTIAL'),
  place('journeyExit', 'مسار الخروج', 'exit', [7, 8, 25, 26, 34, 35], allPrimaryJourneys, 'unmapped', 'PARTIAL'),
];

export const eventProposalPlaceById = Object.fromEntries(
  eventProposalPlaces.map((item) => [item.id, item]),
) as Record<string, EventProposalPlace>;

export const eventProposalExecutiveGardens = eventProposalPlaces.filter((item) => item.kind === 'garden');
export const eventProposalExecutiveGardenIds = new Set(eventProposalExecutiveGardens.map((item) => item.id));
export const eventProposalMappedExecutiveGardenIds = new Set(
  eventProposalExecutiveGardens.filter((item) => item.executiveMapEligible).map((item) => item.id),
);

export const journeyStopPlaceIds: Record<JourneyId, Record<string, string>> = {
  workers: { A: 'mainEntrance', B: 'guestParking', C: 'dropoff', D: 'receptionHospitality', E: 'gardenModel', F: 'eraWalk', G: 'familyGarden', H: 'devonianGarden', I: 'modernGarden', J: 'memoryCorner', K: 'plioceneGarden', L: 'optionsGarden', M: 'iconPhoto', N: 'hospitalityArea', O: 'giftDelivery', P: 'natureGarden', Q: 'journeyExit' },
  mayor: { A: 'mainEntrance', B: 'dropoff', C: 'receptionHospitality', D: 'gardenModel', E: 'eraWalk', F: 'familyGarden', G: 'devonianGarden', H: 'modernGarden', I: 'memoryCorner', J: 'plioceneGarden', K: 'optionsGarden', L: 'iconPhoto' },
  prince: { A: 'mainEntrance', B: 'ceremonialReception', C: 'optionsGarden', D: 'plioceneGarden', E: 'eraWalk', F: 'familyGarden', G: 'devonianGarden', H: 'modernGarden' },
  guests: { A: 'mainEntrance', B: 'dropoff', C: 'ceremonialReception', D: 'optionsGarden', E: 'plioceneGarden', F: 'eraWalk', G: 'familyGarden', H: 'devonianGarden', I: 'modernGarden', J: 'journeyEnd', K: 'giftDelivery', L: 'journeyExit' },
  mayorMedia: { A: 'mainEntrance', B: 'dropoff', C: 'receptionHospitality', D: 'gardenModel', E: 'eraWalk', F: 'familyGarden', G: 'devonianGarden', H: 'modernGarden', I: 'memoryCorner', J: 'plioceneGarden', K: 'optionsGarden', L: 'pressConference', M: 'dinnerArea', N: 'vipArea' },
  media: { A: 'mainEntrance', B: 'guestParking', C: 'dropoff', D: 'receptionHospitality', E: 'gardenModel', F: 'eraWalk', G: 'familyGarden', H: 'devonianGarden', I: 'modernGarden', J: 'memoryCorner', K: 'plioceneGarden', L: 'optionsGarden', M: 'hospitalityArea', N: 'pressConference', O: 'dinnerArea', P: 'giftDelivery', Q: 'natureGarden', R: 'journeyExit' },
};

export function getEventProposalPlaceForStop(journeyId: JourneyId, stopCode: string) {
  const placeId = journeyStopPlaceIds[journeyId][stopCode];
  return placeId ? eventProposalPlaceById[placeId] : undefined;
}
