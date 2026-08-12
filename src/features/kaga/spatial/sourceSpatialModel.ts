import { journeys } from '../data/journeys';
import type { JourneyId } from '../data/spatialTypes';

export const SOURCE_SPATIAL_COORDINATE_SPACE = 'KAGA-SOURCE-2D-V1' as const;

const viewBox = { x: 0, y: 0, width: 1703.16, height: 1371.235 } as const;
const legacyPlanBounds = { x: 20, y: 20, width: 925, height: 830 } as const;
const scaleX = viewBox.width / legacyPlanBounds.width;
const scaleY = viewBox.height / legacyPlanBounds.height;

/**
 * Gate 1 migration only. Event semantics remain sourced from the event PDF,
 * while the legacy display coordinates are affinely registered to the Rhino
 * frame for review. Path-by-path pathway snapping is deliberately deferred to
 * the route-registration gate and therefore carries approximate confidence.
 */
export const legacyRouteMigration = {
  sourceCoordinateSpace: 'KAGA-PDF-RECONSTRUCTION-1200x900',
  targetCoordinateSpace: SOURCE_SPATIAL_COORDINATE_SPACE,
  sourcePlanBounds: legacyPlanBounds,
  matrix: {
    a: scaleX,
    b: 0,
    c: 0,
    d: scaleY,
    e: -legacyPlanBounds.x * scaleX,
    f: -legacyPlanBounds.y * scaleY,
  },
  svgTransform: `matrix(${scaleX} 0 0 ${scaleY} ${-legacyPlanBounds.x * scaleX} ${-legacyPlanBounds.y * scaleY})`,
  sourceConfidence: 'approximate' as const,
  notesAr: 'تسجيل مبدئي لمراجعة العلاقة المكانية؛ لم تُسنَد المقاطع بعد إلى ممرات بعينها في نموذج Rhino.',
};

export const sourceSpatialModel = {
  schemaVersion: '1.0.0',
  coordinateSpace: SOURCE_SPATIAL_COORDINATE_SPACE,
  status: 'gate-1-provisional' as const,
  units: 'Rhino model metres',
  crs: null,
  crsStatus: 'unknown-do-not-treat-as-survey-control' as const,
  source: {
    filename: 'Kaig-mastersite  (2).3dm',
    sha256: 'e754894193c1da6660218757a19adc2f5dfacde7b2f27aefd35597d860007a9e',
    archiveVersion: 80,
    unitSystem: 'Meters',
    absoluteTolerance: 0.001,
  },
  sourceBounds: {
    minX: -881.581,
    minY: -1711.989,
    maxX: 765.579,
    maxY: -396.754,
  },
  contractBounds: {
    minX: -909.581,
    minY: -1739.989,
    maxX: 793.579,
    maxY: -368.754,
  },
  viewBox,
  viewBoxString: `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
  sourceToCanonical: {
    matrix: [1, 0, 0, -1, 909.581188, -368.753837] as const,
    description: 'canonicalX = sourceX + 909.581188; canonicalY = -368.753837 - sourceY',
  },
  assets: {
    masterplanSvg: '/kaga/spatial-v2/masterplan.svg',
    gardenFootprintsSvg: '/kaga/spatial-v2/garden-footprints.svg',
    metadata: '/kaga/spatial-v2/spatial-metadata.json',
    selectedLayers: '/kaga/spatial-v2/selected-layers.json',
    siteBoundaries: '/kaga/spatial-v2/site-boundaries.geojson',
    pathways: '/kaga/spatial-v2/pathways.geojson',
    parking: '/kaga/spatial-v2/parking.geojson',
    gardenFootprints: '/kaga/spatial-v2/garden-footprints.geojson',
    crescentFootprint: '/kaga/spatial-v2/crescent-footprint.geojson',
    mapLandmarks: '/kaga/spatial-v2/map-landmarks.json',
  },
  featureCounts: {
    sourceLinework: 4995,
    pathways: 238,
    gardenFootprintCandidates: 28,
    siteBoundaryCandidates: 0,
    crescentFootprintCandidates: 1,
    parkingFootprints: 0,
  },
} as const;

export interface RegisteredEventRoute {
  journeyId: JourneyId;
  titleAr: string;
  sourcePages: number[];
  sourceConfidence: 'approximate';
  registrationTransform: typeof legacyRouteMigration.svgTransform;
  notesAr: string;
}

export const registeredEventRoutes: RegisteredEventRoute[] = journeys.map((journey) => ({
  journeyId: journey.id,
  titleAr: journey.title,
  sourcePages: journey.source.pdfPages,
  sourceConfidence: legacyRouteMigration.sourceConfidence,
  registrationTransform: legacyRouteMigration.svgTransform,
  notesAr: legacyRouteMigration.notesAr,
}));

export function legacyPointToSourceSpatial(point: { x: number; y: number }) {
  const { a, d, e, f } = legacyRouteMigration.matrix;
  return { x: point.x * a + e, y: point.y * d + f };
}

export function isWithinSourceSpatialBounds(point: { x: number; y: number }) {
  return point.x >= 0 && point.x <= viewBox.width && point.y >= 0 && point.y <= viewBox.height;
}
