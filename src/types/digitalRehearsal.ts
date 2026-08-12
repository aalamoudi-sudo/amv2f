import type { ExperienceTruthClass } from './experienceTwin';
import type { EventDayJourneyApplicability } from './eventDayJourneyApplicability';

export const digitalRehearsalPlanStateValues = [
  'draft',
  'candidate',
  'frozen-for-rehearsal',
  'superseded',
  'archived'
] as const;
export type DigitalRehearsalPlanState = (typeof digitalRehearsalPlanStateValues)[number];

export const rehearsalRunStateValues = [
  'not-started',
  'ready',
  'running',
  'paused',
  'blocked',
  'skipped',
  'completed',
  'aborted'
] as const;
export type RehearsalRunState = (typeof rehearsalRunStateValues)[number];

export const rehearsalMomentStateValues = [
  'pending',
  'current',
  'delayed',
  'paused',
  'completed',
  'skipped',
  'blocked',
  'unknown'
] as const;
export type RehearsalMomentState = (typeof rehearsalMomentStateValues)[number];

export const rehearsalCueTypeValues = [
  'arrival',
  'protocol',
  'hospitality',
  'spatial-transition',
  'visitor-experience',
  'content',
  'audio',
  'lighting',
  'projection',
  'media',
  'photography',
  'catering',
  'transportation',
  'security',
  'accessibility',
  'operational-check',
  'decision-checkpoint',
  'departure',
  'custom'
] as const;
export type RehearsalCueType = (typeof rehearsalCueTypeValues)[number];

export const rehearsalTimeModeValues = ['manual-step', 'planned-clock', 'accelerated-rehearsal'] as const;
export type RehearsalTimeMode = (typeof rehearsalTimeModeValues)[number];

export const rehearsalLensValues = [
  'visitor',
  'executive',
  'operations',
  'protocol',
  'security-safety',
  'content-production',
  'accessibility',
  'decision',
  'source-truth'
] as const;
export type RehearsalLens = (typeof rehearsalLensValues)[number];

export const rehearsalViewValues = ['command', 'story-map', 'scene', 'comparison', 'after-action', 'client-presentation'] as const;
export type RehearsalView = (typeof rehearsalViewValues)[number];

export type RehearsalTruthStatus =
  | 'source-backed-candidate'
  | 'interpreted-candidate'
  | 'template-proposed'
  | 'unknown'
  | 'hypothetical-rehearsal-only'
  | 'rehearsal-observation-only';

export type RehearsalTimeTrust = 'source-reported' | 'rehearsal-elapsed' | 'local-device-time-untrusted' | 'not-recorded';

export interface RehearsalSourceReference {
  sourceId: string;
  sourceHash: string;
  sourceTraceIds: string[];
  sourcePages: number[];
  authority: 'founder-provided-candidate-program-and-design-reference' | 'fictional-test-reference';
}

export interface CueDependency {
  dependencyId: string;
  cueId: string;
  dependsOnCueId: string;
  dependencyType: 'finish-to-start' | 'review-before-start' | 'same-moment';
  timingOffsetMinutes: null;
  status: 'candidate' | 'unknown';
}

export interface ProgramCue {
  cueId: string;
  momentId: string;
  labelAr: string;
  labelEn: string;
  cueType: RehearsalCueType;
  ownerRoleId: string | null;
  responsibleRoleId: string | null;
  sourceTraceIds: string[];
  truthStatus: RehearsalTruthStatus;
  dependencies: CueDependency[];
  evidenceRequirementIds: string[];
  readinessRequirementIds: string[];
  decisionIds: string[];
  notesAr: string[];
}

export interface ProgramMoment {
  momentId: string;
  eventDayId: string;
  labelAr: string;
  labelEn: string;
  order: number;
  siteCandidateId: string | null;
  journeyStepId: string | null;
  touchpointId: string | null;
  sceneAssetIds: string[];
  relatedZoneIds: string[];
  relatedEntityIds: string[];
  relatedRequirementIds: string[];
  relatedDecisionIds: string[];
  relatedEvidenceIds: string[];
  cueIds: string[];
  plannedTime: string | null;
  plannedTimeClassification: 'source-reported-window' | 'ordered-without-time' | 'unknown';
  sourceTraceIds: string[];
  truthClass: ExperienceTruthClass;
  spatialStatus: 'candidate-anchor' | 'semantic-only' | 'unresolved-no-anchor' | 'multi-site-transition';
  operationalOwnerRoleId: string | null;
  missingInformationAr: string[];
}

export interface EventDayPlan extends EventDayJourneyApplicability {
  eventDayId: string;
  date: string;
  labelAr: string;
  labelEn: string;
  themeAr: string;
  order: number;
  primaryPersonaId: string;
  personaVariantIds: string[];
  attendance: {
    value: number | null;
    qualifier: 'exact' | 'approximately' | 'more-than' | 'unknown';
    classification: 'source-declared-not-capacity';
  };
  timeWindow: { start: string; end: string; timeZone: string; classification: 'source-reported-window' } | null;
  siteCandidateIds: string[];
  momentIds: string[];
  sourceTraceIds: string[];
  truthStatus: 'founder-working-candidate' | 'fictional-test-reference';
  operationalApproval: 'none';
}

export interface JourneyExecutionStep {
  executionStepId: string;
  personaVariantId: string;
  momentId: string;
  journeyStepId: string | null;
  allowed: boolean;
  purposeAr: string;
  whatTheySeeAr: string | null;
  whatTheyHearAr: string | null;
  whatTheyDoAr: string | null;
  intendedFeelingAr: string | null;
  serviceMomentsAr: string[];
  frictionPointsAr: string[];
  accessibilityConsiderationsAr: string[];
  operationalDependenciesAr: string[];
  missingSourceInformationAr: string[];
  truthStatus: RehearsalTruthStatus;
}

export interface PersonaJourneyVariant {
  personaVariantId: string;
  eventDayId: string;
  personaId: string;
  labelAr: string;
  labelEn: string;
  personaType:
    | 'royal-vvip-guest'
    | 'senior-government-guest'
    | 'host-leadership'
    | 'media-representative'
    | 'worker-family-member'
    | 'vip-guest'
    | 'operations-supervisor'
    | 'protocol-team'
    | 'security-safety-team'
    | 'content-production-team'
    | 'accessibility-support';
  baseJourneyId: string;
  purposeAr: string;
  executionStepIds: string[];
  entryAssumptionAr: string;
  exitAssumptionAr: string;
  truthStatus: 'source-backed-candidate' | 'interpreted-candidate' | 'template-proposed';
  sourceTraceIds: string[];
}

export interface RehearsalCheckpoint {
  checkpointId: string;
  momentId: string;
  labelAr: string;
  checkpointType: 'readiness' | 'decision' | 'evidence' | 'owner' | 'source-truth';
  blocking: boolean;
  status: 'unassessed' | 'missing' | 'available-read-only' | 'cannot-determine';
  relatedIds: string[];
  explanationAr: string;
}

export interface RehearsalBranch {
  branchId: string;
  contingencyId: string;
  labelAr: string;
  affectedMomentIds: string[];
  candidateAlternativeAr: string;
  returnConditionAr: string;
  activatedAtCommandId: string | null;
  returnedAtCommandId: string | null;
}

export interface RehearsalContingency {
  contingencyId: string;
  labelAr: string;
  labelEn: string;
  category:
    | 'delayed-arrival'
    | 'program-overrun'
    | 'touchpoint-unavailable'
    | 'scene-content-unavailable'
    | 'outdoor-show-unavailable'
    | 'weather-constraint'
    | 'transport-delay'
    | 'vip-route-change'
    | 'media-moment-delay'
    | 'catering-delay'
    | 'accessibility-support-failure'
    | 'missing-owner'
    | 'missing-approval'
    | 'missing-evidence';
  triggerAr: string;
  truthStatus: 'hypothetical-rehearsal-only';
  affectedMomentIds: string[];
  affectedPersonaIds: string[];
  affectedSiteIds: string[];
  candidateAlternativeAr: string;
  requiredDecisionAuthorityAr: string;
  requiredEvidenceAr: string[];
  expectedImpactAr: string;
  returnToPrimaryConditionAr: string;
  sourceTraceIds: string[];
}

export interface RehearsalObservation {
  observationId: string;
  runId: string;
  momentId: string;
  actorSessionRef: string;
  recordedAt: string;
  timeTrust: RehearsalTimeTrust;
  classification:
    | 'observation'
    | 'friction-point'
    | 'missing-information'
    | 'missing-owner'
    | 'missing-content'
    | 'missing-scene'
    | 'timing-uncertainty'
    | 'persona-conflict'
    | 'spatial-conflict'
    | 'accessibility-concern'
    | 'protocol-concern'
    | 'operational-dependency'
    | 'decision-requirement';
  descriptionAr: string;
  relatedEntityIds: string[];
  journeyStepId: string | null;
  basisAr: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  proposedNextActionAr: string;
  truthStatus: 'rehearsal-observation-only';
  supersedesObservationId: string | null;
}

export interface RehearsalIssue extends Omit<RehearsalObservation, 'observationId' | 'classification'> {
  issueId: string;
  category: RehearsalObservation['classification'];
  issueStatus: 'open' | 'decision-draft-created' | 'superseded';
  supersedesIssueId: string | null;
}

export interface RehearsalDecisionDraftLink {
  linkId: string;
  decisionId: string;
  runId: string;
  eventDayId: string;
  momentId: string;
  personaId: string;
  journeyStepId: string | null;
  relatedSpatialObjectIds: string[];
  observationAr: string;
  candidateImpactAr: string;
  sourceTraceIds: string[];
  classification: 'rehearsal-only';
  decisionStatus: 'draft';
  approvalStatus: 'draft';
}

export interface RehearsalClock {
  mode: RehearsalTimeMode;
  plannedTime: string | null;
  rehearsalElapsedSeconds: number;
  actualTime: null;
  actualTimeStatus: 'unavailable';
  deviceClockAuthority: 'none';
}

export interface RehearsalTransition {
  transitionId: string;
  runId: string;
  commandId: string;
  commandType: RehearsalCommandType;
  previousRunState: RehearsalRunState;
  nextRunState: RehearsalRunState;
  previousMomentId: string | null;
  nextMomentId: string | null;
  recordedAt: string;
  timeTrust: RehearsalTimeTrust;
  reasonAr: string | null;
  previousTransitionHash: string | null;
  transitionHash: string;
}

export interface RehearsalRunRevision {
  revisionId: string;
  runId: string;
  revision: number;
  commandId: string;
  commandFingerprint: string;
  previousRevisionHash: string | null;
  stateFingerprint: string;
  revisionHash: string;
  createdAt: string;
  timeTrust: RehearsalTimeTrust;
}

export interface RehearsalOutcome {
  outcomeId: string;
  runId: string;
  state: 'completed' | 'aborted';
  plannedMomentCount: number;
  rehearsedMomentCount: number;
  skippedMomentCount: number;
  blockedMomentCount: number;
  uncertainTimingCount: number;
  issueIds: string[];
  decisionDraftLinkIds: string[];
  contingencyIds: string[];
  missingEvidenceIds: string[];
  missingOwnerMomentIds: string[];
  missingSceneMomentIds: string[];
  unresolvedBlockerIds: string[];
  sourceLimitationsAr: string[];
}

export interface DigitalRehearsalPlan {
  schemaVersion: '1.0.0';
  planId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  experiencePackId: string;
  experiencePackHash: string;
  scenarioId: string;
  labelAr: string;
  labelEn: string;
  state: DigitalRehearsalPlanState;
  revision: number;
  previousPlanHash: string | null;
  planHash: string;
  sourceReferences: RehearsalSourceReference[];
  eventDays: EventDayPlan[];
  moments: ProgramMoment[];
  cues: ProgramCue[];
  personaVariants: PersonaJourneyVariant[];
  executionSteps: JourneyExecutionStep[];
  checkpoints: RehearsalCheckpoint[];
  contingencies: RehearsalContingency[];
  supportedLenses: RehearsalLens[];
  supportedTimeModes: RehearsalTimeMode[];
  createdAt: string;
  timeTrust: RehearsalTimeTrust;
  candidateOnly: true;
  baselineMutationAllowed: false;
  readinessMutationAllowed: false;
  evidenceVerificationAllowed: false;
  decisionApprovalAllowed: false;
  liveExecutionAllowed: false;
}

export interface DigitalRehearsalRun {
  schemaVersion: '1.0.0';
  runId: string;
  planId: string;
  planHash: string;
  projectId: string;
  eventId: string;
  venueId: string;
  eventDayId: string;
  personaVariantId: string;
  rehearsalLens: RehearsalLens;
  rehearsalScenarioId: string;
  state: RehearsalRunState;
  currentMomentId: string | null;
  selectedSiteId: string | null;
  activeBranchId: string | null;
  momentStates: Record<string, RehearsalMomentState>;
  clock: RehearsalClock;
  transitions: RehearsalTransition[];
  revisions: RehearsalRunRevision[];
  observations: RehearsalObservation[];
  issues: RehearsalIssue[];
  decisionDraftLinks: RehearsalDecisionDraftLink[];
  branchHistory: RehearsalBranch[];
  outcome: RehearsalOutcome | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  timeTrust: RehearsalTimeTrust;
  contentHash: string;
  classification: 'candidate-digital-rehearsal';
  actualExecution: false;
  baselineMutationAllowed: false;
  readinessMutationAllowed: false;
  evidenceVerificationAllowed: false;
  decisionApprovalAllowed: false;
}

export type DailyLearningState = 'observed' | 'proposed' | 'accepted-for-next-rehearsal' | 'rejected' | 'superseded';

export interface DailyLearningRecord {
  schemaVersion: '1.0.0';
  learningRecordId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  sourceRunId: string;
  eventDayId: string;
  state: DailyLearningState;
  issueIds: string[];
  observationIds: string[];
  learningItemsAr: string[];
  sourceLimitationsAr: string[];
  createdAt: string;
  timeTrust: RehearsalTimeTrust;
  revision: number;
  previousRecordHash: string | null;
  contentHash: string;
  nextDayMutationAllowed: false;
  baselineMutationAllowed: false;
}

export interface NextDayImprovementProposal {
  proposalId: string;
  sourceLearningRecordId: string;
  sourceRunId: string;
  sourceEventDayId: string;
  targetEventDayId: string;
  proposedChangesAr: string[];
  relatedMomentIds: string[];
  status: 'preview' | 'accepted-for-next-rehearsal' | 'rejected';
  reviewRequired: true;
  nextDayMutationAllowed: false;
  baselineMutationAllowed: false;
  contentHash: string;
}

export interface RehearsalProjection {
  projectionVersion: string;
  projectId: string;
  eventId: string;
  venueId: string;
  planId: string;
  runId: string | null;
  eventDayId: string;
  personaId: string;
  personaVariantId: string;
  momentId: string;
  journeyStepId: string | null;
  touchpointId: string | null;
  selectedZoneIds: string[];
  selectedEntityIds: string[];
  selectedSiteId: string | null;
  mapFocus: {
    status: 'candidate-entity-selection' | 'semantic-only' | 'unresolved';
    entityIds: string[];
    normalizedAnchor: null;
    routeAuthority: 'none';
  };
  sceneAssetId: string | null;
  activeBranchId: string | null;
  runState: RehearsalRunState;
  momentState: RehearsalMomentState;
  rehearsalClock: RehearsalClock;
  readinessSummary: { disposition: 'cannot-determine' | 'not-applicable-to-reference'; explanationAr: string; requirementIds: string[] };
  decisionSummary: { decisionIds: string[]; draftLinkIds: string[]; approvalMutationAllowed: false };
  evidenceSummary: { evidenceIds: string[]; verificationMutationAllowed: false };
  narrativeState: { currentAr: string; nextAr: string | null; truthLabelAr: string };
  visualState: { spatialStatus: ProgramMoment['spatialStatus']; sceneStatus: 'available-candidate' | 'missing' | 'unknown' };
  cueState: { cueIds: string[]; completed: boolean };
  colorSemantics: 'status-labels-primary-color-secondary';
  outputTimestamp: string;
  outputTimestampClassification: RehearsalTimeTrust;
  actualExecution: false;
  mutationAllowed: false;
}

export interface DigitalRehearsalOutputProjection extends RehearsalProjection {
  physicalStandardId: 'MEIOS-PDT-STD-001';
  physicalStandardVersion: '1.0.0';
  calibrationStatus: 'not-calibrated';
  hardwareControlAllowed: false;
  procurementAuthorized: false;
}

export interface RehearsalComparison {
  comparisonId: string;
  runIds: string[];
  dayIds: string[];
  summaries: Array<{
    runId: string;
    dayId: string;
    completedMoments: number;
    skippedMoments: number;
    blockedMoments: number;
    issueCount: number;
    contingencyCount: number;
  }>;
  readinessPercentage: null;
  truthLabelAr: string;
}

export const rehearsalCommandTypeValues = [
  'create-run',
  'start',
  'pause',
  'resume',
  'advance',
  'previous',
  'select-moment',
  'complete-moment',
  'skip-moment',
  'block-moment',
  'unblock-moment',
  'record-observation',
  'record-issue',
  'activate-contingency',
  'return-primary',
  'link-decision-draft',
  'complete-run',
  'abort-run',
  'advance-clock'
] as const;
export type RehearsalCommandType = (typeof rehearsalCommandTypeValues)[number];

export interface RehearsalCommand {
  commandId: string;
  runId: string;
  type: RehearsalCommandType;
  issuedAt: string;
  timeTrust: RehearsalTimeTrust;
  actorSessionRef: string;
  payload: Record<string, unknown>;
}

export interface RehearsalCommandResult {
  accepted: boolean;
  idempotent: boolean;
  run: DigitalRehearsalRun;
  issues: Array<{ code: string; messageAr: string; path: string }>;
}

export interface RehearsalValidationIssue {
  code: string;
  path: string;
  severity: 'blocking' | 'warning';
  messageAr: string;
}

export interface RehearsalValidationResult<T> {
  valid: boolean;
  value: T | null;
  issues: RehearsalValidationIssue[];
}

export const rehearsalPlanStateLabelsAr: Record<DigitalRehearsalPlanState, string> = {
  draft: 'مسودة',
  candidate: 'مرشح',
  'frozen-for-rehearsal': 'مجمّد للبروفة فقط',
  superseded: 'مستبدل',
  archived: 'مؤرشف'
};

export const rehearsalRunStateLabelsAr: Record<RehearsalRunState, string> = {
  'not-started': 'لم تبدأ',
  ready: 'جاهزة للبدء',
  running: 'البروفة جارية',
  paused: 'متوقفة مؤقتًا',
  blocked: 'محجوبة داخل البروفة',
  skipped: 'تم تجاوزها',
  completed: 'اكتملت البروفة',
  aborted: 'أُلغيت البروفة'
};

export const rehearsalLensLabelsAr: Record<RehearsalLens, string> = {
  visitor: 'الزائر',
  executive: 'القيادة',
  operations: 'العمليات',
  protocol: 'المراسم',
  'security-safety': 'الأمن والسلامة',
  'content-production': 'المحتوى والإنتاج',
  accessibility: 'إتاحة الوصول',
  decision: 'القرار',
  'source-truth': 'حقيقة المصدر'
};
