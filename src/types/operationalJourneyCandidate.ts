import type { DeliveryAuthorityStatus, ExperienceDeliveryState, OperationalDeliveryManifest } from './experienceDelivery';
import type { EventDayJourneyApplicability, ExperienceTruthCorrectionRevision } from './eventDayJourneyApplicability';

export type OperationalJourneyMovementMode = 'car' | 'walking' | 'golf-cart' | 'unknown';

export type OperationalJourneyDurationAccountingMode = 'inclusive' | 'unresolved';

export type OperationalJourneyWaypointKind =
  | 'spatial-destination'
  | 'program-moment'
  | 'service-action'
  | 'compound-program-moment'
  | 'unresolved-touchpoint';

export type OperationalJourneyMappingStatus =
  | 'candidate-entity-relationship'
  | 'candidate-touchpoint'
  | 'unmapped-review-required'
  | 'unresolved';

export interface OperationalJourneyTravelLegCandidate {
  travelLegId: string;
  journeyId: string;
  legType: 'entry' | 'entry-transfer' | 'internal-tour' | 'exit';
  distanceMeters: number;
  reportedDurationSeconds: number;
  durationIncludedInJourneyTotal: boolean;
  movementMode: OperationalJourneyMovementMode;
  movementModeStatus: 'explicitly-reported' | 'not-explicitly-established';
  sourcePage: number;
  authorityStatus: DeliveryAuthorityStatus;
  spatialRegistrationStatus: 'unregistered';
}

export interface OperationalJourneyWaypointCandidate {
  waypointId: string;
  journeyId: string;
  sourcePage: number;
  sourceLetter: string;
  sourceLabelAr: string;
  dwellMinutes: number | null;
  semanticKind: OperationalJourneyWaypointKind;
  movementMode: OperationalJourneyMovementMode | 'not-applicable';
  incomingTravelLegId: string | null;
  outgoingTravelLegId: string | null;
  destinationIds: string[];
  touchpointIds: string[];
  destinationMappingStatus: OperationalJourneyMappingStatus;
  sourceConfidence: 'high' | 'medium' | 'low';
  authorityStatus: DeliveryAuthorityStatus;
  spatialRegistrationStatus: 'unregistered' | 'not-applicable';
  notesAr: string[];
}

export interface OperationalJourneyDurationReconciliation {
  durationAccountingMode: OperationalJourneyDurationAccountingMode;
  authoritativeCandidateTotalMinutes: number;
  reportedTotalMinutes: number;
  reportedWindowStart: string;
  reportedWindowEnd: string;
  windowDurationMinutes: number;
  dwellDurationMinutes: number;
  travelDurationMinutes: number;
  componentsStrictlySequential: false;
  componentDurationsIncludedInJourneyTotal: boolean;
  status: 'internally-consistent-by-founder-clarification' | 'reported-total-window-conflict';
  blockingConflict: boolean;
  historicalSequentialDiagnostic: {
    diagnosticId: string;
    calculationMode: 'legacy-sequential-addition';
    combinedCalculatedMinutes: number;
    differenceAgainstReportedMinutes: number;
    differenceAgainstWindowMinutes: number;
    status: 'resolved-by-inclusive-duration-accounting';
    activeBlocker: false;
  };
  notesAr: string[];
}

export interface OperationalJourneyDurationClarification {
  clarificationId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  effectiveDate: string;
  recordedAt: string;
  timeTrust: 'founder-directed-date';
  authorityType: 'founder-product-authority';
  authorityReferenceId: string;
  approvedBy: string;
  approvalScope: 'candidate-duration-accounting';
  sourceRevision: string;
  durationAccountingMode: 'inclusive';
  affectedJourneyIds: string[];
  resolvedConflictIds: string[];
  resolvedGapIds: string[];
  previousDiagnosticAr: string;
  founderClarificationAr: string;
  legalProjectionAr: string;
  limitationsAr: string[];
}

export interface OperationalJourneyCandidatePlan {
  journeyId: string;
  packageId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  dayId: string;
  date: string;
  labelAr: string;
  personaIds: string[];
  personaLabelsAr: string[];
  sourceId: string;
  sourcePage: number;
  sourceTraceId: string;
  sourceRevision: string;
  sourceAuthority: DeliveryAuthorityStatus;
  candidateStatus: 'received-validated-working-candidate';
  founderReview: 'pending';
  operationalApproval: 'not-established';
  routeApproval: 'not-established';
  engineeringRegistration: 'not-established';
  routeOverlayClassification: 'illustrative-unregistered-route-overlay';
  reportedWindow: { start: string; end: string; timeZone: 'Asia/Riyadh' };
  originalSourceReportedTotalMinutes: number;
  reportedTotalMinutes: number;
  durationAccountingMode: 'inclusive';
  durationClarificationId: string;
  travelLegs: OperationalJourneyTravelLegCandidate[];
  waypoints: OperationalJourneyWaypointCandidate[];
  durationReconciliation: OperationalJourneyDurationReconciliation;
  conflictIds: string[];
  notesAr: string[];
}

export interface OperationalCandidateTouchpoint {
  touchpointId: string;
  labelAr: string;
  aliasesAr: string[];
  classification: 'candidate-touchpoint';
  authorityStatus: DeliveryAuthorityStatus;
  spatialRegistrationStatus: 'unregistered';
  sourceTraceIds: string[];
  conflictIds: string[];
}

export interface OperationalJourneyConflict {
  conflictId: string;
  titleAr: string;
  detailAr: string;
  severity: 'blocking' | 'warning';
  journeyIds: string[];
  sourceTraceIds: string[];
  status: 'open' | 'resolved-by-founder-clarification';
  requiredResolverAr: string;
  resolutionId: string | null;
  resolutionAr: string | null;
}

export interface OperationalJourneyGap {
  gapId: string;
  labelAr: string;
  blocking: boolean;
  requiredAuthorityAr: string;
  status: 'open' | 'resolved-by-founder-clarification';
  resolutionId: string | null;
  resolutionAr: string | null;
}

export interface OperationalRouteSourceRelationship {
  relationshipId: string;
  previousSourceId: string;
  incomingSourceId: string;
  relationship: 'proposed-supersession';
  status: 'pending-founder-review';
  automaticSupersessionAllowed: false;
  notesAr: string[];
}

export interface OperationalRehearsalComparison {
  frozenPlanId: string;
  frozenPlanHash: string;
  frozenPlanRevision: number;
  incomingPackageId: string;
  proposedRevisionStatus: 'preview-only';
  frozenPlanMutationAllowed: false;
  readinessMutationAllowed: false;
  decisionApprovalAllowed: false;
  differencesAr: string[];
}

export interface OperationalJourneyDayScope extends EventDayJourneyApplicability {
  dayId: string;
  date: string;
  labelAr: string;
  sourceScopeStatus: 'covered-by-package' | 'not-applicable-by-founder-direction';
  correctionRevisionId: string | null;
}

export interface OperationalJourneyCandidatePackage {
  schemaVersion: '1.0.0';
  packageId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  sourceId: string;
  sourceName: string;
  sourceHash: string;
  sourceByteSize: number;
  sourcePageCount: number;
  sourceAuthority: DeliveryAuthorityStatus;
  packageStatus: 'received-validated-working-candidate';
  intakeState: ExperienceDeliveryState;
  fingerprintStatus: 'verified';
  founderReview: 'pending';
  operationalApproval: 'not-established';
  routeApproval: 'not-established';
  canonicalSpatialRouteCount: 0;
  rawSourceRetention: 'private-local-outside-git';
  browserPathDisclosure: 'redacted';
  routeOverlayClassification: 'illustrative-unregistered-route-overlay';
  sourceMetadata: {
    producer: string;
    createdAtReported: string;
    modifiedAtReported: string;
    pdfVersion: string;
    encrypted: false;
    pageSizePoints: { width: number; height: number };
  };
  manifest: OperationalDeliveryManifest;
  journeys: OperationalJourneyCandidatePlan[];
  candidateTouchpoints: OperationalCandidateTouchpoint[];
  conflicts: OperationalJourneyConflict[];
  resolvedConflicts: OperationalJourneyConflict[];
  gaps: OperationalJourneyGap[];
  resolvedGaps: OperationalJourneyGap[];
  durationClarifications: OperationalJourneyDurationClarification[];
  truthCorrectionRevisions: ExperienceTruthCorrectionRevision[];
  dayScopes: OperationalJourneyDayScope[];
  applicableRouteDayIds: string[];
  routeScopeCoverage: 'complete-for-current-applicable-days';
  sourceRelationship: OperationalRouteSourceRelationship;
  rehearsalComparison: OperationalRehearsalComparison;
  contentHash: string;
}
