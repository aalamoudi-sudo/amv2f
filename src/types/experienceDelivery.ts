import type { OperationalJourneyCandidatePackage } from './operationalJourneyCandidate';

export type DeliveryAuthorityStatus =
  | 'unknown'
  | 'founder-supplied-working-candidate'
  | 'operational-team-supplied-working-candidate'
  | 'source-backed-working-candidate'
  | 'authority-confirmed';

export type DeliveryApprovalStatus =
  | 'unknown'
  | 'candidate'
  | 'reviewed'
  | 'approved-for-candidate-binding'
  | 'rejected';

export const experienceDeliveryStateValues = [
  'missing',
  'discovered',
  'inventory-created',
  'invalid',
  'incomplete',
  'quarantined',
  'duplicate',
  'conflict',
  'structurally-valid',
  'awaiting-authority',
  'awaiting-founder-review',
  'accepted-as-candidate',
  'optimization-required',
  'ready-for-binding',
  'bound',
  'rejected',
  'rolled-back'
] as const;

export type ExperienceDeliveryState = (typeof experienceDeliveryStateValues)[number];

export type DeliverySourceType = 'pdf' | 'xlsx' | 'csv' | 'docx' | 'pptx' | 'json' | 'zip' | 'studio-asset' | 'unknown';

export interface DeliverySourceInventoryRecord {
  sourceRecordId: string;
  localOpaqueSourceId: string;
  originalFilename: string;
  safeDisplayFilename: string;
  sourceType: DeliverySourceType;
  mimeType: string | null;
  byteSize: number;
  sha256: string;
  fingerprintState: 'verified' | 'changed-after-fingerprint' | 'not-verified';
  sourceOwner: string | null;
  suppliedBy: string | null;
  suppliedAt: string | null;
  revision: string | null;
  claimedApprovalStatus: string | null;
  verifiedAuthorityStatus: DeliveryAuthorityStatus;
  confidentialityClassification: 'public' | 'internal' | 'confidential' | 'restricted' | 'unknown';
  retentionClassification: 'review-session' | 'project-record-candidate' | 'quarantine' | 'unknown';
  relevantDayIds: string[];
  relevantPersonaIds: string[];
  relevantDestinationIds: string[];
  relevantWorkstreamIds: string[];
  extractionStatus: 'not-started' | 'inventory-only' | 'metadata-extracted' | 'structured-preview-ready' | 'blocked';
  conflictStatus: 'none' | 'duplicate' | 'conflicting-content' | 'unresolved';
  acceptanceStatus: ExperienceDeliveryState;
  modifiedAtReported: string | null;
  pathDisclosure: 'redacted';
}

export interface DeliveryRoleCandidate {
  actorRef: string;
  roleRef: string;
  classification: 'source-backed-candidate' | 'founder-directed' | 'conflicting' | 'unknown';
  sourceTraceIds: string[];
}

export interface OperationalDeliveryScheduleEntry {
  scheduleEntryId: string;
  dayId: string;
  personaIds: string[];
  momentId: string | null;
  startsAtReported: string | null;
  endsAtReported: string | null;
  timeZone: string | null;
  status: 'candidate' | 'conflicting' | 'unknown';
  sourceTraceIds: string[];
}

export interface OperationalRouteCandidateDelivery {
  routeCandidateId: string;
  dayId: string;
  personaIds: string[];
  destinationIds: string[];
  status: 'candidate' | 'conflicting' | 'unresolved';
  geometryStatus: 'none' | 'source-reference-only' | 'candidate-visual-anchor';
  sourceTraceIds: string[];
}

export interface OperationalEvidenceRuleDelivery {
  evidenceRuleId: string;
  evidenceType: string;
  verificationRequired: boolean;
  approvalRequired: boolean;
  sourceTraceIds: string[];
}

export interface OperationalDeliveryConflict {
  conflictId: string;
  summaryAr: string;
  status: 'open' | 'restricted' | 'resolved-by-authority';
  sourceTraceIds: string[];
}

export interface OperationalDeliveryManifest {
  schemaVersion: '1.0.0';
  manifestId: string;
  sourceId: string | null;
  filename: string | null;
  hash: string | null;
  size: number | null;
  revision: number | null;
  authority: DeliveryAuthorityStatus;
  approvalStatus: DeliveryApprovalStatus;
  projectId: string;
  eventId: string;
  venueId: string;
  day: string | null;
  persona: string[];
  schedule: OperationalDeliveryScheduleEntry[];
  routeCandidate: OperationalRouteCandidateDelivery[];
  destinationIds: string[];
  owner: DeliveryRoleCandidate | null;
  responsibleParty: DeliveryRoleCandidate | null;
  verificationAuthority: DeliveryRoleCandidate | null;
  approvalAuthority: DeliveryRoleCandidate | null;
  evidenceRule: OperationalEvidenceRuleDelivery[];
  dependency: string[];
  restriction: string[];
  conflict: OperationalDeliveryConflict[];
  notes: string[];
  sourceInventory: DeliverySourceInventoryRecord | null;
}

export type StudioDeliveryFormat =
  | 'glb'
  | 'gltf'
  | 'fbx'
  | 'obj'
  | 'skp'
  | 'rvt'
  | '3dm'
  | 'c4d'
  | 'unreal-project'
  | 'unity-project'
  | 'max'
  | 'blend'
  | 'dwg'
  | 'dxf'
  | 'ifc'
  | 'usd'
  | 'usdz'
  | 'stl'
  | '3mf'
  | 'projection-uv'
  | 'projection-mask'
  | 'calibration-reference'
  | 'video'
  | 'image-sequence'
  | 'environment-map'
  | 'jpeg-equirectangular'
  | 'tiff-equirectangular'
  | 'png-equirectangular'
  | 'webp-equirectangular'
  | 'png-flat-render'
  | 'jpeg-flat-render'
  | 'other';

export type StudioAssetCapability =
  | 'inventory-only'
  | 'metadata-readable'
  | 'structurally-validatable'
  | 'previewable'
  | 'runtime-compatible'
  | 'requires-native-software'
  | 'requires-export'
  | 'requires-optimization'
  | 'unsupported'
  | 'quarantined';

export interface StudioVector3 {
  x: number;
  y: number;
  z: number;
}

export interface Studio3DDeliveryManifest {
  schemaVersion: '1.0.0';
  manifestId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  sourceId: string | null;
  authority: DeliveryAuthorityStatus;
  filename: string | null;
  format: StudioDeliveryFormat | null;
  hash: string | null;
  size: number | null;
  version: string | null;
  software: string | null;
  softwareVersion: string | null;
  renderEngine: string | null;
  plugins: string[];
  destinationId: string | null;
  sceneId: string | null;
  dayVariant: string[];
  personaVariant: string[];
  cameraId: string | null;
  cameraPosition: StudioVector3 | null;
  cameraHeight: number | null;
  cameraHeading: number | null;
  fieldOfView: number | null;
  northDirection: number | null;
  units: 'meter' | 'millimeter' | 'centimeter' | 'unknown' | null;
  scale: number | null;
  origin: StudioVector3 | null;
  coordinateReference: string | null;
  dimensions: { width: number; height: number } | null;
  textureDependencies: string[];
  rightsStatus: 'unknown' | 'review-required' | 'internal-preview-only' | 'client-review-approved' | 'blocked';
  approvalStatus: DeliveryApprovalStatus;
  optimizationStatus: 'unknown' | 'required' | 'in-progress' | 'review-ready' | 'optimized';
  spatialRegistrationStatus: 'unknown' | 'required' | 'candidate' | 'registered';
  navmeshStatus: 'unknown' | 'not-provided' | 'candidate' | 'validated';
  collisionStatus: 'unknown' | 'not-provided' | 'candidate' | 'validated';
  projectionMappingStatus: 'unknown' | 'not-provided' | 'candidate' | 'registered';
  missingDependencies: string[];
  warnings: string[];
  sourceInventory: DeliverySourceInventoryRecord | null;
}

export interface ExperienceDeliveryValidationContext {
  projectId: string;
  eventId: string;
  venueId: string;
  knownDayIds: ReadonlySet<string>;
  knownPersonaIds: ReadonlySet<string>;
  knownDestinationIds: ReadonlySet<string>;
}

export interface ExperienceDeliveryValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  severity: 'blocking' | 'warning';
  affectedFile: string | null;
  affectedField: string;
  blocking: boolean;
  recommendedActionAr: string;
  safeTechnicalDetail: string;
}

export interface ExperienceDeliveryValidationResult {
  status: ExperienceDeliveryState;
  valid: boolean;
  errors: readonly ExperienceDeliveryValidationIssue[];
  warnings: readonly ExperienceDeliveryValidationIssue[];
  operatorMessageAr: string;
  affectedFile: string | null;
  blocking: boolean;
  recommendedActionAr: string;
  safeTechnicalDetail: string;
  sourceFingerprint: string | null;
  validatorVersion: 'EXPERIENCE-DELIVERY-VALIDATOR-v1';
}

export interface ExperienceDeliveryManifestPreview<T> {
  previewId: string;
  kind: 'operational' | 'studio-3d';
  manifest: Readonly<T>;
  manifestFingerprint: string;
  issues: readonly ExperienceDeliveryValidationIssue[];
  valid: boolean;
  canAcceptMetadata: boolean;
  canBindProjection: boolean;
  validation: ExperienceDeliveryValidationResult;
}

export interface ExperienceDeliveryAcceptance<T> {
  accepted: boolean;
  value: Readonly<T> | null;
  manifestFingerprint: string | null;
  messageAr: string;
}

export interface ExperienceDeliveryLaneStatus {
  laneId: 'operational' | 'studio-3d';
  titleAr: string;
  status: 'awaiting-delivery' | 'preview-ready' | 'blocked' | 'validated-candidate';
  contractVersion: '1.0.0';
  statusMessageAr: string;
  validationMessageAr: string;
  acceptedManifestCount: number;
  projectionBindingStatus: 'not-started' | 'candidate-only' | 'blocked' | 'bound-candidate';
}

export interface ExperienceDeliveryReadinessProjection {
  projectionId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  builtCapabilitiesAr: string[];
  nextInputsAr: string[];
  lanes: ExperienceDeliveryLaneStatus[];
}

export type OperationalReconciliationAction =
  | 'add-candidate-fact'
  | 'preserve-current-fact'
  | 'create-conflict'
  | 'mark-superseded-candidate'
  | 'request-authority-review'
  | 'reject-source-fact'
  | 'require-more-evidence';

export interface OperationalIncomingFact {
  incomingFactId: string;
  factKind: string;
  value: unknown;
  sourceTraceId: string;
  sourceLocator: { type: 'page' | 'sheet-row' | 'slide-shape' | 'json-pointer'; reference: string };
  dayId: string | null;
  personaId: string | null;
  momentId: string | null;
  destinationId: string | null;
  decisionContextId: string | null;
  readinessContextId: string | null;
  authorityStatus: DeliveryAuthorityStatus;
}

export interface OperationalCanonicalFact {
  canonicalFactId: string;
  factKind: string;
  value: unknown;
  sourceTraceIds: string[];
  dayId: string | null;
  personaId: string | null;
  momentId: string | null;
  destinationId: string | null;
}

export interface OperationalReconciliationItem {
  reconciliationItemId: string;
  currentFactId: string | null;
  incomingFactId: string;
  currentValue: unknown;
  incomingValue: unknown;
  differenceType: 'new' | 'matching' | 'changed' | 'conflicting' | 'missing-authority';
  recommendedAction: OperationalReconciliationAction;
  sourceLocator: OperationalIncomingFact['sourceLocator'];
  dayId: string | null;
  personaId: string | null;
  momentId: string | null;
  destinationId: string | null;
  decisionContextId: string | null;
  readinessContextId: string | null;
  operationalImpactAr: string;
  clientPresentationImpactAr: string;
  authorityRequiredAr: string;
}

export interface OperationalReconciliationPreview {
  previewId: string;
  sourceFingerprint: string;
  currentProjectionHash: string;
  itemHash: string;
  deterministicFingerprint: string;
  items: readonly OperationalReconciliationItem[];
  canMutateProjection: false;
}

export interface StudioDependencyRecord {
  dependencyId: string;
  safeDisplayName: string;
  dependencyType: 'texture' | 'material-map' | 'hdri' | 'ies' | 'proxy' | 'xref' | 'font' | 'plugin' | 'video' | 'audio' | 'buffer' | 'unknown';
  status: 'discovered' | 'missing' | 'duplicate' | 'broken-path' | 'external-uri' | 'unsupported';
  privatePathPresent: boolean;
  safeOpaquePathId: string | null;
  blocking: boolean;
}

export interface StudioDependencyReport {
  reportId: string;
  sourceFingerprint: string;
  dependencies: readonly StudioDependencyRecord[];
  missingCount: number;
  externalUriCount: number;
  blocking: boolean;
  contentHash: string;
}

export interface StudioAssetValidationResult {
  status: 'runtime-compatible' | 'runtime-compatible-with-warning' | 'optimization-required' | 'missing-dependencies' | 'invalid' | 'unsupported-extension';
  capability: StudioAssetCapability;
  valid: boolean;
  issues: readonly ExperienceDeliveryValidationIssue[];
  statistics: {
    sceneCount: number;
    nodeCount: number;
    meshCount: number;
    primitiveCount: number;
    textureCount: number;
    animationCount: number;
    approximateGeometryBytes: number;
  } | null;
  boundingBox: { min: StudioVector3; max: StudioVector3 } | null;
  sourceFingerprint: string;
  validatorVersion: string;
}

export interface PanoramaValidationInput {
  filename: string;
  sourceFingerprint: string;
  format: 'jpeg' | 'png' | 'webp' | 'tiff' | 'unknown';
  width: number;
  height: number;
  byteSize: number;
  submittedAs: 'equirectangular-panorama' | 'flat-render';
  cameraMetadataPresent: boolean;
  orientationMetadataPresent: boolean;
  destinationId: string | null;
  dayClassification: 'day' | 'night' | 'mixed' | 'unknown';
  rightsStatus: Studio3DDeliveryManifest['rightsStatus'];
  gpsStatus: 'present' | 'absent' | 'stripped' | 'quarantined' | 'unknown';
}

export interface PanoramaValidationResult {
  status: 'runtime-compatible' | 'runtime-compatible-with-warning' | 'invalid' | 'rights-blocked' | 'privacy-quarantined';
  valid: boolean;
  truePanorama: boolean;
  issues: readonly ExperienceDeliveryValidationIssue[];
  reviewResolutionMet: boolean;
  preferredResolutionMet: boolean;
  gpsClientHandling: 'not-present' | 'strip-required' | 'quarantine-required';
  sourceFingerprint: string;
}

export interface DeliveryMappingSlot {
  slotId: string;
  labelAr: string;
  status: 'missing' | 'candidate' | 'validated-candidate' | 'blocked' | 'not-applicable';
  sourceId: string | null;
  notesAr: string;
}

export interface DeliveryDestinationMapping {
  destinationId: string;
  labelAr: string;
  spatialStatus: 'candidate-anchor' | 'independent-landmark' | 'unresolved-no-anchor';
  slots: readonly DeliveryMappingSlot[];
}

export interface DeliveryDayAssetVariant {
  variantId: string;
  dayId: string;
  date: string;
  masterAssetId: string | null;
  visibilitySetId: string | null;
  furnitureVariantId: string | null;
  signageVariantId: string | null;
  lightingVariantId: string | null;
  screenContentVariantId: string | null;
  cameraVariantId: string | null;
  personaStartVariants: Array<{ personaId: string; startAnchorId: string | null }>;
  activationStatus: 'not-mapped' | 'candidate' | 'validated-candidate';
}

export interface DeliveryCandidateRevision<T = unknown> {
  revisionId: string;
  revision: number;
  contentHash: string;
  sourcePackageHash: string;
  parentRevisionId: string | null;
  timestamp: string;
  timestampClassification: 'local-process-time-untrusted';
  actorClassification: 'founder-local-review' | 'fictional-test-actor';
  acceptanceReason: string;
  affectedObjectIds: string[];
  diffSummary: string[];
  rollbackReference: string | null;
  status: 'accepted-as-candidate' | 'bound' | 'rolled-back';
  value: Readonly<T>;
}

export interface DeliveryBindingResult<T = unknown> {
  committed: boolean;
  revision: Readonly<DeliveryCandidateRevision<T>> | null;
  messageAr: string;
  failedObjectIds: readonly string[];
}

export interface DeliveryControlChannelProjection {
  channelId: 'operational' | 'studio-3d';
  labelAr: string;
  waitingMessageAr: string;
  currentStatus: ExperienceDeliveryState;
  receivedPackages: number;
  acceptedPackages: number;
  rejectedPackages: number;
  quarantinedFiles: number;
  unresolvedConflicts: number;
  missingDependencies: number;
  mappingProgress: number;
  readyForBinding: boolean;
  latestRevision: string | null;
  rollbackAvailable: boolean;
  requiredNextActionAr: string;
}

export interface DeliveryDryRunScenario {
  scenarioId: string;
  channelId: 'operational' | 'studio-3d';
  labelAr: string;
  summaryAr: string;
  status: ExperienceDeliveryState;
  blocking: boolean;
  issueCount: number;
  safeDetailAr: string;
}

export interface ExperienceDeliveryControlCenterProjection {
  projectionId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  validatorVersion: string;
  channels: readonly DeliveryControlChannelProjection[];
  destinationMappings: readonly DeliveryDestinationMapping[];
  dayVariants: readonly DeliveryDayAssetVariant[];
  fictionalDryRuns: readonly DeliveryDryRunScenario[];
  operationalJourneyPackage: OperationalJourneyCandidatePackage | null;
  realPackageCounts: {
    operationalReceived: number;
    operationalFingerprintVerified: number;
    operationalFounderApproved: number;
    operationallyApproved: number;
    operationalRoutesApproved: number;
    canonicalSpatialRoutesCreated: number;
    studioReceived: number;
    operationalAccepted: number;
    studioAccepted: number;
    operationalBound: number;
    scenesBound: number;
    panoramasBound: number;
  };
  operationalReadiness: 'cannot-determine';
  contentHash: string;
}
