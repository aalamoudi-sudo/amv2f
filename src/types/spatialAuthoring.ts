import type { SpatialEntityId } from './spatial';

export const kapWorkingCadSourceHash = 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d' as const;

export type CadCaptureStatus = 'provisional-capture' | 'approved-source-capture';
export type CadEffectiveClassification = 'founder-approved-cad-source' | 'approved-working-baseline' | 'provisional-capture' | 'rejected';
export type CadAuthorityType = 'founder-approved-cad-source' | 'platform-owner-working-approval' | 'engineering-approval' | 'client-final-approval';
export type CadIdentityTrust = 'local-declared' | 'local-byte-verified' | 'production-verified' | 'digitally-signed';
export type CadFindingBasis = 'declared' | 'detected' | 'inferred' | 'unknown' | 'historical-unverified';
export type CadConfidence = 'high' | 'medium' | 'low' | 'unknown';

export const cadPermittedUseValues = [
  'platform-spatial-development',
  '2d-visualization',
  'candidate-zone-mapping',
  'candidate-spatial-relationships',
  'flat-spatial-preview',
  'experience-map-development',
  'executive-command-map-development',
  'projection-mapping-preparation',
  'technical-spatial-testing'
] as const;
export type CadPermittedUse = (typeof cadPermittedUseValues)[number];

export const cadProhibitedUseValues = [
  'survey-control',
  'official-geospatial-location',
  'construction',
  'field-measurement',
  'safety-certification',
  'evacuation-authority',
  'crowd-capacity',
  'route-authority',
  'hse-decisions',
  'emergency-decisions',
  'live-operational-baseline',
  'verified-readiness',
  'final-client-acceptance'
] as const;
export type CadProhibitedUse = (typeof cadProhibitedUseValues)[number];

export interface CadSourceContentIdentity {
  sourceId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  fileName: string;
  mediaType: 'application/acad';
  formatSignature: string;
  contentHash: string;
  byteSize: number;
  captureStatus: CadCaptureStatus;
  capturedAt: string;
  originalCaptureRef: string;
}

export interface CadSourceLocation {
  locationId: string;
  sourceId: string;
  sourceHash: string;
  displayName: string;
  storageScope: 'operator-local';
  pathDisclosure: 'restricted-local';
  observedAt: string;
  availability: 'available' | 'unavailable';
}

export interface CadAuthorityAssertion {
  authorityAssertionId: string;
  sourceId: string;
  sourceHash: string;
  effectiveDate: string;
  authorityType: CadAuthorityType;
  authorityName: string;
  identityTrust: CadIdentityTrust;
  scope: string;
  validUntil: string;
  assertedAt: string;
  supersedesAssertionId: string | null;
  revokedAt: string | null;
}

export interface EffectiveCadAuthority {
  sourceId: string;
  sourceHash: string;
  classification: CadEffectiveClassification;
  authorityAssertionIds: string[];
  permittedUses: CadPermittedUse[];
  prohibitedUses: CadProhibitedUse[];
  engineeringAuthority: 'none' | 'working-only' | 'formal';
  spatialConfidence: CadConfidence;
  mappingApproval: 'none' | 'candidate' | 'reviewed' | 'approved-working';
  supersessionState: 'current' | 'superseded' | 'revoked';
}

export interface CadInspectionFinding {
  findingId: string;
  labelAr: string;
  value: string | number | string[] | Record<string, number> | null;
  source: string;
  extractionMethod: string;
  tool: string;
  toolVersion: string;
  confidence: CadConfidence;
  basis: CadFindingBasis;
  authorityEffect: 'none';
}

export interface CadHistoricalInspectionSnapshot {
  snapshotId: string;
  sourceRef: string;
  capturedValues: Record<string, unknown>;
  methodStatus: 'tool-and-version-unavailable';
  confidence: 'low';
  authorityEffect: 'none';
}

export interface CadInspectionReport {
  reportId: string;
  sourceId: string;
  sourceHash: string;
  inspectedAt: string;
  findings: CadInspectionFinding[];
  historicalSnapshots: CadHistoricalInspectionSnapshot[];
  warningsAr: string[];
}

export type SpatialUnits = 'unknown' | 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot';
export type SpatialAuthorityStatus = 'unknown' | 'declared-unverified' | 'detected-unverified' | 'approved-working' | 'formal-approved';

export interface SpatialControlPoint {
  controlPointId: string;
  sourceCoordinate: [number, number, number];
  targetCoordinate: [number, number, number];
  authorityRef: string;
  confidence: CadConfidence;
}

export interface SpatialTransformManifest {
  sourceSpatialRef: string | null;
  targetSpatialRef: string;
  sourceUnits: SpatialUnits;
  targetUnits: 'meter';
  scale: [number, number, number] | null;
  rotation: [number, number, number] | null;
  translation: [number, number, number] | null;
  northStatus: SpatialAuthorityStatus;
  originStatus: SpatialAuthorityStatus;
  crsStatus: SpatialAuthorityStatus;
  controlPoints: SpatialControlPoint[];
  authority: string | null;
  confidence: CadConfidence;
  revision: number;
  contentHash: string;
}

export type SpatialMappingMethod = 'manual-selection' | 'name-suggestion' | 'geometry-suggestion' | 'imported-review';
export const spatialMappingStatusValues = ['unmapped', 'suggested', 'candidate', 'reviewed', 'approved-working', 'rejected', 'superseded'] as const;
export type SpatialMappingStatus = (typeof spatialMappingStatusValues)[number];

export interface SpatialEntityMapping {
  mappingId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  entityId: SpatialEntityId;
  sourceId: string;
  sourceHash: string;
  geometryReference: string | null;
  layerReferences: string[];
  mappingMethod: SpatialMappingMethod;
  mappingStatus: SpatialMappingStatus;
  mappedBy: string | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  revision: number;
  changeReason: string;
  confidence: CadConfidence;
}

export interface CadLayerRecord {
  layerId: string;
  name: string;
  visible: boolean | null;
  frozen: boolean | null;
  off: boolean | null;
  geometryReferences: string[];
}

export interface SanitizedSpatialGeometry {
  geometryReference: string;
  geometryType: 'line' | 'polyline' | 'polygon' | 'block' | 'group';
  layerId: string;
  pointCount: number;
}

export interface CadConversionRequest {
  sourceId: string;
  sourceHash: string;
  inputFormat: 'dwg' | 'dxf' | 'pdf';
  conversionProfile: string;
}

export interface CadConversionOutput {
  status: 'converted';
  adapterId: string;
  adapterVersion: string;
  layers: CadLayerRecord[];
  geometry: SanitizedSpatialGeometry[];
  warningsAr: string[];
}

export interface CadConversionRequired {
  status: 'conversion-required';
  adapterId: string;
  adapterVersion: string;
  reasonAr: string;
  acceptableInputs: Array<'dxf-export' | 'packaged-dwg-with-xrefs' | 'approved-pdf-floor-plan'>;
}

export type CadConversionResult = CadConversionOutput | CadConversionRequired;

export interface CadConversionAdapter {
  adapterId: string;
  adapterVersion: string;
  executionBoundary: 'local-offline';
  convert(request: CadConversionRequest, signal: AbortSignal): Promise<CadConversionResult>;
}

export interface DerivedSpatialArtifact {
  derivedArtifactId: string;
  parentSourceId: string;
  parentSha256: string;
  conversionTool: string;
  conversionToolVersion: string;
  timestamp: string;
  conversionProfile: string;
  outputSha256: string;
  coordinateHandling: string;
  unitHandling: string;
  geometryCounts: Record<string, number>;
  simplificationSettings: Record<string, string | number | boolean>;
  knownLossOrWarnings: string[];
  projectId: string;
  eventId: string;
  venueId: string;
}

export interface SpatialProjectionLineage {
  projectId: string;
  eventId: string;
  venueId: string;
  sourceHash: string;
  mappingRevision: number;
  spatialProjectionVersion: string;
  transformVersion: string;
  outputs: Array<'experience-map' | 'executive-command-map' | 'spatial-2d' | 'spatial-3d' | 'projection-preview'>;
}

export interface SpatialFreezeGate {
  gateId: string;
  titleAr: string;
  status: 'source-authority-satisfied' | 'working-authority-satisfied' | 'blocked';
  changedOn: string | null;
  reasonAr: string;
}

export interface KapWorkingCadIntake {
  source: CadSourceContentIdentity;
  locations: CadSourceLocation[];
  authorityAssertions: CadAuthorityAssertion[];
  effectiveAuthority: EffectiveCadAuthority;
  inspection: CadInspectionReport;
  conversion: CadConversionRequired;
  transform: SpatialTransformManifest;
  mappings: SpatialEntityMapping[];
  derivedArtifacts: DerivedSpatialArtifact[];
  projection: SpatialProjectionLineage | null;
  freezeGates: SpatialFreezeGate[];
}
