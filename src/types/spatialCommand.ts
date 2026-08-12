import type {
  CandidateExperienceRelationship,
  CandidateSourceLayer,
  CandidateSpatialEntity,
  FieldEvidenceInventorySnapshot,
  SourceAssetManifest
} from './sourceIntake';
import type { SpatialDisplayLayer } from './spatialMap';
import type { SpatialTruthPack } from './spatialTruth';

export const spatialCommandModeValues = ['experience', 'executive', 'journey'] as const;
export type SpatialCommandMode = (typeof spatialCommandModeValues)[number];

export const spatialCommandViewModeValues = ['top', 'presentation'] as const;
export type SpatialCommandViewMode = (typeof spatialCommandViewModeValues)[number];

export const spatialCommandEditingModeValues = ['none', 'candidate-anchors'] as const;
export type SpatialCommandEditingMode = (typeof spatialCommandEditingModeValues)[number];

export interface SpatialCommandTruthContext {
  packageStatus: 'candidate';
  operationalBaselineStatus: 'absent';
  geometryAuthority: 'none';
  liveDataStatus: 'absent';
  routeAuthority: 'none';
  readinessInference: 'prohibited';
  scaleStatus: 'unknown';
  crsStatus: 'unknown';
  drawingApprovalStatus: 'missing';
  calibrationStatus: 'incomplete';
}

export interface SpatialCommandExperienceObject {
  experienceObjectId: string;
  labelAr: string;
  legacyAliasEn: string | null;
  sequence: number;
}

export interface SpatialCommandEntityRelationship extends CandidateExperienceRelationship {
  requiredApprovalAr: string;
}

export interface NarrativeConnection {
  narrativeConnectionId: string;
  fromStepId: string;
  toStepId: string;
  connectionKind: 'storytelling-only';
  physicalRouteAuthority: 'none';
  disclosureAr: 'تسلسل قصصي — ليس مسارًا ميدانيًا معتمدًا';
}

export interface SpatialRoute {
  spatialRouteId: string;
  geometryAuthority: 'approved';
  geometrySourceId: string;
  routeApprovalId: string;
}

export interface NarrativeJourneyStep {
  stepId: string;
  sequence: number;
  labelAr: string;
  descriptionAr: string;
  experienceObjectId: string;
  candidateEntityIds: string[];
  status: 'candidate' | 'conflicted' | 'unresolved';
  narrativeOnly: true;
  operatorNoticeAr: string | null;
}

export interface SpatialNarrativeJourney {
  journeyId: string;
  labelAr: string;
  physicalRouteId: null;
  routeAuthority: 'none';
  playbackStepDurationMs: number;
  steps: NarrativeJourneyStep[];
  connections: NarrativeConnection[];
}

export interface SpatialExecutiveBlocker {
  blockerId: string;
  labelAr: string;
  category: 'source-integrity' | 'terminology' | 'mapping' | 'classification' | 'geometry-control' | 'missing-source';
  affectedCandidateEntityIds: string[];
  affectedExperienceObjectIds: string[];
  whyItMattersAr: string;
  requiredDecisionAr: string;
  decisionAuthority: 'founder' | 'independent-authority';
  decisionAuthorityAr: string;
  nextAcceptedEvidenceAr: string;
  decisionState?: 'open' | 'founder-frozen';
}

export interface SpatialEvidenceSummary {
  inventory: FieldEvidenceInventorySnapshot;
  exactGpsExposed: false;
  personalIdentifiersExposed: false;
  readinessMutationAllowed: false;
  statusAr: string;
}

export interface SpatialVisualConfiguration {
  mapAdapterId: string;
  projectLabelAr: string;
  venueLabelAr: string;
  mapAspectRatio: number;
  initialZoom: number;
  minimumZoom: number;
  maximumZoom: number;
  defaultViewMode: SpatialCommandViewMode;
  projectCoverUri: string | null;
  visitorMapInputSpecUri: string | null;
  accent: 'botanical';
}

export interface SpatialSourceLayerOperatorContext {
  eyebrowAr: string;
  titleAr: string;
  summaryAr: string;
  canvasTitleAr: string;
  canvasSummaryAr: string;
  facts: ReadonlyArray<{
    labelAr: string;
    valueAr: string;
  }>;
}

export interface SpatialCommandSourceLayer extends CandidateSourceLayer {
  operatorContext: SpatialSourceLayerOperatorContext;
}

export interface SpatialSourceRisk {
  riskId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'mitigated' | 'resolved';
  labelAr: string;
  summaryAr: string;
}

export interface SpatialSourceTruth {
  sources: SourceAssetManifest[];
  compactTruthAr: string;
  riskIds: string[];
  risks: SpatialSourceRisk[];
}

export interface SpatialTechnicalRoute {
  technicalRouteId: string;
  labelAr: string;
  workspace: 'spatial-authoring';
  sourceLayerId: string | null;
  navigationKind: 'technical-workspace';
}

export interface SpatialDesignSceneLink {
  designSceneLinkId: string;
  sceneAssetId: string;
  labelAr: string;
  relatedEntityIds: string[];
  relatedExperienceObjectIds: string[];
  relationshipStatus: 'proposed' | 'confirmed';
  authorityStatusAr: string;
}

export interface SpatialUnresolvedItem {
  unresolvedItemId: string;
  labelAr: string;
  candidateEntityIds: string[];
  experienceObjectIds: string[];
  recommendationAr: string;
  authorityState: 'unresolved' | 'conflicted' | 'missing';
}

export interface SpatialStoryPresentationPhase {
  phaseId: string;
  labelAr: string;
  mode: SpatialCommandMode;
  journeyStepId?: string;
  viewMode?: SpatialCommandViewMode;
}

export interface SpatialStoryPresentation {
  durationLabelAr: string;
  phaseDurationMs: number;
  phases: SpatialStoryPresentationPhase[];
}

export interface SpatialCommandExperienceConfiguration {
  schemaVersion: '1.0.0';
  configurationId: string;
  version: string;
  contentHash: string;
  projectId: string;
  eventId: string;
  venueId: string;
  experienceTitle: string;
  truthContext: SpatialCommandTruthContext;
  sourceLayers: SpatialCommandSourceLayer[];
  displayLayers: SpatialDisplayLayer[];
  candidateEntities: CandidateSpatialEntity[];
  experienceObjects: SpatialCommandExperienceObject[];
  entityRelationships: SpatialCommandEntityRelationship[];
  narrativeJourney: SpatialNarrativeJourney;
  spatialRoutes: SpatialRoute[];
  executiveBlockers: SpatialExecutiveBlocker[];
  evidenceSummary: SpatialEvidenceSummary;
  presentation: SpatialStoryPresentation;
  visualConfiguration: SpatialVisualConfiguration;
  sourceTruth: SpatialSourceTruth;
  technicalRoutes: SpatialTechnicalRoute[];
  designSceneLinks?: SpatialDesignSceneLink[];
  unresolvedItems: SpatialUnresolvedItem[];
  spatialTruthPack: SpatialTruthPack;
}

export interface SpatialCommandRouteState {
  mode: SpatialCommandMode;
  sourceLayerId: string;
  candidateEntityId: string | null;
  journeyStepId: string;
  viewMode: SpatialCommandViewMode;
  editingMode: SpatialCommandEditingMode;
  focusMode: boolean;
  correctionCodes: string[];
}

export interface SpatialLayerSelectionState {
  activeSourceLayerId: string;
  visibleCandidateEntityId: string | null;
  suspendedCandidateEntityId: string | null;
}

export interface SpatialJourneyPlaybackState {
  stepId: string;
  playing: boolean;
  manuallySelectedEntityId: string | null;
}

export type SpatialJourneyPlaybackAction =
  | { type: 'play' }
  | { type: 'pause' | 'previous' | 'next' | 'advance' | 'reset' | 'hide' }
  | { type: 'select-step'; stepId: string }
  | { type: 'select-entity'; candidateEntityId: string };

export interface SpatialCommandValidationIssue {
  code: string;
  path: string;
  messageAr: string;
}

export interface SpatialCommandValidationResult {
  valid: boolean;
  issues: SpatialCommandValidationIssue[];
}
