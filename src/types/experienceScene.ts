export const sceneMediaKindValues = [
  'flat-render',
  'equirectangular-panorama',
  'cubemap-panorama',
  'gltf-scene',
  'reference-video',
  'actual-360-capture'
] as const;

export type SceneMediaKind = (typeof sceneMediaKindValues)[number];

export const sceneTruthClassValues = [
  'illustrative-only',
  'design-candidate',
  'design-approved',
  'actual-reported',
  'actual-verified'
] as const;

export type SceneTruthClass = (typeof sceneTruthClassValues)[number];

export const sceneAvailabilityStatusValues = [
  'missing',
  'manifest-only',
  'locally-available',
  'invalid',
  'quarantined',
  'loadable',
  'superseded'
] as const;

export type SceneAvailabilityStatus = (typeof sceneAvailabilityStatusValues)[number];

export const sceneRightsStatusValues = [
  'unknown',
  'review-required',
  'internal-preview-only',
  'approved-internal-use',
  'approved-client-presentation',
  'approved-distribution',
  'expired',
  'blocked'
] as const;

export type SceneRightsStatus = (typeof sceneRightsStatusValues)[number];

export type SceneAssetApprovalStatus = 'candidate' | 'approved' | 'missing' | 'unknown';
export type SceneCoordinateStatus = 'unknown' | 'unregistered' | 'candidate-normalized' | 'registered' | 'engineering-approved';
export type SceneVariantQuality = 'thumbnail' | 'preview' | 'standard' | 'high' | 'master';
export type SceneTimeTrust = 'source-reported' | 'local-process-untrusted' | 'not-recorded';

export interface SceneAssetRights {
  status: SceneRightsStatus;
  owner: string | null;
  expiresAt: string | null;
  allowedUses: Array<'internal-review' | 'client-presentation' | 'distribution'>;
  sourceTraceIds: string[];
  notesAr: string[];
}

export interface SceneAssetSource {
  sourceId: string;
  sourceFingerprint: string;
  sourceRevision: string;
  sourcePage: number | null;
  sourceTraceIds: string[];
  provenanceKind: 'design-source' | 'field-capture' | 'technical-fixture';
  captureClassification: 'design-render' | 'native-design-model' | 'actual-capture-reported' | 'actual-capture-verified' | 'technical-synthetic' | 'unknown';
  filenameSafe: string | null;
  observedByteSize: number | null;
  observedSha256: string | null;
}

export interface SceneSpatialBinding {
  bindingId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  zoneIds: string[];
  entityIds: string[];
  spatialAnchorIds: string[];
  coordinateStatus: SceneCoordinateStatus;
  authority: 'none' | 'candidate' | 'engineering-approved';
  sourceTraceIds: string[];
}

export interface SceneOrientation {
  projection: 'perspective' | 'equirectangular' | 'cubemap' | 'orthographic' | 'unknown';
  headingDegrees: number | null;
  northOffsetDegrees: number | null;
  pitchDegrees: number | null;
  rollDegrees: number | null;
  status: 'unknown' | 'source-declared' | 'verified';
}

export interface SceneCameraPose {
  poseId: string;
  coordinateReference: string | null;
  position: [number, number, number] | null;
  target: [number, number, number] | null;
  fieldOfViewDegrees: number | null;
  status: 'unknown' | 'candidate' | 'registered' | 'verified';
}

export interface SceneAssetVariant {
  variantId: string;
  quality: SceneVariantQuality;
  uri: string | null;
  mimeType: string | null;
  contentHash: string | null;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  availabilityStatus: SceneAvailabilityStatus;
  cubemapFace: 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz' | null;
  externalDependencies: string[];
}

export type SceneHotspotTargetType =
  | 'scene'
  | 'journey-step'
  | 'touchpoint'
  | 'operational-object'
  | 'alternative-branch'
  | 'exit-to-map';

export interface SceneHotspot {
  hotspotId: string;
  assetId: string;
  labelAr: string;
  labelEn: string;
  targetType: SceneHotspotTargetType;
  targetAssetId: string | null;
  targetJourneyStepId: string | null;
  targetTouchpointId: string | null;
  targetZoneId: string | null;
  targetEntityId: string | null;
  yawDegrees: number | null;
  pitchDegrees: number | null;
  normalizedPosition: { x: number; y: number } | null;
  targetTruthClass: SceneTruthClass | null;
  status: 'candidate' | 'verified' | 'missing-target' | 'blocked';
}

export interface SceneTransition {
  transitionId: string;
  sourceAssetId: string;
  hotspotId: string;
  targetAssetId: string | null;
  targetJourneyStepId: string | null;
  transitionKind: 'next' | 'previous' | 'point-of-interest' | 'alternative' | 'exit-to-map';
  status: 'candidate' | 'available' | 'blocked' | 'unresolved';
  routeAuthority: 'none';
}

export interface SceneAssetRevision {
  revisionId: string;
  assetId: string;
  revision: number;
  parentRevisionId: string | null;
  previousContentHash: string | null;
  contentHash: string | null;
  changeReason: string | null;
  createdAt: string | null;
  createdBy: string;
  timeTrust: SceneTimeTrust;
  status: 'candidate' | 'approved' | 'quarantined' | 'superseded';
  changedFields: string[];
}

export interface ExperienceSceneAsset {
  schemaVersion: '1.0.0';
  assetId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  scenarioIds: string[];
  eventDayIds: string[];
  personaIds: string[];
  journeyIds: string[];
  journeyStepIds: string[];
  touchpointIds: string[];
  zoneIds: string[];
  entityIds: string[];
  spatialAnchorIds: string[];
  sourceId: string | null;
  sourceFingerprint: string | null;
  contentHash: string | null;
  revision: number;
  revisionId: string;
  parentRevisionId: string | null;
  createdAt: string | null;
  createdBy: string;
  mediaKind: SceneMediaKind;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  byteSize: number | null;
  durationSeconds: number | null;
  truthClass: SceneTruthClass;
  approvalStatus: SceneAssetApprovalStatus;
  availabilityStatus: SceneAvailabilityStatus;
  rightsStatus: SceneRightsStatus;
  rightsOwner: string | null;
  rightsExpiry: string | null;
  coordinateStatus: SceneCoordinateStatus;
  units: { value: 'meter' | 'millimeter' | 'centimeter' | 'unknown'; status: 'declared' | 'verified' | 'unknown' } | null;
  orientation: SceneOrientation | null;
  cameraPose: SceneCameraPose | null;
  northOffset: number | null;
  source: SceneAssetSource | null;
  rights: SceneAssetRights;
  spatialBindings: SceneSpatialBinding[];
  variants: SceneAssetVariant[];
  hotspots: SceneHotspot[];
  transitions: SceneTransition[];
  fallbackAssetId: string | null;
  supersededBy: string | null;
  lastVerifiedAt: string | null;
  warnings: string[];
}

export interface SceneComparisonPair {
  comparisonPairId: string;
  projectId: string;
  eventId: string;
  leftAssetId: string;
  rightAssetId: string;
  mode: 'design-candidate-vs-approved' | 'design-vs-actual-reported' | 'design-vs-actual-verified' | 'revision-vs-revision';
  presentation: 'side-by-side' | 'slider';
  cameraPoseCompatibility: 'compatible' | 'incompatible' | 'unknown';
  pixelComparisonAllowed: boolean;
  evidenceStatus: 'none' | 'reported' | 'verified';
  warningsAr: string[];
}

export interface SceneLoadState {
  assetId: string;
  variantId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'missing' | 'failed' | 'cancelled' | 'disposed';
  progress: number | null;
  adapterId: 'flat-render' | 'panorama' | 'web3d' | 'missing';
  uri: string | null;
  messageAr: string;
  retryable: boolean;
}

export interface SceneValidationIssue {
  code: string;
  path: string;
  severity: 'blocking' | 'warning';
  messageAr: string;
}

export interface SceneValidationResult {
  valid: boolean;
  schemaValid: boolean;
  renderable: boolean;
  quarantined: boolean;
  issues: SceneValidationIssue[];
}

export interface SceneViewerProjection {
  mode: 'design-preview' | 'panorama-360' | 'model-3d' | 'source-missing';
  assetId: string | null;
  fallbackAssetId: string | null;
  truthLens: 'client-experience' | 'operational-truth';
  reasonAr: string;
}

export interface SceneAssetRegistry {
  schemaVersion: '1.0.0';
  registryId: string;
  registryRevision: number;
  projectId: string;
  eventId: string;
  venueId: string;
  experiencePackId: string;
  assets: ExperienceSceneAsset[];
  revisions: SceneAssetRevision[];
  comparisonPairs: SceneComparisonPair[];
  sourceFingerprint: string;
  contentHash: string;
}

export interface SceneGatewayContext {
  projectId: string;
  eventId: string;
  venueId: string;
  scenarioId: string | null;
  eventDayId: string | null;
  personaId: string | null;
  journeyId: string | null;
  journeyStepId: string | null;
  touchpointId: string | null;
  preferredMediaKinds?: SceneMediaKind[];
}

export interface SceneValidationContext {
  projectId: string;
  eventId: string;
  venueId: string;
  knownScenarioIds: ReadonlySet<string>;
  knownEventDayIds: ReadonlySet<string>;
  knownPersonaIds: ReadonlySet<string>;
  knownJourneyIds: ReadonlySet<string>;
  knownJourneyStepIds: ReadonlySet<string>;
  knownTouchpointIds: ReadonlySet<string>;
  knownZoneIds: ReadonlySet<string>;
  knownEntityIds: ReadonlySet<string>;
  knownSpatialAnchorIds: ReadonlySet<string>;
  knownSourceIds: ReadonlySet<string>;
  registryAssets: readonly ExperienceSceneAsset[];
  registryRevisions: readonly SceneAssetRevision[];
}
