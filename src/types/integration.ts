import type {
  OperationalStateContext,
  SpatialEntityId,
  Vector3Tuple
} from './spatial';

export const captureSchemaVersion = '1.0.0' as const;
export const operationalEventSchemaVersion = '1.0.0' as const;
export const evidenceSchemaVersion = '1.0.0' as const;
export const adapterManifestSchemaVersion = '1.0.0' as const;
export const stateProjectionSchemaVersion = '1.0.0' as const;
export const spatialOutputCommandSchemaVersion = '1.0.0' as const;
export const physicalSceneCommandSchemaVersion = '1.0.0' as const;
export const projectionIdentityVersion = 'v1' as const;
export const commandIdentityVersion = 'v1' as const;

export const inputAdapterTypeValues = [
  'system',
  'sensor',
  'reality-capture',
  'human-action',
  'workflow',
  'asset-management'
] as const;
export type InputAdapterType = (typeof inputAdapterTypeValues)[number];

export const outputAdapterTypeValues = [
  'spatial-2d',
  'spatial-3d',
  'geospatial',
  'workflow',
  'reporting',
  'physical-output'
] as const;
export type OutputAdapterType = (typeof outputAdapterTypeValues)[number];
export type AdapterType = InputAdapterType | OutputAdapterType;

export interface SourceRecord {
  sourceRecordId: string;
  sourceSystemId: string;
  recordType: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

export interface CaptureTransportMetadata {
  transport: 'local-simulator' | 'batch' | 'offline-queue' | 'stream-simulator';
  batchId: string | null;
  retryCount: number;
  sourceClock: string;
  platformClock: string;
  contentType: 'application/json';
}

export interface CaptureEnvelope<TPayload = SourceRecord> {
  envelopeId: string;
  adapterId: string;
  adapterType: InputAdapterType;
  adapterVersion: string;
  sourceRecordId: string;
  sourceSystemId: string;
  receivedAt: string;
  schemaVersion: typeof captureSchemaVersion;
  payload: TPayload;
  payloadHash: string;
  stateContext: OperationalStateContext;
  deviceId: string | null;
  offlineSequence: number | null;
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string;
  transportMetadata: CaptureTransportMetadata;
}

export interface NormalizedObservation {
  observationId: string;
  envelopeId: string;
  sourceRecordId: string;
  sourceSystemId: string;
  eventRef: string | null;
  venueId: string;
  zoneId: SpatialEntityId | null;
  observedAt: string;
  receivedAt: string;
  entityId: SpatialEntityId;
  assetId: SpatialEntityId | null;
  routeId: SpatialEntityId | null;
  decisionId: string | null;
  workOrderRef: string | null;
  requirementId: string | null;
  eventType: OperationalEventType;
  stateContext: OperationalStateContext;
  proposedDisposition: string;
  priorDisposition: string | null;
  actionType: string;
  actorId: string;
  actorRole: string;
  sourceConfidence: ConfidenceLevel;
  evidenceRefs: string[];
  payloadHash: string;
  adapterId: string;
  adapterVersion: string;
  sourceType: InputAdapterType;
  deviceId: string | null;
  captureMethod: CaptureTransportMetadata['transport'];
  observedLocation: string;
  resultingLocation: string | null;
  coordinateReference: OperationalEventLocation['coordinateReference'];
  spatialReference: string | null;
  instructionId: string | null;
  instructionVersion: string | null;
  offlineSequence: number | null;
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string;
}

export const operationalEventTypeValues = [
  'observation.reported',
  'work.started',
  'work.completed',
  'inspection.performed',
  'measurement.recorded',
  'evidence.attached',
  'exception.raised',
  'approval.granted',
  'approval.rejected',
  'verification.completed',
  'verification.failed',
  'state.correction',
  'event.error-declared',
  'system.synchronized',
  'sensor.observed',
  'reality-capture.processed'
] as const;
export type OperationalEventType = (typeof operationalEventTypeValues)[number];

export const confidenceLevelValues = ['low', 'medium', 'high'] as const;
export type ConfidenceLevel = (typeof confidenceLevelValues)[number];

export const assertionStateValues = [
  'reported',
  'corroborated',
  'verified',
  'approved',
  'rejected',
  'superseded'
] as const;
export type AssertionState = (typeof assertionStateValues)[number];

export const validationDispositionValues = ['accepted', 'rejected', 'requires-review'] as const;
export type ValidationDisposition = (typeof validationDispositionValues)[number];

export interface OperationalEventSubjects {
  eventRef: string | null;
  venueId: string;
  zoneId: SpatialEntityId | null;
  entityId: SpatialEntityId;
  assetId: SpatialEntityId | null;
  routeId: SpatialEntityId | null;
  decisionId: string | null;
  workOrderRef: string | null;
  requirementId: string | null;
}

export interface OperationalEventTime {
  eventTime: string;
  recordTime: string;
  timeZoneOffset: string;
  receivedAt: string;
}

export interface OperationalEventLocation {
  observedAt: string;
  resultingLocation: string | null;
  coordinateReference: 'venue-local' | 'model-local' | 'geographic' | 'unknown';
  spatialReference: string | null;
}

export interface OperationalEventContext {
  businessStep: string;
  priorDisposition: string | null;
  proposedDisposition: string;
  actionType: string;
  instructionId: string | null;
  instructionVersion: string | null;
}

export interface OperationalEventSource {
  sourceType: InputAdapterType;
  sourceSystemId: string;
  sourceRecordId: string;
  actorId: string;
  actorRole: string;
  deviceId: string | null;
  captureMethod: string;
  adapterId: string;
  adapterVersion: string;
}

export interface OperationalEventTrust {
  assertionState: AssertionState;
  sourceConfidence: ConfidenceLevel;
  validationResult: ValidationDisposition;
  validationRuleIds: string[];
  authorityRequirement: string | null;
}

export interface OperationalEventRelationships {
  correlationId: string;
  causationId: string | null;
  supersedesEventId: string | null;
  errorDeclarationForEventId: string | null;
  relationshipReason: string | null;
}

export interface OperationalEventDelivery {
  idempotencyKey: string;
  offlineSequence: number | null;
  payloadHash: string;
}

export interface OperationalEvent {
  eventId: string;
  eventType: OperationalEventType;
  schemaVersion: typeof operationalEventSchemaVersion;
  revision: number;
  stateContext: OperationalStateContext;
  subjects: OperationalEventSubjects;
  time: OperationalEventTime;
  location: OperationalEventLocation;
  operationalContext: OperationalEventContext;
  source: OperationalEventSource;
  evidenceRefs: string[];
  observationRefs: string[];
  provenanceRefs: string[];
  trust: OperationalEventTrust;
  relationships: OperationalEventRelationships;
  delivery: OperationalEventDelivery;
}

export const evidenceTypeValues = [
  'image',
  'video',
  'document',
  'measurement',
  'sensor-observation',
  'inspection-result',
  'signature',
  'external-record',
  'spatial-viewpoint'
] as const;
export type EvidenceType = (typeof evidenceTypeValues)[number];

export const evidenceVerificationStatusValues = ['pending', 'verified', 'rejected', 'expired'] as const;
export type EvidenceVerificationStatus = (typeof evidenceVerificationStatusValues)[number];

export interface CanonicalEvidenceReference {
  schemaVersion: typeof evidenceSchemaVersion;
  evidenceId: string;
  stateContext: OperationalStateContext;
  evidenceType: EvidenceType;
  uri: string;
  fileName: string;
  mimeType: string;
  sha256: string;
  capturedAt: string;
  capturedBy: string;
  sourceSystemId: string;
  relatedEntityIds: SpatialEntityId[];
  relatedEventIds: string[];
  relatedRequirementIds: string[];
  relatedActionIds: string[];
  spatialReference: string | null;
  instructionId: string | null;
  instructionVersion: string | null;
  retentionClass: 'temporary-validation' | 'operational' | 'regulated';
  sensitivityClass: 'public' | 'internal' | 'restricted';
  verificationStatus: EvidenceVerificationStatus;
  supersededByEvidenceId: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

export type EvidenceReference = CanonicalEvidenceReference;

export type ProvenanceNodeType = 'entity' | 'activity' | 'agent';
export type ProvenanceRelationType =
  | 'wasGeneratedBy'
  | 'used'
  | 'wasAssociatedWith'
  | 'wasDerivedFrom'
  | 'hadPrimarySource'
  | 'wasRevisionOf'
  | 'hadRole';

export interface ProvenanceNode {
  provenanceId: string;
  nodeType: ProvenanceNodeType;
  label: string;
  type: string;
  attributes: Record<string, string | number | boolean | null>;
}

export interface ProvenanceRelation {
  relationId: string;
  relationType: ProvenanceRelationType;
  fromId: string;
  toId: string;
  role: string | null;
}

export interface ProvenanceBundle {
  bundleId: string;
  stateContext: OperationalStateContext;
  nodes: ProvenanceNode[];
  relations: ProvenanceRelation[];
  unknownFields: string[];
}

export const actionGatewayOutcomeValues = [
  'accepted',
  'rejected',
  'requires-review',
  'exception-created',
  'conflict-detected',
  'duplicate-ignored'
] as const;
export type ActionGatewayOutcome = (typeof actionGatewayOutcomeValues)[number];

export type GovernedActionFixtureKind =
  | 'accepted'
  | 'unauthorized'
  | 'missing-evidence'
  | 'rejected-evidence'
  | 'unrelated-evidence'
  | 'context-mismatch-evidence'
  | 'dangling-provenance'
  | 'negative-offline'
  | 'factory-failure';

export interface ActionDefinition {
  actionType: string;
  version: string;
  allowedRoles: string[];
  allowedCurrentDispositions: string[];
  requiredEvidenceTypes: EvidenceType[];
  requiredEvidenceVerificationStatus: 'usable' | 'verified';
  requiredSequence: string[];
  requiredStateContexts: OperationalStateContext[];
  requiresApproval: boolean;
  requiresIndependentVerifier: boolean;
  locationRequired: boolean;
  dependencyRuleIds: string[];
}

export interface ActionSubmission {
  submissionId: string;
  resultingEventId: string;
  actionType: string;
  actionVersion: string;
  actorId: string;
  actorRole: string;
  targetEntityId: SpatialEntityId;
  eventId: string;
  venueId: string;
  zoneId: SpatialEntityId;
  assignedWorkId: string;
  sourceRecordId: string;
  sourceSystemId: string;
  adapterId: string;
  adapterVersion: string;
  occurredAt: string;
  instructionId: string;
  instructionVersion: string;
  currentDisposition: string;
  proposedDisposition: string;
  responsibleParty: string;
  relatedDecisionId: string | null;
  stateContext: OperationalStateContext;
  evidenceRefs: string[];
  provenanceRefs: string[];
  locationRef: string | null;
  dependencyStates: Record<string, string>;
  completedSequence: string[];
  approvalRef: string | null;
  verifierId: string | null;
  idempotencyKey: string;
  payloadHash: string;
  offlineSequence: number | null;
  judgment: {
    confirmation: boolean | null;
    exceptionReason: string | null;
    measurement: number | null;
    escalationReason: string | null;
  };
}

export interface ValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  blocking: boolean;
}

export interface ActionValidationResult {
  valid: boolean;
  outcome: ActionGatewayOutcome;
  issues: ValidationIssue[];
}

export interface ActionExecutionResult extends ActionValidationResult {
  submissionId: string;
  operationalEvent: OperationalEvent | null;
  appliedToProjection: boolean;
  evidenceUsed: string[];
  provenanceUsed: string[];
  repositoryStatus: 'not-attempted' | 'appended' | 'duplicate' | 'conflict' | 'failed';
  executionSteps: Array<{
    stepId: 'validation' | 'evidence-provenance' | 'event-construction' | 'event-validation' | 'repository-append' | 'idempotency-commit';
    status: 'passed' | 'failed' | 'not-run';
    messageAr: string;
  }>;
}

export const requirementOutcomeValues = [
  'not-started',
  'in-progress',
  'completed-unverified',
  'verified',
  'blocked',
  'rejected',
  'not-applicable'
] as const;
export type RequirementOutcome = (typeof requirementOutcomeValues)[number];

export interface OperationalRequirement {
  requirementId: string;
  entityId: SpatialEntityId;
  titleAr: string;
  weight: number;
  outcome: RequirementOutcome;
  contributingEventIds: string[];
  eligibleTrustStates: AssertionState[];
}

export interface CanonicalProjectionOptions {
  generatedAt?: string;
  entityLabels?: Record<string, string>;
  requirements?: OperationalRequirement[];
  projectionConfigurationVersion?: string;
  spatialMappingVersion?: string;
}

export type ProjectionOutputType = 'spatial-2d' | 'spatial-3d' | 'geospatial' | 'physical-output';

export type ProjectionOutputProfileVersions = Record<ProjectionOutputType, string>;

export interface ProjectionOutputOptions {
  routeIdsByEntity?: Record<string, SpatialEntityId[]>;
  physicalTargetDeviceId?: string;
  physicalSceneId?: string;
  expiresAt?: string;
  deliveryAttempt?: number;
  outputProfileVersions?: Partial<ProjectionOutputProfileVersions>;
}

export interface ReadinessProjection {
  entityId: SpatialEntityId;
  readiness: number;
  verifiedReadiness: number;
  dataCompleteness: number;
  confidence: ConfidenceLevel;
  approvalCoverage: number;
  contributingRequirementIds: string[];
  excludedRequirementIds: string[];
  explanationAr: string[];
}

export interface AdapterCapabilities {
  normalize: boolean;
  ingest: boolean;
  acknowledge: boolean;
  retry: boolean;
  outputDelivery: boolean;
  conformanceTesting: boolean;
}

export interface AdapterManifest {
  schemaVersion: typeof adapterManifestSchemaVersion;
  adapterId: string;
  adapterType: AdapterType;
  version: string;
  supportedSchemaVersions: string[];
  capabilities: AdapterCapabilities;
  inputOrOutput: 'input' | 'output';
  onlineSupport: boolean;
  offlineSupport: boolean;
  batchSupport: boolean;
  streamingSupport: boolean;
  evidenceSupport: boolean;
  spatialSupport: boolean;
  taskingSupport: boolean;
  healthStatus: 'healthy' | 'degraded' | 'offline';
  configurationSchema: Record<string, unknown>;
  vendorMetadata: {
    vendorNeutral: true;
    implementation: 'local-reference';
    productName: null;
  };
}

export interface AdapterHealthResult {
  adapterId: string;
  status: AdapterManifest['healthStatus'];
  checkedAt: string;
  messageAr: string;
}

export interface AdapterAcknowledgement {
  adapterId: string;
  commandId: string;
  deliveryAttemptId: string;
  projectionVersion: string;
  status: 'acknowledged' | 'rejected' | 'timed-out';
  acknowledgedAt: string;
  issue: ValidationIssue | null;
}

export interface AdapterIngestionResult {
  envelopeId: string;
  status: 'accepted-for-validation' | 'rejected';
  issues: ValidationIssue[];
}

export interface InputAdapter {
  manifest: AdapterManifest;
  validateConfiguration(configuration: Record<string, unknown>): ValidationIssue[];
  discoverCapabilities(): AdapterCapabilities;
  checkHealth(at: string): AdapterHealthResult;
  normalize(envelope: CaptureEnvelope): NormalizedObservation;
  createProvenance(observation: NormalizedObservation, resultingEventId: string): ProvenanceBundle;
  ingest(envelope: CaptureEnvelope): AdapterIngestionResult;
  acknowledge(envelopeId: string): { envelopeId: string; accepted: boolean };
  retry(envelope: CaptureEnvelope, attempt: number): CaptureEnvelope;
  handleError(error: unknown): ValidationIssue;
}

export interface OutputAdapter<TCommand> {
  manifest: AdapterManifest;
  validateConfiguration(configuration: Record<string, unknown>): ValidationIssue[];
  discoverCapabilities(): AdapterCapabilities;
  checkHealth(at: string): AdapterHealthResult;
  deliver(command: TCommand): AdapterAcknowledgement;
  retryDelivery(command: TCommand, attempt: number): AdapterAcknowledgement;
  handleError(error: unknown): ValidationIssue;
}

export interface ProjectedEntityState {
  entityId: SpatialEntityId;
  disposition: string;
  assertionState: AssertionState;
  sourceEventIds: string[];
  lastEventTime: string;
  labelAr: string;
  colorToken: 'neutral' | 'reported' | 'verified' | 'approved' | 'blocked';
  readiness: ReadinessProjection | null;
}

export interface ProjectionSourceEventIdentity {
  eventId: string;
  revision: number;
  payloadHash: string;
  eventContentHash: string;
}

export interface StateProjection {
  schemaVersion: typeof stateProjectionSchemaVersion;
  projectionVersion: string;
  projectionContentHash: string;
  projectionConfigurationVersion: string;
  spatialMappingVersion: string;
  stateContext: OperationalStateContext;
  generatedAt: string;
  lastEventRevision: number;
  entityStates: ProjectedEntityState[];
  sourceEventIds: string[];
  sourceEventLineage: ProjectionSourceEventIdentity[];
  rejectedEventIds: string[];
  supersededEventIds: string[];
  requirementStates: OperationalRequirement[];
  explanationAr: string[];
}

export interface SpatialVisualState {
  entityId: SpatialEntityId;
  zoneId: SpatialEntityId | null;
  projectionVersion: string;
  projectionContentHash: string;
  stateContext: OperationalStateContext;
  mappingVersion: string;
  visualState: string;
  colorToken: ProjectedEntityState['colorToken'];
  label: string;
  routeIds: SpatialEntityId[];
  highlight: boolean;
  spatialReference: string;
  issuedAt: string;
  expiresAt: string;
  sourceEventIds: string[];
}

export interface SpatialOutputCommand {
  commandId: string;
  commandContentHash: string;
  deliveryAttemptId: string;
  schemaVersion: typeof spatialOutputCommandSchemaVersion;
  outputType: 'spatial-2d' | 'spatial-3d' | 'geospatial';
  projectionVersion: string;
  projectionContentHash: string;
  outputProfileVersion: string;
  mappingVersion: string;
  stateContext: OperationalStateContext;
  visualStates: SpatialVisualState[];
  issuedAt: string;
  expiresAt: string;
  sequence: number;
  sourceEventIds: string[];
}

export interface PhysicalEntityVisualState {
  entityId: SpatialEntityId;
  colorToken: ProjectedEntityState['colorToken'];
  intensity: number;
  label: string;
}

export interface PhysicalRouteVisualState {
  routeId: SpatialEntityId;
  active: boolean;
  colorToken: string;
  direction: 'forward' | 'reverse' | 'both';
}

export interface PhysicalSceneCommand {
  schemaVersion: typeof physicalSceneCommandSchemaVersion;
  commandId: string;
  commandContentHash: string;
  deliveryAttemptId: string;
  projectionVersion: string;
  projectionContentHash: string;
  outputProfileVersion: string;
  mappingVersion: string;
  stateContext: OperationalStateContext;
  targetDeviceId: string;
  sceneId: string;
  entityVisualStates: PhysicalEntityVisualState[];
  routeVisualStates: PhysicalRouteVisualState[];
  issuedAt: string;
  expiresAt: string;
  sequence: number;
  acknowledgementRequired: boolean;
  sourceEventIds: string[];
}

export interface ProjectionOutputBundle {
  projection: StateProjection;
  outputProfileVersions: ProjectionOutputProfileVersions;
  spatial2d: SpatialOutputCommand;
  spatial3d: SpatialOutputCommand;
  geospatial: SpatialOutputCommand;
  physical: PhysicalSceneCommand;
}

export interface OfflineQueueEntry {
  queueId: string;
  envelope: CaptureEnvelope;
  queuedAt: string;
  status: 'queued' | 'replayed' | 'conflict' | 'rejected';
  replayedAt: string | null;
  resultEventId: string | null;
}

export interface ConflictRecord {
  conflictId: string;
  entityId: SpatialEntityId;
  stateContext: OperationalStateContext;
  existingEventId: string;
  incomingEnvelopeId: string;
  existingDisposition: string;
  proposedDisposition: string;
  reasonAr: string;
  detectedAt: string;
  status: 'requires-review' | 'resolved';
}

export interface IntegrationMetrics {
  totalSourceRecords: number;
  acceptedOperationalEvents: number;
  rejectedRecords: number;
  duplicatesBlocked: number;
  conflictsDetected: number;
  offlineRecordsReplayed: number;
  eventsWithCompleteProvenance: number;
  eventsWithValidEvidence: number;
  reportedAssertions: number;
  corroboratedAssertions: number;
  verifiedAssertions: number;
  approvedAssertions: number;
  averageSimulatedTimeToVerifiedSeconds: number;
  automaticCapturePercentage: number;
  humanInteractionPercentage: number;
  projectionSynchronizationStatus: 'synchronized' | 'out-of-sync';
}

export interface GeospatialReferencePreview {
  coordinateReference: 'WGS84-preview';
  venueOrigin: { latitude: number; longitude: number; altitude: number };
  localOffsetMeters: Vector3Tuple;
  noteAr: string;
}
