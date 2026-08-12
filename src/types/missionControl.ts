export const missionModeValues = ['plan', 'rehearse', 'live', 'incident', 'learn'] as const;
export type MissionMode = (typeof missionModeValues)[number];

export const missionLensValues = ['experience', 'spatial', 'operations', 'decision', 'future'] as const;
export type MissionLens = (typeof missionLensValues)[number];

export const missionPresentationValues = ['client', 'command', 'technical'] as const;
export type MissionPresentation = (typeof missionPresentationValues)[number];

export const missionCanvasViewValues = ['entry', 'world', 'tangible'] as const;
export type MissionCanvasView = (typeof missionCanvasViewValues)[number];

export const missionReviewPresetValues = ['mission-entry', 'mission-world', 'mission-web3d', 'mission-command', 'mission-technical'] as const;
export type MissionReviewPreset = (typeof missionReviewPresetValues)[number];

export const missionWorldSurfaceValues = ['living-map', 'truth-map', 'web3d'] as const;
export type MissionWorldSurface = (typeof missionWorldSurfaceValues)[number];

export type MissionRelationshipStatus = 'resolved' | 'proposed' | 'conflicted' | 'unresolved' | 'not-applicable';
export type MissionRelationshipConfidence = 'high' | 'medium' | 'low' | 'unknown';

export const missionTruthClassificationValues = [
  'reported',
  'observed',
  'verified',
  'approved',
  'simulated',
  'predicted',
  'unknown'
] as const;
export type MissionTruthClassification = (typeof missionTruthClassificationValues)[number];

export interface MissionTruthContext {
  sourceId: string | null;
  sourceLabelAr: string;
  sourceVersion: string | null;
  timestamp: string | null;
  timestampTrust: 'source-recorded' | 'local-device-time-untrusted' | 'not-recorded';
  authority: string;
  confidence: 'high' | 'medium' | 'low' | 'unknown';
  classification: MissionTruthClassification;
  sourceStatus: 'candidate' | 'verified-source' | 'approved-scope' | 'missing' | 'unknown';
  missingDependenciesAr: string[];
}

export interface MissionContext {
  organizationId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  dayId: string | null;
  personaId: string | null;
  experienceJourneyId: string | null;
  journeyId: string | null;
  routeJourneyId: string | null;
  routeWaypointId: string | null;
  momentId: string | null;
  stepId: string | null;
  entityId: string | null;
  zoneId: string | null;
  areaId: string | null;
  routeId: string | null;
  sceneId: string | null;
  spatialRelationshipStatus: MissionRelationshipStatus;
  spatialRelationshipConfidence: MissionRelationshipConfidence;
  spatialRelationshipSource: string | null;
  decisionId: string | null;
  scenarioId: string | null;
  missionMode: MissionMode;
  missionLens: MissionLens;
  truthContext: MissionTruthContext;
  projectionVersion: string;
}

export interface MissionCanvasRouteState {
  enabled: boolean;
  view: MissionCanvasView;
  presentation: MissionPresentation;
  worldSurface: MissionWorldSurface;
  truthOpen: boolean;
}

export interface MissionContextResolution {
  valid: boolean;
  context: MissionContext | null;
  routeState: MissionCanvasRouteState;
  errorAr: string | null;
}

export interface MissionProjectedValue<T> {
  value: T;
  classification: MissionTruthClassification;
  sourceRefIds: string[];
}

export interface MissionNowItem {
  itemId: string;
  kind: 'blocker' | 'decision' | 'next-moment';
  labelAr: string;
  valueAr: string;
  classification: MissionTruthClassification;
}

export interface MissionJourneyStepProjection {
  stepId: string;
  labelAr: string;
  order: number;
  entityId: string | null;
  zoneId: string | null;
  active: boolean;
  spatialRelationship: 'candidate-anchor' | 'semantic-only' | 'unresolved-no-anchor';
  classification: MissionTruthClassification;
}

export interface TangibleCommandSurfaceProjection {
  projectionVersion: string;
  physicalStandardId: 'MEIOS-PDT-STD-001';
  physicalStandardVersion: '1.0.0';
  selectedDayId: string | null;
  selectedPersonaId: string | null;
  selectedJourneyId: string | null;
  selectedEntityId: string | null;
  blockerStateAr: string;
  decisionStateAr: string;
  targetSurfaces: Array<'physical-model' | 'projection-mapping' | 'command-wall' | 'touch-table'>;
  adapterStatus: 'preview-only' | 'unavailable';
  calibrationStatus: 'not-calibrated';
  hardwareConnected: false;
  hardwareControlAllowed: false;
  conformityClaimed: false;
}

export interface MissionGraphProjection {
  context: MissionContext;
  projectLabelAr: string;
  eventLabelAr: string;
  dayLabelAr: string;
  personaLabelAr: string;
  journeyLabelAr: string;
  momentLabelAr: string;
  nextMomentLabelAr: string | null;
  entityLabelAr: string;
  zoneLabelAr: string;
  sceneLabelAr: string | null;
  journeySteps: MissionJourneyStepProjection[];
  nowItems: MissionNowItem[];
  experience: {
    seesAr: string;
    doesAr: string;
    intendedFeelingAr: string;
    frictionPointsAr: string[];
    nextActionAr: string;
  };
  spatial: {
    sourceAr: string;
    relationshipAr: string;
    engineeringStatusAr: string;
    registrationAvailable: boolean;
    web3dAvailable: boolean;
    panoramaAvailable: boolean;
  };
  operations: {
    readinessDisposition: 'cannot-determine' | 'not-applicable-to-reference';
    readinessExplanationAr: string;
    ownerAr: string;
    responsibleAr: string;
    evidenceStateAr: string;
    blockerLabelsAr: string[];
    liveSourceConnected: false;
    liveSourceMessageAr: 'لا يوجد مصدر حي متصل';
  };
  decision: {
    decisionId: string | null;
    legalRecordAvailable: boolean;
    problemAr: string;
    authorityAr: string;
    requiredActionAr: string;
    expectedImpactAr: string;
    approvalMutationAllowed: false;
  };
  future: {
    rehearsalAvailable: boolean;
    rehearsalLabelAr: string;
    rehearsalStateAr: string;
    simulationConnected: false;
    simulationMessageAr: 'محرك المحاكاة غير متصل';
    modelVersion: string | null;
    inputSnapshot: string | null;
    assumptionsAr: string[];
    runTime: string | null;
    confidence: MissionTruthClassification;
    resultAr: string;
    comparisonToBaselineAr: string;
  };
  tangible: TangibleCommandSurfaceProjection;
  mutationBoundary: {
    baselineMutationAllowed: false;
    readinessMutationAllowed: false;
    evidenceVerificationAllowed: false;
    decisionApprovalAllowed: false;
    routeApprovalAllowed: false;
    hardwareControlAllowed: false;
  };
}
