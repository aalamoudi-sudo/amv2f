export const sourceAuthorityStatusValues = [
  'founder-approved-project-governance-source',
  'founder-approved-cad-source',
  'founder-approved-working-source',
  'founder-selected-working-candidate',
  'concept-reference-only',
  'field-reference-and-evidence-candidate',
  'missing',
  'rejected',
  'superseded'
] as const;
export type SourceAuthorityStatus = (typeof sourceAuthorityStatusValues)[number];

export const sourceIngestionStatusValues = [
  'missing',
  'downloading',
  'hash-mismatch',
  'validated',
  'duplicate-confirmed',
  'quarantined',
  'preview-ready',
  'blocked'
] as const;
export type SourceIngestionStatus = (typeof sourceIngestionStatusValues)[number];

export type SourceAssetType = 'cad' | 'pdf' | 'presentation' | 'field-media-inventory' | 'visitor-map' | 'other';
export type SourceAssetRole = 'working-cad' | 'project-governance' | 'candidate-operational-zoning' | 'concept-reference' | 'field-evidence' | 'visitor-map';
export type SourceContentStatus = 'unverified' | 'fingerprint-recorded' | 'content-verified' | 'duplicate' | 'metadata-only' | 'missing' | 'rejected';
export type SourceProvider = 'google-drive' | 'operator-local' | 'none' | 'other';
export type ProviderPermissionRisk = 'none-recorded' | 'DRIVE-PERMISSION-ANONYMOUS-WRITER';
export type SourceRightsStatus = 'unknown' | 'internal-review-only' | 'review-only' | 'confirmed' | 'not-applicable';
export type SourcePrivacyStatus = 'not-reviewed' | 'metadata-only' | 'restricted' | 'no-personal-data-recorded' | 'missing';
export type SourceRetentionStatus = 'local-review-snapshot' | 'manifest-only' | 'not-retained' | 'missing';
export type OperationalBaselineStatus = 'not-baseline' | 'approved-baseline';
export type GeometryApprovalStatus = 'not-approved' | 'approved';

export interface SourceAssetManifest {
  sourceAssetId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  externalFileId: string | null;
  sourceName: string;
  sourceType: SourceAssetType;
  sourceRole: SourceAssetRole;
  authorityStatus: SourceAuthorityStatus;
  contentStatus: SourceContentStatus;
  expectedByteSize: number | null;
  expectedSha256: string | null;
  observedByteSize: number | null;
  observedSha256: string | null;
  duplicateOfSourceAssetId: string | null;
  createdAtReported: string | null;
  fetchedAt: string | null;
  provider: SourceProvider;
  providerPermissionRisk: ProviderPermissionRisk;
  rightsStatus: SourceRightsStatus;
  privacyStatus: SourcePrivacyStatus;
  retentionStatus: SourceRetentionStatus;
  operationalBaselineStatus: OperationalBaselineStatus;
  geometryApprovalStatus: GeometryApprovalStatus;
  ingestionStatus: SourceIngestionStatus;
  validationErrors: string[];
  notes: string[];
}

export interface SourceAssetValidationIssue {
  code: string;
  path: string;
  messageAr: string;
  blocking: boolean;
}

export interface SourceAssetValidationResult {
  valid: boolean;
  issues: SourceAssetValidationIssue[];
}

export interface SourceAssetRegistrationResult {
  assets: SourceAssetManifest[];
  canonicalSourceAssetId: string;
  duplicateConfirmed: boolean;
  contentRevisionCreated: boolean;
}

export interface VerifiedSourceFingerprintObservation {
  sourceAssetId: string;
  byteSize: number;
  sha256: string;
  verifiedFromBytes: true;
}

export interface SourceAuthorityPromotion {
  authorityDecisionId: string;
  sourceAssetId: string;
  approvedSourceName: string;
  expectedByteSize: number;
  expectedSha256: string;
  previousAuthorityStatus: SourceAuthorityStatus;
  nextAuthorityStatus: SourceAuthorityStatus;
  approvedBy: string;
  effectiveAt: string;
  authorityScope: string[];
  contentRevisionCreated: false;
  operationalBaselineGranted: false;
  geometryApprovalGranted: false;
  notes: string[];
}

export const candidateGeometryStatusValues = [
  'source-marker-only',
  'normalized-image-anchor',
  'candidate-point',
  'candidate-area-reference',
  'approved-geometry',
  'unknown'
] as const;
export type CandidateGeometryStatus = (typeof candidateGeometryStatusValues)[number];

export type CandidateAnchorMethod = 'manual-derived-from-candidate-raster' | 'source-marker-only' | 'not-derived';
export type CandidateAnchorConfidence = 'high' | 'medium' | 'low' | 'unknown';

export const candidateRelationshipStateValues = [
  'proposed',
  'probable',
  'conflicted',
  'unresolved',
  'founder-confirmed',
  'authority-confirmed',
  'rejected'
] as const;
export type CandidateRelationshipState = (typeof candidateRelationshipStateValues)[number];

export interface NormalizedImageAnchor {
  x: number;
  y: number;
  coordinateSpace: 'normalized-image';
  origin: 'top-left';
  pageNumber: 1;
  previewSha256: string;
}

export interface CandidateSpatialEntity {
  candidateId: string;
  projectId: string;
  labelAr: string;
  workingLabelEn: string;
  sourceNumber: number;
  sourceAssetId: string;
  eventId: string;
  venueId: string;
  entityKindCandidate: string;
  normalizedAnchor: NormalizedImageAnchor | null;
  anchorMethod: CandidateAnchorMethod;
  anchorConfidence: CandidateAnchorConfidence;
  authorityStatus: SourceAuthorityStatus;
  geometryStatus: CandidateGeometryStatus;
  mappingStatus: CandidateRelationshipState;
  notes: string[];
}

export interface CandidateExperienceRelationship {
  relationshipId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  experienceObjectId: string | null;
  candidateEntityIds: string[];
  state: CandidateRelationshipState;
  confidence: CandidateAnchorConfidence;
  conflictCodes: string[];
  requiredApproval: string;
  notes: string[];
}

export type SourceLayerTruthStatus = 'working' | 'candidate' | 'conceptual' | 'evidence' | 'missing';

export interface CandidateSourceLayer {
  sourceLayerId: string;
  sourceAssetId: string;
  labelAr: string;
  labelEn: string;
  truthStatus: SourceLayerTruthStatus;
  previewUrl: string | null;
  previewSha256: string | null;
  previewCommitted: false;
  defaultVisible: boolean;
}

export interface CandidateSpatialOverlayMetadata {
  sourceAssetId: string;
  truthBannerAr: string;
  northSymbolStatus: 'present' | 'absent' | 'unknown';
  scaleStatus: 'known' | 'unknown';
  crsStatus: 'known' | 'unknown';
  approvalStatus: 'present' | 'missing';
  geometryCalibrationStatus: 'complete' | 'incomplete';
}

export type GpsHandlingStatus = 'present' | 'absent' | 'stripped' | 'quarantined' | 'approved';
export type FieldEvidenceMediaType = 'image' | 'video';
export type FieldEvidenceStatus = 'metadata-only' | 'candidate' | 'quarantined' | 'approved' | 'rejected';

export interface FieldEvidenceAsset {
  evidenceAssetId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  originalExternalFileId: string;
  originalFilename: string;
  mediaType: FieldEvidenceMediaType;
  contentHash: string | null;
  capturedAtReported: string | null;
  capturedAtSource: 'exif' | 'provider' | 'operator' | 'unknown';
  gpsPresent: boolean;
  gpsHandlingStatus: GpsHandlingStatus;
  privacyStatus: SourcePrivacyStatus;
  rightsStatus: SourceRightsStatus;
  linkedEntityIds: string[];
  linkedZoneIds: string[];
  evidenceStatus: FieldEvidenceStatus;
  authorityStatus: SourceAuthorityStatus;
  notes: string[];
}

export interface FieldEvidenceBrowserRecord {
  evidenceAssetId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  mediaType: FieldEvidenceMediaType;
  gpsPresent: boolean;
  gpsHandlingStatus: GpsHandlingStatus;
  privacyStatus: SourcePrivacyStatus;
  rightsStatus: SourceRightsStatus;
  linkedEntityIds: string[];
  linkedZoneIds: string[];
  evidenceStatus: FieldEvidenceStatus;
  authorityStatus: SourceAuthorityStatus;
  notes: string[];
}

export interface FieldEvidenceInventoryCategory {
  categoryId: string;
  labelAr: string;
  mediaType: FieldEvidenceMediaType;
  reviewedCount: number;
  sourceFolderId: string;
}

export interface FieldEvidenceInventorySnapshot {
  snapshotId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  reviewedAt: string;
  photographCount: number;
  videoCount: number;
  categories: FieldEvidenceInventoryCategory[];
  gpsPolicy: 'metadata-status-only-no-browser-coordinates';
  durableArchive: false;
  notes: string[];
}

export interface ProjectSourceReadinessSummary {
  sourceAssetCount: number;
  workingCadStatus: 'duplicate-confirmed' | 'missing' | 'blocked';
  candidateZoningStatus: 'preview-ready' | 'validated' | 'missing' | 'blocked';
  candidateOperationalEntityCount: number;
  mappingConflictCount: number;
  unresolvedMappingCount: number;
  missingGeometryControls: string[];
  visitorMapStatus: 'missing' | 'candidate' | 'available';
  fieldMediaStatusAr: string;
  spatialWorkspace: 'spatial-authoring';
  authoritySourceLayerId: string;
}

export interface CandidateSpatialIntakePackage {
  schemaVersion: '1.0.0';
  packageId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  sourceAssets: SourceAssetManifest[];
  canonicalSourceAssetIds: string[];
  sourceIntegrityRiskIds: ProviderPermissionRisk[];
  sourceLayers: CandidateSourceLayer[];
  overlay: CandidateSpatialOverlayMetadata;
  candidateEntities: CandidateSpatialEntity[];
  relationships: CandidateExperienceRelationship[];
  fieldEvidenceInventory: FieldEvidenceInventorySnapshot;
  sourceReadiness: ProjectSourceReadinessSummary;
  blockedGateIds: string[];
}
