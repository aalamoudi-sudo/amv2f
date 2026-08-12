import { kapCandidateSpatialIntake } from './kapCandidateSpatialIntake';
import { conferenceExperienceTwinPack, kapExperienceTwinPack } from './experienceTwinPacks';
import type { ExperiencePack } from '../types/experienceTwin';
import type { StoryMapDefinition } from '../types/storyMap';
import type { SceneAssetRegistry } from '../types/experienceScene';
import { conferenceStoryMapDefinition, kapStoryMapDefinition } from './storyMapDefinitions';
import { conferenceExperienceSceneRegistry, kapExperienceSceneRegistry } from './experienceSceneRegistries';
import type { DesignExperienceConfiguration } from '../types/designExperience';
import type { OperationalJourneyCandidatePackage } from '../types/operationalJourneyCandidate';
import { kapDesignExperienceConfiguration } from './kapDesignExperience';
import { kapV11OperationalJourneyPackage } from './kapV11OperationalJourneys';
import { validateDesignExperienceConfiguration } from '../services/designAssetValidation';

export interface ExperienceTwinMapMarker {
  entityId: string;
  sourceNumber: number;
  labelAr: string;
  labelEn: string;
  x: number;
  y: number;
  authorityAr: string;
  geometryAr: string;
  conflicted: boolean;
  independentLandmark: boolean;
}

export interface GoldenJourneyExperienceConfiguration {
  spatialArtworkUri: string;
  spatialArtworkAltAr: string;
  spatialArtworkTruthAr: string;
  spatialArtworkSource: {
    sourceAssetId: string;
    sha256: string;
    intrinsicWidth: number;
    intrinsicHeight: number;
  };
  livingPresentationDerivative: {
    derivativeId: string;
    sourceAssetId: string;
    sourceSha256: string;
    truthStatus: 'presentation-only';
    coordinateSpace: 'intrinsic-image-pixels';
    maskedSourceNumbers: number[];
    markerMaskRadius: number;
    legendMaskStartX: number;
    labelAr: string;
  };
  truthBadgeAr: string;
  defaultDayId: string;
  defaultPersonaId: string;
  defaultJourneyId: string;
  defaultJourneyStepId: string;
  defaultOperationalJourneyId: string;
  featuredEntityId: string;
  featuredZoneId: string;
  featuredSceneAssetId: string;
}

export interface ExperienceTwinConfiguration {
  pack: ExperiencePack;
  storyMapDefinition: StoryMapDefinition;
  sceneRegistry: SceneAssetRegistry;
  designExperience: DesignExperienceConfiguration | null;
  operationalJourneyPackage: OperationalJourneyCandidatePackage | null;
  goldenJourney: GoldenJourneyExperienceConfiguration | null;
  mapMarkers: ExperienceTwinMapMarker[];
  operationalMapLabelAr: string;
  operationalMapSourceAr: string;
  projectLabelAr: string;
  eventWindowAr: string;
  dayCountLabelAr: string;
  truthRibbonAr: string;
  truthBoundaryAr: string;
  readinessDisposition: 'cannot-determine' | 'not-applicable-to-reference';
  readinessExplanationAr: string;
  sourceStatusAr: string;
}

const independentLandmarks = new Set(['ENTITY-KAP-OP-004', 'ENTITY-KAP-OP-005', 'ENTITY-KAP-OP-011']);

const kapConfiguration: ExperienceTwinConfiguration = {
  pack: kapExperienceTwinPack,
  storyMapDefinition: kapStoryMapDefinition,
  sceneRegistry: kapExperienceSceneRegistry,
  designExperience: kapDesignExperienceConfiguration,
  operationalJourneyPackage: kapV11OperationalJourneyPackage,
  goldenJourney: {
    spatialArtworkUri: '/local-assets/kap/kaga-zoning-candidate.jpg',
    spatialArtworkAltAr: 'مرجع تقسيم مكاني مرشح لحدائق الملك عبدالله',
    spatialArtworkTruthAr: 'مرجع مرشح مضبوط النسبة · المراسي بصرية وليست إحداثيات مساحية',
    spatialArtworkSource: {
      sourceAssetId: 'SOURCE-ASSET-KAP-ZONING-CANDIDATE-001',
      sha256: '2b34dfa56ae479817d536d56172cb250f0b19efcf324e43c5b9ac15bf5f21772',
      intrinsicWidth: 2400,
      intrinsicHeight: 1872
    },
    livingPresentationDerivative: {
      derivativeId: 'PRESENTATION-DERIVATIVE-KAP-LIVING-MAP-RC1B2',
      sourceAssetId: 'SOURCE-ASSET-KAP-ZONING-CANDIDATE-001',
      sourceSha256: '2b34dfa56ae479817d536d56172cb250f0b19efcf324e43c5b9ac15bf5f21772',
      truthStatus: 'presentation-only',
      coordinateSpace: 'intrinsic-image-pixels',
      maskedSourceNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      markerMaskRadius: 16,
      legendMaskStartX: 1780,
      labelAr: 'مشتق عرض بصري فقط من المرجع الأصلي؛ لا يغيّر المصدر ولا ينشئ حقيقة هندسية.'
    },
    truthBadgeAr: 'مصدر مرشح — غير مسجل هندسيًا',
    defaultDayId: 'DAY-KAP-2026-10-31',
    defaultPersonaId: 'PERSONA-KAP-EMPLOYEE-FAMILY',
    defaultJourneyId: 'JOURNEY-KAP-PREOPEN-2026',
    defaultJourneyStepId: 'STEP-KAP-PREOPEN-ARRIVAL',
    defaultOperationalJourneyId: 'JOURNEY-KAP-20261031-WORKERS-V11',
    featuredEntityId: 'ENTITY-KAP-OP-006',
    featuredZoneId: 'ZONE-AGES-TUNNEL-001',
    featuredSceneAssetId: 'DESIGN-ASSET-KAP-DIRECT-MESH-001'
  },
  mapMarkers: kapCandidateSpatialIntake.candidateEntities.flatMap((entity) => entity.normalizedAnchor ? [{
    entityId: entity.candidateId,
    sourceNumber: entity.sourceNumber,
    labelAr: entity.labelAr,
    labelEn: entity.workingLabelEn,
    x: entity.normalizedAnchor.x,
    y: entity.normalizedAnchor.y,
    authorityAr: 'مصدر تشغيلي مرشح',
    geometryAr: 'مرساة صورة مطبّعة غير هندسية',
    conflicted: entity.candidateId === 'ENTITY-KAP-OP-006',
    independentLandmark: independentLandmarks.has(entity.candidateId)
  }] : []),
  operationalMapLabelAr: 'الإسقاط التشغيلي المرشح',
  operationalMapSourceAr: 'مراسي مرشحة من مصدر التقسيم التشغيلي؛ الخلفية الهندسية غير متاحة',
  projectLabelAr: 'مشروع تدشين حدائق الملك عبدالله',
  eventWindowAr: '31 أكتوبر – 3 نوفمبر 2026',
  dayCountLabelAr: 'أربعة أيام',
  truthRibbonAr: 'معاينة تصميم من مصدر مرشح',
  truthBoundaryAr: 'لا هندسة · لا سعة · لا مسار معتمد · لا 360 حقيقي',
  readinessDisposition: 'cannot-determine',
  readinessExplanationAr: 'المشروع غير مُقيّم تشغيليًا؛ اكتمال التصميم أو المصدر لا يولّد نسبة جاهزية.',
  sourceStatusAr: 'مصدر برنامج وتصميم مرشح موثق البصمة'
};

const kapDesignValidation = validateDesignExperienceConfiguration(kapDesignExperienceConfiguration);
if (!kapDesignValidation.valid) throw new Error(`Invalid KAP design experience configuration: ${kapDesignValidation.issues.map((item) => item.code).join(', ')}`);

const conferenceConfiguration: ExperienceTwinConfiguration = {
  pack: conferenceExperienceTwinPack,
  storyMapDefinition: conferenceStoryMapDefinition,
  sceneRegistry: conferenceExperienceSceneRegistry,
  designExperience: null,
  operationalJourneyPackage: null,
  goldenJourney: null,
  mapMarkers: [],
  operationalMapLabelAr: 'مرجع مؤتمر خيالي',
  operationalMapSourceAr: 'لا توجد بيانات مكانية؛ مرجع خيالي للاختبار فقط',
  projectLabelAr: 'تجربة مؤتمر مرجعية مستقلة',
  eventWindowAr: 'مرجع خيالي بلا تاريخ تشغيلي',
  dayCountLabelAr: 'يوم مرجعي واحد',
  truthRibbonAr: 'مرجع خيالي للاختبار فقط',
  truthBoundaryAr: 'لا مشروع حقيقي · لا جاهزية · لا بيانات حية',
  readinessDisposition: 'not-applicable-to-reference',
  readinessExplanationAr: 'المرجع خيالي ولا ينتج جاهزية تشغيلية.',
  sourceStatusAr: 'مرجع خيالي للاختبار فقط'
};

const configurations = [kapConfiguration, conferenceConfiguration] as const;

export function findExperienceTwinConfiguration(projectId: string, eventId: string, venueId: string): ExperienceTwinConfiguration | null {
  return configurations.find((configuration) => configuration.pack.projectId === projectId && configuration.pack.eventId === eventId && configuration.pack.venueId === venueId) ?? null;
}

export interface DeclutteredExperienceMarker extends ExperienceTwinMapMarker {
  displayX: number;
  displayY: number;
  visuallyDecluttered: boolean;
}

export function declutterExperienceMarkers(markers: ExperienceTwinMapMarker[], threshold = 0.07): DeclutteredExperienceMarker[] {
  const xValues = markers.map((marker) => marker.x);
  const yValues = markers.map((marker) => marker.y);
  const minX = Math.min(...xValues, 0);
  const maxX = Math.max(...xValues, 1);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 1);
  const actualMinX = markers.length ? Math.min(...xValues) : minX;
  const actualMaxX = markers.length ? Math.max(...xValues) : maxX;
  const actualMinY = markers.length ? Math.min(...yValues) : minY;
  const actualMaxY = markers.length ? Math.max(...yValues) : maxY;
  const projectX = (value: number) => 0.14 + ((value - actualMinX) / Math.max(0.001, actualMaxX - actualMinX)) * 0.7;
  const projectY = (value: number) => 0.16 + ((value - actualMinY) / Math.max(0.001, actualMaxY - actualMinY)) * 0.64;
  const projected = markers.map((marker) => ({ ...marker, projectedX: projectX(marker.x), projectedY: projectY(marker.y) }));
  return projected.map((marker, index) => {
    const overlaps = projected
      .slice(0, index)
      .filter((candidate) => Math.hypot(candidate.projectedX - marker.projectedX, candidate.projectedY - marker.projectedY) < threshold);
    if (!overlaps.length) return { ...marker, displayX: marker.projectedX, displayY: marker.projectedY, visuallyDecluttered: false };
    const direction = index % 2 === 0 ? -1 : 1;
    const distance = Math.min(0.055, threshold + overlaps.length * 0.008);
    return {
      ...marker,
      displayX: Math.max(0.06, Math.min(0.94, marker.projectedX + distance * direction)),
      displayY: Math.max(0.08, Math.min(0.92, marker.projectedY + distance * (direction * -0.55))),
      visuallyDecluttered: true
    };
  });
}
