import type { EventDayJourneyApplicability } from './eventDayJourneyApplicability';

export const experienceTruthClassValues = [
  'illustrative-only',
  'source-backed-candidate',
  'design-candidate',
  'design-approved',
  'field-reported',
  'field-verified',
  'actual-verified',
  'live-reported',
  'live-verified'
] as const;

export type ExperienceTruthClass = (typeof experienceTruthClassValues)[number];

export const operationalLensValues = [
  'experience',
  'executive',
  'operations',
  'protocol',
  'security',
  'accessibility',
  'content-and-show',
  'readiness-and-decisions',
  'source-truth'
] as const;

export type OperationalLensId = (typeof operationalLensValues)[number];

import type { StoryMapComparisonState, StoryMapViewport } from './storyMap';
import type { SceneViewerProjection } from './experienceScene';
import type { DesignSceneLens, DesignSceneQualityProfile } from './designExperience';

export const experienceMapModeValues = ['story', 'operational', 'illustrated', 'web3d', 'panorama'] as const;
export type ExperienceMapMode = (typeof experienceMapModeValues)[number];

export const experienceViewModeValues = ['split', 'map-focus', 'scene-focus', 'presentation', 'internal'] as const;
export type ExperienceViewMode = (typeof experienceViewModeValues)[number];

export const experienceReviewModeValues = ['overview', 'days', 'journey', 'story', 'scenes', 'command', 'sources', 'assets', 'delivery', 'presentation'] as const;
export type ExperienceReviewMode = (typeof experienceReviewModeValues)[number];

export const goldenJourneyScreenValues = ['entry', 'map', 'scene'] as const;
export type GoldenJourneyScreen = (typeof goldenJourneyScreenValues)[number];

export interface ExperienceSourceTrace {
  traceId: string;
  sourceId: string;
  sourceHash: string;
  sourcePage: number;
  extractionMethod: 'human-reviewed-source-extraction';
  extractedBy: 'local-human-review-process';
  extractedAtStatus: 'local-process-time-untrusted' | 'not-recorded';
  authority: 'founder-provided-candidate-program-and-design-reference' | 'fictional-test-reference';
  confidence: 'high' | 'medium' | 'low';
  interpretationStatus: 'directly-source-backed' | 'interpreted-candidate' | 'founder-directed' | 'missing' | 'conflicting';
  founderConfirmationStatus: 'founder-working-candidate' | 'founder-directed' | 'not-confirmed' | 'not-applicable';
  sanitizedMeaningAr: string;
}

export interface SourceDeclaredAttendance {
  value: number | null;
  qualifier: 'exact' | 'more-than' | 'unknown';
  classification: 'source-declared-not-capacity';
}

export interface ExperienceScenario {
  scenarioId: string;
  scenarioType: 'basic' | 'celebratory' | 'integrated' | 'expanded' | 'fictional-reference';
  labelAr: string;
  labelEn: string;
  durationDays: number;
  durationPattern: 'consecutive' | 'within-month';
  sourceDeclaredAttendance: SourceDeclaredAttendance;
  intendedEffectAr: string;
  status: 'founder-working-candidate' | 'source-candidate' | 'fictional-test-reference';
  eventDayIds: string[];
  sourceTraceIds: string[];
}

export interface EventSiteCandidate {
  siteCandidateId: string;
  labelAr: string;
  labelEn: string;
  existingVenueId: string | null;
  status: 'candidate';
  engineeringStatus: 'unverified';
  approvalStatus: 'not-approved';
  sourceTraceIds: string[];
}

export interface ExperiencePersona {
  personaId: string;
  labelAr: string;
  labelEn: string;
  personaType:
    | 'employee-and-family'
    | 'royal-vip'
    | 'regional-leadership'
    | 'media-and-content'
    | 'host-and-organizer'
    | 'invited-guest'
    | 'partner'
    | 'accessibility-supported-guest';
  descriptionAr: string;
  status: 'source-backed-candidate' | 'interpreted-candidate' | 'fictional-test-reference';
  sourceTraceIds: string[];
}

export interface OperationalLens {
  lensId: OperationalLensId;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  visibleProjectionKinds: Array<'experience' | 'program' | 'protocol' | 'security' | 'accessibility' | 'content' | 'readiness' | 'decisions' | 'evidence' | 'source'>;
}

export interface ProgramMoment {
  programMomentId: string;
  eventDayId: string;
  labelAr: string;
  labelEn: string;
  order: number;
  relatedZoneIds: string[];
  relatedEntityIds: string[];
  sourceTraceIds: string[];
  truthClass: ExperienceTruthClass;
}

export interface ContentCue {
  contentCueId: string;
  labelAr: string;
  labelEn: string;
  cueType: 'speech' | 'video' | 'show' | 'signage' | 'recognition' | 'gift' | 'photo' | 'unknown';
  status: 'source-backed-candidate' | 'interpreted-candidate' | 'missing';
  sourceTraceIds: string[];
}

export interface ExperienceIntent {
  whatGuestSees: string | null;
  whatGuestHears: string | null;
  whatGuestDoes: string | null;
  intendedEmotion: string | null;
  servicePromise: string | null;
  contentCue: string | null;
  expectedDuration: string | null;
  accessibilityConsiderations: string | null;
  protocolConsiderations: string | null;
  operationalOwner: string | null;
  fallbackExperience: string | null;
  frictionPoints: string[];
  successSignal: string | null;
  interpretationStatus: 'directly-source-backed' | 'interpreted-candidate' | 'missing';
}

export interface ExperienceTouchpoint {
  touchpointId: string;
  labelAr: string;
  labelEn: string;
  experienceAreaCandidateIds: string[];
  relatedZoneIds: string[];
  relatedEntityIds: string[];
  truthClass: ExperienceTruthClass;
  sourceTraceIds: string[];
}

export interface ExperienceAreaCandidate {
  experienceAreaCandidateId: string;
  labelAr: string;
  labelEn: string;
  semanticContentsAr: string[];
  relatedEntityIds: string[];
  unresolvedSemanticContentsAr: string[];
  sourceMapReference: string;
  status: 'candidate';
  geometryStatus: 'none';
  capacityStatus: 'unknown';
  routeStatus: 'unapproved';
  cadAlignmentStatus: 'not-established';
  sourceTraceIds: string[];
}

export interface ExperienceSpatialRelation {
  spatialRelationId: string;
  experienceAreaCandidateId: string;
  relatedZoneIds: string[];
  relatedEntityIds: string[];
  relationStatus: 'source-backed-candidate' | 'interpreted-candidate' | 'unresolved';
  geometryAuthority: 'none';
  sourceTraceIds: string[];
  notesAr: string[];
}

export interface JourneyStep {
  journeyStepId: string;
  eventDayId: string;
  touchpointId: string;
  labelAr: string;
  labelEn: string;
  order: number;
  relatedZoneIds: string[];
  relatedEntityIds: string[];
  relatedDecisionIds: string[];
  relatedRequirementIds: string[];
  relatedEvidenceIds: string[];
  experienceAreaCandidateIds: string[];
  sceneAssetIds: string[];
  contentCueIds: string[];
  experienceIntent: ExperienceIntent;
  outcomeIntentAr: string | null;
  expectedTime: string | null;
  spatialStatus: 'candidate-anchor' | 'semantic-only' | 'unresolved-no-anchor';
  truthClass: ExperienceTruthClass;
  sourceTraceIds: string[];
}

export interface JourneyVariant {
  journeyId: string;
  scenarioId: string;
  eventDayId: string;
  personaId: string;
  labelAr: string;
  labelEn: string;
  journeyStepIds: string[];
  sequenceType: 'visitor-journey' | 'ceremonial-content-sequence';
  visitorJourneyStatus: EventDayJourneyApplicability['visitorJourneyStatus'];
  spatialRouteRequired: boolean;
  sharedVisitorTransitionRequired: boolean;
  status: 'candidate' | 'fictional-test-reference';
  physicalRouteId: null;
  routeAuthority: 'none';
  sourceTraceIds: string[];
}

export interface EventDayPlan extends EventDayJourneyApplicability {
  eventDayId: string;
  scenarioId: string;
  date: string;
  labelAr: string;
  labelEn: string;
  order: number;
  primaryPersonaId: string;
  personaIds: string[];
  sourceDeclaredAttendance: SourceDeclaredAttendance;
  sourceTimeWindow: { start: string; end: string; timeZone: string } | null;
  siteCandidateIds: string[];
  programMomentIds: string[];
  journeyIds: string[];
  contentCueIds: string[];
  operationalGateIds: string[];
  sourceTraceIds: string[];
  status: 'working-candidate' | 'fictional-test-reference';
}

export const sceneAssetMediumValues = [
  'illustrated-map',
  'render-reference',
  'panorama-equirectangular',
  'panorama-cubemap',
  'gltf-model',
  'glb-model',
  'video',
  'image',
  'missing-source'
] as const;

export type SceneAssetMedium = (typeof sceneAssetMediumValues)[number];

export interface SceneHotspot {
  hotspotId: string;
  labelAr: string;
  relatedZoneIds: string[];
  relatedEntityIds: string[];
  yaw: number | null;
  pitch: number | null;
  normalizedPosition: { x: number; y: number } | null;
  status: 'candidate' | 'verified' | 'unknown';
}

export interface SceneAssetRevision {
  revisionId: string;
  revision: number;
  previousRevisionId: string | null;
  sourceHash: string | null;
  changeReason: string | null;
  status: 'candidate' | 'approved' | 'unknown';
}

export interface SceneAssetManifest {
  assetId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  scenarioIds: string[];
  eventDayIds: string[];
  personaIds: string[];
  journeyStepIds: string[];
  relatedZoneIds: string[];
  relatedEntityIds: string[];
  medium: SceneAssetMedium;
  unavailableMedium: Exclude<SceneAssetMedium, 'missing-source'> | null;
  sourceId: string | null;
  sourceHash: string | null;
  sourceRevision: string | null;
  sourcePage: number | null;
  sourceAuthority: string;
  truthClass: ExperienceTruthClass;
  approvalStatus: 'candidate' | 'approved' | 'missing' | 'unknown';
  rightsStatus: 'review-only' | 'approved' | 'missing' | 'unknown';
  capturedAt: string | null;
  generatedAt: string | null;
  dimensions: {
    width: number;
    height: number;
    unit: 'pixel' | 'point';
    status: 'source-reported' | 'verified-derivative' | 'unknown';
  } | null;
  sizeBytes: number | null;
  orientation: {
    projection: 'perspective' | 'equirectangular' | 'cubemap' | 'orthographic' | 'unknown';
    headingDegrees: number | null;
  } | null;
  pose: {
    status: 'registered' | 'candidate' | 'unknown';
    coordinateReference: string | null;
  } | null;
  units: {
    value: 'meter' | 'millimeter' | 'centimeter' | 'unknown';
    status: 'declared' | 'verified' | 'unknown';
  } | null;
  cubemapFaces: Array<{ face: 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz'; width: number; height: number }> | null;
  hotspots: SceneHotspot[];
  fallbackAssetId: string | null;
  localPreviewUri: string | null;
  revision: SceneAssetRevision;
  notes: string[];
}

export interface DailyLearningDraft {
  dailyLearningId: string;
  eventDayId: string;
  observationAr: string;
  proposedChangeAr: string;
  relatedJourneyStepIds: string[];
  status: 'local-draft';
  baselineMutationAllowed: false;
}

export interface ExperienceProjection {
  journeyStepId: string;
  relatedRequirementIds: string[];
  readinessDisposition: 'cannot-determine' | 'not-applicable-to-reference';
  readinessExplanationAr: string;
  relatedDecisionIds: string[];
  decisionStateAr: string;
  relatedEvidenceIds: string[];
  evidenceStateAr: string;
  sourceStatusAr: string;
  spatialStatusAr: string;
  mutationAllowed: false;
}

export interface ExperiencePack {
  schemaVersion: '1.0.0';
  packId: string;
  packVersion: string;
  projectId: string;
  eventId: string;
  venueId: string;
  organizationId: string;
  labelAr: string;
  labelEn: string;
  eventType: string;
  packageStatus: 'candidate' | 'fictional-test-reference';
  sourceClassification: 'source-backed-candidate' | 'fictional-test-reference';
  frozen: false;
  activated: false;
  baseline: false;
  operationalApproval: 'none';
  revision: number;
  contentHash: string;
  sourceIds: string[];
  sourceTraces: ExperienceSourceTrace[];
  scenarios: ExperienceScenario[];
  eventDays: EventDayPlan[];
  siteCandidates: EventSiteCandidate[];
  personas: ExperiencePersona[];
  operationalLenses: OperationalLens[];
  journeys: JourneyVariant[];
  journeySteps: JourneyStep[];
  touchpoints: ExperienceTouchpoint[];
  experienceAreas: ExperienceAreaCandidate[];
  spatialRelations: ExperienceSpatialRelation[];
  programMoments: ProgramMoment[];
  contentCues: ContentCue[];
  sceneAssets: SceneAssetManifest[];
  dailyLearningDrafts: DailyLearningDraft[];
  defaultSelection: {
    scenarioId: string;
    eventDayId: string;
    personaId: string;
    journeyId: string;
    journeyStepId: string;
    lens: OperationalLensId;
    mapMode: ExperienceMapMode;
    viewMode: ExperienceViewMode;
  };
  limitationsAr: string[];
}

export type DigitalRehearsalStatus = 'idle' | 'playing' | 'paused' | 'completed';

export interface DigitalRehearsalState {
  status: DigitalRehearsalStatus;
  eventDayId: string | null;
  personaId: string | null;
  journeyId: string | null;
  currentJourneyStepId: string | null;
  comparedEventDayId: string | null;
  sequenceRevision: number;
  truthLabelAr: 'تسلسل مرشح للمراجعة، وليس محاكاة تشغيلية حية';
}

export interface ExperienceSelectionContext {
  organizationId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  scenarioId: string;
  eventDayId: string | null;
  personaId: string | null;
  journeyId: string | null;
  journeyStepId: string | null;
  operationalJourneyCandidateId: string | null;
  operationalJourneyWaypointId: string | null;
  selectedEntityId: string | null;
  selectedZoneId: string | null;
  selectedExperienceAreaId: string | null;
  selectedTouchpointId: string | null;
  selectedSceneAssetId: string | null;
  selectedSceneHotspotId: string | null;
  sceneViewerMode: SceneViewerProjection['mode'];
  sceneTruthLens: SceneViewerProjection['truthLens'];
  sceneComparisonPairId: string | null;
  designSceneLens: DesignSceneLens;
  designSceneViewpointId: string | null;
  designSceneQualityProfile: DesignSceneQualityProfile;
  designCameraTourPlaying: boolean;
  designPresentationMode: boolean;
  designTruthDrawerOpen: boolean;
  goldenJourneyScreen: GoldenJourneyScreen | null;
  selectedLandmarkId: string | null;
  lens: OperationalLensId;
  mapMode: ExperienceMapMode;
  viewMode: ExperienceViewMode;
  reviewMode: ExperienceReviewMode;
  presentationStep: number;
  presentationPaused: boolean;
  storyMapViewport: StoryMapViewport;
  visibleStoryMapLayerIds: string[];
  storyMapLayerOpacity: Record<string, number>;
  storyMapComparison: StoryMapComparisonState;
  rehearsalState: DigitalRehearsalState;
}

export interface ExperiencePackValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  severity: 'blocking' | 'warning';
}

export interface ExperiencePackValidationResult {
  valid: boolean;
  schemaValid: boolean;
  issues: ExperiencePackValidationIssue[];
  pack: ExperiencePack | null;
}

export interface ExperiencePackDifference {
  path: string;
  labelAr: string;
  before: unknown;
  after: unknown;
}

export interface ExperiencePackCandidateRevision {
  revisionId: string;
  packId: string;
  revision: number;
  previousContentHash: string;
  contentHash: string;
  changeReason: string;
  actorClassification: 'local-candidate-author';
  status: 'candidate-draft';
  differences: ExperiencePackDifference[];
  pack: ExperiencePack;
}

// Named projections keep the authoring vocabulary stable without introducing a second truth store.
export type ExperienceProgram = readonly ProgramMoment[];
export type ExperienceContent = readonly ContentCue[];
export type ExperienceRehearsal = DigitalRehearsalState;
export type DailyLearning = DailyLearningDraft;
export type SourceTrace = ExperienceSourceTrace;
export type ValidationResult = ExperiencePackValidationResult;
