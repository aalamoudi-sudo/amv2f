import type { ExperienceTruthClass, OperationalLensId } from './experienceTwin';
import type { EventDayJourneyApplicability } from './eventDayJourneyApplicability';

export const storyMapTruthClassValues = [
  'illustrative-source-backed-candidate',
  'fictional-test-reference'
] as const;

export type StoryMapTruthClass = (typeof storyMapTruthClassValues)[number];

export const storyMapLayerTypeValues = [
  'experience-areas',
  'landmarks',
  'selected-persona-journey',
  'other-persona-journeys',
  'day-specific-moments',
  'design-scene-availability',
  'unresolved-landmarks',
  'candidate-relationships',
  'readiness-overlay',
  'decision-overlay',
  'future-overlay'
] as const;

export type StoryMapLayerType = (typeof storyMapLayerTypeValues)[number];

export interface StoryMapPoint {
  x: number;
  y: number;
}

export interface StoryMapLayer {
  layerId: string;
  labelAr: string;
  type: StoryMapLayerType;
  sourceId: string | null;
  authority: 'candidate' | 'read-only-projection' | 'missing' | 'fictional-test-reference';
  defaultVisible: boolean;
  defaultOpacity: number;
  compatibleLenses: OperationalLensId[];
  truthClassification: StoryMapTruthClass | ExperienceTruthClass | 'future-unavailable';
  renderOrder: number;
  legendAr: string;
  dependencies: string[];
  futureOnly: boolean;
  sensitive: boolean;
}

export interface StoryMapIcon {
  iconId: string;
  labelAr: string;
  symbol: 'arrival' | 'reception' | 'vip' | 'model' | 'corridor' | 'memorial' | 'garden' | 'rest' | 'memory' | 'media' | 'press' | 'dinner' | 'gift' | 'show' | 'drone' | 'fireworks' | 'exhibition' | 'conference';
}

export interface StoryMapLabel {
  labelId: string;
  textAr: string;
  textEn: string;
  offset: StoryMapPoint;
  visibility: 'always' | 'selected-or-zoomed' | 'technical-only';
}

export interface StoryMapArea {
  storyAreaId: string;
  experienceAreaCandidateId: string;
  labelAr: string;
  labelEn: string;
  center: StoryMapPoint;
  radius: StoryMapPoint;
  tone: 'arrival' | 'hospitality' | 'activation' | 'garden' | 'rest' | 'dinner' | 'show';
  sourceTraceIds: string[];
  truthClass: StoryMapTruthClass;
  geometryAuthority: 'none';
}

export type StoryMapLandmarkKind = 'journey' | 'independent-landmark' | 'unresolved' | 'site-program';

export interface StoryMapLandmark {
  landmarkId: string;
  labelAr: string;
  labelEn: string;
  kind: StoryMapLandmarkKind;
  normalizedPosition: StoryMapPoint | null;
  label: StoryMapLabel;
  iconId: string;
  emphasis: 'primary' | 'standard' | 'quiet' | 'warning';
  relatedEntityIds: string[];
  relatedZoneIds: string[];
  relatedExperienceAreaIds: string[];
  relatedJourneyStepIds: string[];
  relatedSceneAssetIds: string[];
  eventDayIds: string[];
  personaIds: string[];
  sourceTraceIds: string[];
  truthClass: StoryMapTruthClass;
  anchorStatus: 'illustrative-normalized' | 'unresolved-no-anchor';
  engineeringStatus: 'unverified';
  routeAuthority: 'none';
  nextRequiredInputAr: string;
}

export interface NarrativeRouteSegment {
  segmentId: string;
  fromStopId: string;
  toStopId: string;
  fromLandmarkId: string | null;
  toLandmarkId: string | null;
  routeSemantics: 'narrative-sequence';
  transitionId: string | null;
  visualStyle: 'solid' | 'dashed' | 'transition';
  spatialRouteId: null;
  distance: null;
  travelTime: null;
}

export interface NarrativeTransition {
  transitionId: string;
  transitionType: 'same-site-narrative' | 'synchronized-program-transition';
  labelAr: string;
  fromSiteCandidateId: string;
  toSiteCandidateId: string;
  sourceTraceIds: string[];
  physicalRouteId: null;
  routeAuthority: 'none';
  truthLabelAr: string;
}

export interface JourneyStopPresentation {
  stopId: string;
  journeyStepId: string;
  landmarkId: string | null;
  siteCandidateId: string;
  order: number;
  labelAr: string;
  narrativeCopyAr: string;
  intendedEmotionAr: string | null;
  scenePriority: 'primary' | 'supporting' | 'missing';
  sourceTraceIds: string[];
}

export interface PersonaJourneyRoute {
  personaJourneyRouteId: string;
  journeyId: string;
  eventDayId: string;
  personaId: string;
  labelAr: string;
  narrativeAr: string;
  stopIds: string[];
  segments: NarrativeRouteSegment[];
  transitionIds: string[];
  journeyApplicability: 'candidate-narrative' | 'not-applicable';
  routeSemantics: 'narrative-sequence' | 'ceremonial-context-sequence';
  visitorJourneyStatus: EventDayJourneyApplicability['visitorJourneyStatus'];
  spatialRouteRequired: boolean;
  sharedVisitorTransitionRequired: boolean;
  spatialRouteId: null;
  sourceTraceIds: string[];
}

export interface StoryMapTheme {
  themeId: string;
  labelAr: string;
  palette: {
    canopy: string;
    garden: string;
    stone: string;
    gold: string;
    water: string;
    paper: string;
    ink: string;
  };
  treatment: 'premium-botanical-schematic';
  originalVisualLanguage: true;
}

export interface StoryMapDefinition {
  schemaVersion: '1.0.0';
  storyMapId: string;
  labelAr: string;
  labelEn: string;
  version: string;
  projectId: string;
  eventId: string;
  venueId: string;
  experiencePackId: string;
  classification: StoryMapTruthClass;
  sourceIds: string[];
  sourceTraceIds: string[];
  coordinateSpace: 'normalized-illustrative';
  engineeringGeometry: false;
  spatialRouteAuthority: 'none';
  truthLabelAr: string;
  walkTruthLabelAr: string;
  theme: StoryMapTheme;
  layers: StoryMapLayer[];
  icons: StoryMapIcon[];
  areas: StoryMapArea[];
  landmarks: StoryMapLandmark[];
  journeyStops: JourneyStopPresentation[];
  personaRoutes: PersonaJourneyRoute[];
  transitions: NarrativeTransition[];
  defaultViewport: StoryMapViewport;
  limitationsAr: string[];
}

export interface StoryMapViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface StoryMapCameraState extends StoryMapViewport {
  cameraMode: 'overview' | 'selected' | 'presentation';
  focusedLandmarkId: string | null;
}

export type StoryMapComparisonMode = 'none' | 'day' | 'persona' | 'lens' | 'source';

export interface StoryMapComparisonState {
  mode: StoryMapComparisonMode;
  compareEventDayId: string | null;
  comparePersonaId: string | null;
  compareLens: OperationalLensId | null;
}

export interface StoryMapRevision {
  revisionId: string;
  storyMapId: string;
  revision: number;
  parentRevisionId: string | null;
  contentHash: string;
  authoringReason: string;
  actorStatus: 'local-candidate-author-untrusted';
  createdAtStatus: 'local-process-time-untrusted';
  changedFields: string[];
  sourceRelationship: 'derived-from-source-backed-candidate';
  truthClass: StoryMapTruthClass;
  definition: StoryMapDefinition;
}

export interface StoryMapAuthoringDraft {
  baseRevision: StoryMapRevision;
  workingDefinition: StoryMapDefinition;
  undoStack: StoryMapDefinition[];
  redoStack: StoryMapDefinition[];
  selectedLandmarkId: string | null;
  authoringReason: string;
  dirty: boolean;
}

export interface StoryMapProjection {
  storyMapId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  eventDayId: string;
  personaId: string;
  journeyId: string;
  currentJourneyStepId: string;
  currentStop: JourneyStopPresentation | null;
  currentLandmark: StoryMapLandmark | null;
  route: PersonaJourneyRoute;
  visibleLandmarks: StoryMapLandmark[];
  unresolvedLandmarks: StoryMapLandmark[];
  relatedLandmarkIds: string[];
  visibleLayers: StoryMapLayer[];
  comparison: StoryMapComparisonProjection | null;
  mutationAllowed: false;
}

export interface StoryMapComparisonProjection {
  mode: Exclude<StoryMapComparisonMode, 'none'>;
  labelAr: string;
  sharedLandmarkIds: string[];
  primaryOnlyLandmarkIds: string[];
  comparisonOnlyLandmarkIds: string[];
  changedSequence: boolean;
  unknownRelationshipCount: number;
  missingSceneCount: number;
  differentExperienceIntent: boolean;
}

export interface StoryMapValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  severity: 'blocking' | 'warning';
}

export interface StoryMapValidationResult {
  valid: boolean;
  issues: StoryMapValidationIssue[];
}

export interface StoryMapAuthoringChange {
  type: 'move-landmark' | 'move-label' | 'change-icon' | 'change-emphasis' | 'link-step' | 'unlink-step' | 'reorder-route';
  landmarkId?: string;
  journeyStepId?: string;
  stopId?: string;
  routeId?: string;
  point?: StoryMapPoint;
  iconId?: string;
  emphasis?: StoryMapLandmark['emphasis'];
  orderedStopIds?: string[];
}
