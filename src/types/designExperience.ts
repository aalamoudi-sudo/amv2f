export const designTruthClassificationValues = [
  'founder-approved-design-source',
  'studio-approved-production-export',
  'derived-diagnostic-candidate',
  'concept-reference',
  'engineering-registered',
  'as-built-verified'
] as const;

export type DesignTruthClassification = (typeof designTruthClassificationValues)[number];
export type DesignAssetAuthority = DesignTruthClassification;

export const designAssetStateValues = [
  'missing',
  'staged',
  'verifying',
  'verified',
  'loading',
  'loaded',
  'failed',
  'hash-mismatch',
  'unsupported',
  'quarantined'
] as const;

export type DesignAssetState = (typeof designAssetStateValues)[number];
export type DesignSceneLens = 'experience' | 'structure' | 'truth' | 'command';
export type DesignSceneQualityProfile = 'balanced' | 'high' | 'low-power';
export type DesignSceneEngineeringStatus = 'unregistered' | 'candidate-registered' | 'engineering-approved';
export type DesignSceneOperationalStatus = 'cannot-determine' | 'reported' | 'verified';
export type DesignSceneRelationshipStatus = 'unassigned' | 'proposed' | 'probable' | 'confirmed' | 'conflicted' | 'rejected';

export interface DesignAssetLoadState {
  assetId: string;
  state: DesignAssetState;
  progress: number | null;
  messageAr: string;
  retryable: boolean;
}

export interface DesignAssetPerformanceProfile {
  profileId: DesignSceneQualityProfile;
  maximumDevicePixelRatio: number;
  antialias: boolean;
  renderWhenOffscreen: false;
  descriptionAr: string;
}

export interface DesignSourceRecord {
  sourceId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  safeFilename: string;
  sourceFormat: string;
  sourceRevision: string;
  observedByteSize: number;
  observedSha256: string;
  authorityStatus: DesignAssetAuthority;
  approvalScopeAr: string;
  software: string;
  softwareVersion: string;
  modelUnits: 'meter' | 'millimeter' | 'centimeter' | 'unknown';
  readStatus: 'verified' | 'invalid' | 'missing';
  spatialRegistrationStatus: DesignSceneEngineeringStatus;
  rightsStatus: 'internal-and-client-review' | 'internal-review-only' | 'unknown' | 'blocked';
  mayChangeReadiness: false;
  mayChangeBaseline: false;
  warningsAr: string[];
}

export interface DesignAssetManifest {
  manifestId: string;
  sourceId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  revision: number;
  contentHash: string;
  derivativeIds: string[];
  sceneIds: string[];
  sourceVerificationStatus: 'verified' | 'failed' | 'missing';
  acceptanceStatus: 'candidate-for-review' | 'accepted-for-review' | 'rejected';
  engineeringStatus: DesignSceneEngineeringStatus;
  operationalStatus: DesignSceneOperationalStatus;
  productionPanoramaAvailable: boolean;
  immutableSource: true;
  notesAr: string[];
}

export interface DesignAssetDerivative {
  derivativeId: string;
  sourceId: string;
  sourceSha256: string;
  safeFilename: string;
  format: 'glb' | 'gltf' | 'png' | 'jpeg';
  mimeType: string;
  byteSize: number;
  sha256: string;
  authorityStatus: DesignAssetAuthority;
  availability: DesignAssetState;
  runtimeUri: string | null;
  previewUri: string | null;
  sceneCount: number;
  sourceMeshCount: number;
  nodeCount: number;
  meshCount: number;
  primitiveCount: number;
  vertexCount: number;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  externalDependencyCount: number;
  units: 'meter' | 'millimeter' | 'centimeter' | 'unknown';
  coordinateFrame: 'three-y-up-meters' | 'mayadeen-z-up-meters' | 'unknown';
  boundsMin: [number, number, number];
  boundsMax: [number, number, number];
  dimensions: [number, number, number];
  optimizationStatus: 'browser-suitable' | 'optimization-required' | 'unknown';
  spatialRegistrationStatus: DesignSceneEngineeringStatus;
  includedContentAr: string[];
  excludedContentAr: string[];
  warningsAr: string[];
}

export interface DesignSceneRelation {
  relationId: string;
  sceneId: string;
  targetType: 'candidate-entity' | 'experience-object' | 'touchpoint' | 'journey-step';
  targetId: string;
  status: DesignSceneRelationshipStatus;
  confidence: 'low' | 'medium' | 'high';
  reasonAr: string;
  authorityAr: string;
  createsSpatialRoute: false;
  createsApprovedGeometry: false;
}

export interface DesignSceneViewpoint {
  viewpointId: string;
  sceneId: string;
  labelAr: string;
  labelEn: string;
  kind: 'overview' | 'entrance' | 'section' | 'midpoint' | 'ending' | 'top' | 'front' | 'isometric' | 'presentation';
  frame: 'verified-bounds-relative';
  positionFactor: [number, number, number];
  targetFactor: [number, number, number];
  fieldOfViewDegrees: number;
  synthetic: true;
  truthLabelAr: 'كاميرا معاينة تصميمية مولدة';
}

export interface DesignCameraTour {
  tourId: string;
  sceneId: string;
  labelAr: string;
  viewpointIds: string[];
  intervalMs: number;
  loop: boolean;
  routeAuthority: 'none';
  panoramaAuthority: 'none';
  truthLabelAr: 'كاميرا معاينة تصميمية مولدة';
}

export interface DesignScene {
  sceneId: string;
  assetId: string;
  derivativeId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  authorityStatus: DesignAssetAuthority;
  designIntentStatus: 'founder-approved-source-intent';
  engineeringStatus: DesignSceneEngineeringStatus;
  operationalStatus: DesignSceneOperationalStatus;
  routeStatus: 'none';
  panoramaStatus: 'missing';
  eventDayIds: string[];
  personaIds: string[];
  relationshipIds: string[];
  viewpointIds: string[];
  cameraTourId: string;
  defaultLens: DesignSceneLens;
  defaultQualityProfile: DesignSceneQualityProfile;
  clientPresentationAllowed: boolean;
  technicalTruthAr: string[];
}

export interface DesignExperienceConfiguration {
  sources: DesignSourceRecord[];
  manifests: DesignAssetManifest[];
  derivatives: DesignAssetDerivative[];
  scenes: DesignScene[];
  relations: DesignSceneRelation[];
  viewpoints: DesignSceneViewpoint[];
  cameraTours: DesignCameraTour[];
  performanceProfiles: DesignAssetPerformanceProfile[];
}

export interface DesignAssetValidationIssue {
  code: string;
  field: string;
  severity: 'blocking' | 'warning';
  messageAr: string;
}

export interface DesignAssetValidationResult {
  valid: boolean;
  renderable: boolean;
  issues: DesignAssetValidationIssue[];
  messageAr: string;
}
