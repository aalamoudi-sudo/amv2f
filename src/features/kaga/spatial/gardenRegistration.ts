import { gardenById, gardens } from '../knowledge';
import { eventProposalMappedExecutiveGardenIds } from '../data/eventProposalPlaceWhitelist';
import type { GardenCategory, SourceConfidence } from '../knowledge/knowledgeTypes';

export const REGISTERED_SPATIAL_COORDINATE_SPACE = 'KAGA-SOURCE-2D-V1' as const;
export const REGISTERED_SPATIAL_DESIGNATION = 'KAGA-SPATIAL-REGISTERED-V1' as const;

export type RegistrationEvidenceLevel = 'A' | 'B' | 'C' | 'D';

export interface GardenSpatialRegistration {
  canonicalGardenId: string;
  titleAr: string;
  category: GardenCategory;
  knowledgeGuideSourcePages: number[];
  siteDirectoryLabel: string;
  siteDirectoryNumber?: number;
  rhinoLayerPath?: string;
  rhinoObjectSource?: string;
  footprintId?: string;
  registrationMethod: string;
  evidenceLevel: RegistrationEvidenceLevel;
  confidence: SourceConfidence;
  notesAr: string;
}

const highRegistration = (
  canonicalGardenId: string,
  footprintId: string,
  siteDirectoryNumber: number,
  evidenceLevel: RegistrationEvidenceLevel = 'C',
  rhinoLayerPath = 'curves',
): GardenSpatialRegistration => {
  const garden = gardenById[canonicalGardenId]!;
  return {
    canonicalGardenId,
    titleAr: garden.titleAr,
    category: garden.category,
    knowledgeGuideSourcePages: [...new Set([...garden.source.flatMap((source) => source.sourcePages), 13])],
    siteDirectoryLabel: garden.titleEn ?? garden.titleAr,
    siteDirectoryNumber,
    rhinoLayerPath,
    rhinoObjectSource: footprintId,
    footprintId,
    registrationMethod: 'site-directory-topology-to-rhino-source-curve',
    evidenceLevel,
    confidence: 'high',
    notesAr: 'طوبولوجيا الموضع المرقّم في دليل الموقع طابقت منحنى مصدر مستقلًا داخل إطار Rhino المجمد؛ لم تعتمد المطابقة على تشابه الشكل وحده.',
  };
};

const unresolvedRegistration = (canonicalGardenId: string, notesAr: string): GardenSpatialRegistration => {
  const garden = gardenById[canonicalGardenId]!;
  return {
    canonicalGardenId,
    titleAr: garden.titleAr,
    category: garden.category,
    knowledgeGuideSourcePages: garden.source.flatMap((source) => source.sourcePages),
    siteDirectoryLabel: garden.titleEn ?? garden.titleAr,
    registrationMethod: 'withheld-pending-defensible-transform',
    evidenceLevel: 'B',
    confidence: 'unresolved',
    notesAr,
  };
};

export const gardenSpatialRegistrations: GardenSpatialRegistration[] = [
  highRegistration('devonianGarden', 'garden-footprint-candidate-20', 1),
  unresolvedRegistration('carboniferousGarden', 'موضع دليل الموقع معروف، لكن لم تُعتمد بصمة كاملة عالية الثقة في هذه البوابة.'),
  unresolvedRegistration('jurassicGarden', 'موضع دليل الموقع معروف، لكن منحنيات الحدود المتاحة لم تكفِ لبصمة عالية الثقة.'),
  unresolvedRegistration('cretaceousGarden', 'موضع دليل الموقع معروف، لكن التسجيل بقي دون حد الثقة التنفيذي.'),
  unresolvedRegistration('modernLifeGarden', 'لا يوجد دمج تلقائي بين Cenozoic Garden و«حديقة الحياة الحديثة». بقي التعارض مفتوحًا.'),
  highRegistration('plioceneGarden', 'garden-footprint-candidate-24', 6),
  highRegistration('optionsGarden', 'garden-footprint-candidate-23', 7),
  highRegistration('butterflyGarden', 'garden-footprint-candidate-03', 15, 'D', 'S19093-0200S-butterfly garden$0$Butterfly Garden Outline'),
  unresolvedRegistration('aviaryGarden', 'طبقة Aviary Garden Outline موجودة بلا instance placement قابل للدفاع داخل الإطار المجمد.'),
  highRegistration('mazeGarden', 'garden-footprint-candidate-01', 17, 'D', '- S19093-0200S-Maze Garden$0$LS-BASE PLAN'),
  highRegistration('soundLightGarden', 'garden-footprint-candidate-02', 18, 'D', '1-Master Plan Rev-07. clear copy$0$Sound and Light Garden Outline'),
  unresolvedRegistration('natureGarden', 'لا يتم دمج Discovery Garden مع الحديقة الطبيعية؛ المصطلحان محفوظان كمصدرين منفصلين.'),
  unresolvedRegistration('waterGarden', 'المعرفة النصية مصدرية، لكن لم تُعتمد بصمة مكانية عالية الثقة في هذه البوابة.'),
];

export const executiveGardenRegistrations = gardenSpatialRegistrations.filter(
  (registration) => (
    registration.confidence === 'exact' || registration.confidence === 'high'
  ) && eventProposalMappedExecutiveGardenIds.has(registration.canonicalGardenId),
);

/** High/exact spatial evidence retained for development provenance only. */
export const developmentSpatialRegistrations = gardenSpatialRegistrations.filter(
  (registration) => registration.confidence === 'exact' || registration.confidence === 'high',
);

export const gardenRegistrationById = Object.fromEntries(
  gardenSpatialRegistrations.map((registration) => [registration.canonicalGardenId, registration]),
) as Record<string, GardenSpatialRegistration>;

export const crescentRegistration = {
  canonicalEntityId: 'crescentBuilding',
  titleAr: 'مبنى الهلالين',
  knowledgeGuideSourcePages: [8, 9, 13, 17],
  rhinoLayerPaths: [
    'DAR New Master Plan 100% Gray$0$S19093-0200S-Base Plan_$0$017 Crescent',
    'DAR New Master Plan 100% Gray$0$S19093-0200S-Base Plan_$0$017 Crescent1',
    'DAR New Master Plan 100% Gray$0$S19093-0200S-Base Plan_$0$CRESCENT',
  ],
  registrationMethod: 'instance-transform-audit-and-source-cross-check',
  confidence: 'unresolved' as const,
  footprintId: undefined,
  notesAr: 'الطبقات الصريحة موجودة، لكن نسخها المحوّلة لا تتقاطع دفاعيًا مع عقد KAGA-SOURCE-2D-V1. مرشح Gate 1 الدائري يمثل نطاقًا أوسع وليس بصمة المبنى، لذلك لم يُفعّل ككيان تنفيذي.',
};

export const registeredSpatialAssets = {
  executiveMasterplanSvg: '/kaga/spatial-registered-v1/executive-masterplan.svg',
  registeredGardens: '/kaga/spatial-registered-v1/registered-gardens.geojson',
  registeredCrescent: '/kaga/spatial-registered-v1/registered-crescent.geojson',
  metadata: '/kaga/spatial-registered-v1/registered-spatial-metadata.json',
} as const;

export function getRegisteredGardenKnowledge(canonicalGardenId: string) {
  const registration = gardenRegistrationById[canonicalGardenId];
  if (
    !registration
    || !eventProposalMappedExecutiveGardenIds.has(canonicalGardenId)
    || (registration.confidence !== 'exact' && registration.confidence !== 'high')
  ) {
    return undefined;
  }
  return gardenById[canonicalGardenId];
}

export function assertKnowledgeRegistrationCoverage() {
  return gardens.every((garden) => gardenRegistrationById[garden.id] !== undefined);
}
