import type { EventDayJourneyApplicability, ExperienceTruthCorrectionRevision } from './eventDayJourneyApplicability';

export const experienceReviewTruthClassificationValues = [
  'approved-source',
  'founder-supplied-working-candidate',
  'source-backed-candidate',
  'rehearsal-only',
  'proposed',
  'conflicted',
  'unresolved',
  'missing',
  'restricted',
  'reported-unverified',
  'not-applicable'
] as const;

export type ExperienceReviewTruthClassification = (typeof experienceReviewTruthClassificationValues)[number];

export type SourceResolutionStatus =
  | 'open'
  | 'accepted-working-candidate'
  | 'superseded'
  | 'restricted-pending-authority'
  | 'resolved-by-authoritative-source'
  | 'not-applicable';

export interface ExperienceSourceManifest {
  schemaVersion: '1.0.0';
  sourceId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  sourceName: string;
  sourceType: 'presentation-pdf' | 'route-proposal-pdf' | 'program-book-pdf' | 'fictional-reference';
  sourceClassification: ExperienceReviewTruthClassification;
  expectedByteSize: number | null;
  expectedSha256: string | null;
  observedByteSize: number | null;
  observedSha256: string | null;
  pageCount: number | null;
  verificationStatus: 'validated-local-snapshot' | 'fictional-reference' | 'missing' | 'hash-mismatch';
  rightsStatus: 'review-only' | 'fictional' | 'unknown';
  privacyStatus: 'sanitized-metadata-only';
  retentionStatus: 'raw-source-outside-git' | 'no-raw-source';
  clientVisibility: 'summary-only' | 'safe-source-name-and-page' | 'hidden';
  operationalUsability: 'candidate-context-only' | 'not-operationally-usable';
  notesAr: string[];
}

export interface SourceFactTrace {
  traceId: string;
  sourceId: string;
  sourceName: string;
  sourceHash: string;
  sourcePage: number;
  sourceLocator: string;
  sourceClassification: ExperienceReviewTruthClassification;
  extractionTimestampClassification: 'local-process-time-untrusted' | 'not-recorded';
  extractionMethod: 'human-reviewed-pdf-extraction' | 'deterministic-structured-projection';
  confidence: 'high' | 'medium' | 'low';
  reviewStatus: 'reviewed' | 'needs-founder-resolution' | 'restricted-review';
  clientVisibility: 'visible' | 'summary-only' | 'hidden';
  operationalUsability: 'candidate-context-only' | 'not-operationally-usable' | 'blocked';
  sanitizedMeaningAr: string;
}

export interface SourceFact {
  factId: string;
  factType: 'attendance' | 'date' | 'program' | 'time' | 'route' | 'content' | 'technology' | 'spatial-semantics' | 'asset-status';
  labelAr: string;
  value: string | number | null;
  unit: string | null;
  classification: ExperienceReviewTruthClassification;
  trace: SourceFactTrace;
  conflictIds: string[];
  supersedesFactIds: string[];
  resolutionStatus: SourceResolutionStatus;
}

export interface SourceConflict {
  conflictId: string;
  titleAr: string;
  descriptionAr: string;
  classification: 'conflicted' | 'unresolved' | 'restricted';
  sourceTraceIds: string[];
  affectedFactIds: string[];
  affectedDayIds: string[];
  resolutionStatus: SourceResolutionStatus;
  requiredResolverAr: string;
  safeClientSummaryAr: string;
  restrictedDetailsExcluded: boolean;
}

export interface DayDefinition extends EventDayJourneyApplicability {
  dayId: string;
  date: string;
  order: number;
  labelAr: string;
  purposeAr: string;
  audienceAr: string;
  attendance: { value: number | null; qualifier: 'more-than' | 'approximately' | 'unknown'; classification: 'source-declared-not-capacity' };
  siteIds: string[];
  transitionStatus: 'not-applicable' | 'unknown' | 'candidate-only';
  routeSelectionStatus: 'not-applicable' | 'unselected' | 'unresolved';
  truthClassification: ExperienceReviewTruthClassification;
  sourceTraceIds: string[];
  conflictIds: string[];
}

export interface PersonaDefinition {
  personaDefinitionId: string;
  labelAr: string;
  labelEn: string;
  personaType: string;
  dayIds: string[];
  classification: ExperienceReviewTruthClassification;
  sourceTraceIds: string[];
  notesAr: string[];
}

export interface JourneyCandidate {
  journeyCandidateId: string;
  dayId: string;
  personaDefinitionIds: string[];
  momentIds: string[];
  routePlanCandidateIds: string[];
  sequenceType: 'visitor-journey' | 'ceremonial-content-sequence';
  visitorJourneyStatus: EventDayJourneyApplicability['visitorJourneyStatus'];
  spatialRouteRequired: boolean;
  sharedVisitorTransitionRequired: boolean;
  status: 'source-backed-candidate' | 'rehearsal-only';
  physicalRouteAuthority: 'none';
  sourceTraceIds: string[];
}

export interface RoutePlanCandidate {
  routePlanCandidateId: string;
  dayId: string;
  labelAr: string;
  proposalNumber: number;
  sourceTraceIds: string[];
  classification: 'proposed';
  selected: false;
  approved: false;
  geometryIngested: false;
  notesAr: string[];
}

export interface ExperienceDestination {
  destinationId: string;
  entityId: string;
  labelAr: string;
  creativeLabelAr: string | null;
  destinationType: 'journey-destination' | 'independent-landmark';
  spatialStatus: 'candidate-anchor' | 'conflicted' | 'unresolved-no-anchor' | 'independent-landmark';
  engineeringStatus: 'unverified';
  operationalStatus: 'unavailable';
  sourceTraceIds: string[];
  notesAr: string[];
}

export interface ExperienceContentCandidate {
  contentCandidateId: string;
  contentType: 'main-show' | 'intro-film' | 'ages-station' | 'experience-technology';
  labelAr: string;
  durationMinutes: number | null;
  stationOrder: number | null;
  classification: 'source-backed-candidate' | 'proposed';
  sourceTraceIds: string[];
  approvalStatus: 'not-approved';
  notesAr: string[];
}

export interface SceneAssetRequirement {
  sceneAssetRequirementId: string;
  labelAr: string;
  medium: '360-panorama' | 'production-glb' | 'flat-render-reference' | 'route-authority' | 'engineering-registration' | 'content-master';
  availability: 'available-candidate-reference' | 'missing' | 'restricted';
  truthClassification: ExperienceReviewTruthClassification;
  relatedDayIds: string[];
  relatedDestinationIds: string[];
  blocksAr: string;
  notesAr: string[];
}

export interface FourDayExperienceTruthProjection {
  schemaVersion: '1.0.0';
  projectionId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  revision: number;
  supersedesProjectionId: string | null;
  previousContentHash: string | null;
  changeReasonAr: string | null;
  revisionLineage: Array<{
    projectionId: string;
    revision: number;
    contentHash: string;
  }>;
  contentHash: string;
  state: 'candidate-review' | 'fictional-reference';
  operationalReadiness: 'cannot-determine' | 'not-applicable';
  sourceManifests: ExperienceSourceManifest[];
  sourceFacts: SourceFact[];
  sourceConflicts: SourceConflict[];
  days: DayDefinition[];
  personas: PersonaDefinition[];
  journeys: JourneyCandidate[];
  routePlans: RoutePlanCandidate[];
  destinations: ExperienceDestination[];
  unresolvedSpatialObjectIds: string[];
  contentCandidates: ExperienceContentCandidate[];
  sceneAssetRequirements: SceneAssetRequirement[];
  correctionRevisions: ExperienceTruthCorrectionRevision[];
  preservedCounts: {
    programMoments: number;
    personaVariants: number;
    executionSteps: number;
    candidateDestinations: number;
  };
  clientPresentationSteps: Array<{
    presentationStepId: string;
    order: number;
    titleAr: string;
    summaryAr: string;
    dayId: string | null;
    entityId: string | null;
    mapMode: 'story' | 'operational' | 'illustrated' | null;
  }>;
  limitationsAr: string[];
}
