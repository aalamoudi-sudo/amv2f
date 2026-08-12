export const spatialSemanticStatusValues = [
  'founder-approved',
  'source-derived',
  'proposed',
  'unresolved'
] as const;
export type SpatialSemanticStatus = (typeof spatialSemanticStatusValues)[number];

export const spatialTruthStatusValues = [
  'candidate-visual-anchor',
  'probable',
  'conflicted',
  'unresolved',
  'independent-landmark'
] as const;
export type SpatialTruthStatus = (typeof spatialTruthStatusValues)[number];

export const spatialEngineeringStatusValues = [
  'unverified',
  'calibrated',
  'engineering-approved'
] as const;
export type SpatialEngineeringStatus = (typeof spatialEngineeringStatusValues)[number];

export const spatialOperationalStatusValues = [
  'unavailable',
  'reported',
  'verified',
  'baseline'
] as const;
export type SpatialOperationalStatus = (typeof spatialOperationalStatusValues)[number];

export interface SpatialTruthSourceReference {
  sourceReferenceId: string;
  sourceAssetId: string | null;
  sourceHash: string | null;
  authorityStatus: string;
  role: 'working-cad' | 'candidate-zoning' | 'concept-reference' | 'field-evidence' | 'founder-authorization';
}

export interface SpatialTruthAnchorReference {
  sourceLayerId: string;
  sourceHash: string;
  anchorStatus: 'frozen-candidate-visual-anchor';
  revision: number;
}

export interface SpatialSemanticDecision {
  decisionId: string;
  targetType: 'candidate-entity' | 'experience-object';
  targetId: string;
  primaryLabelAr: string;
  primaryLabelEn: string | null;
  legacyAliases: string[];
  semanticStatus: SpatialSemanticStatus;
  spatialStatus: SpatialTruthStatus;
  engineeringStatus: SpatialEngineeringStatus;
  operationalStatus: SpatialOperationalStatus;
  journeyMembership: 'current-five-step' | 'outside-current-journey' | 'unresolved-no-anchor';
  anchorReference: SpatialTruthAnchorReference | null;
  notes: string[];
}

export interface SpatialTruthCandidateRelationship {
  relationshipId: string;
  experienceObjectId: string | null;
  candidateEntityIds: string[];
  relationshipStatus: 'proposed' | 'probable' | 'conflicted' | 'unresolved';
  semanticAuthority: SpatialSemanticStatus;
  engineeringStatus: SpatialEngineeringStatus;
  operationalStatus: SpatialOperationalStatus;
  notes: string[];
}

export interface SpatialTruthUnresolvedItem {
  unresolvedItemId: string;
  targetIds: string[];
  semanticStatus: SpatialSemanticStatus;
  spatialStatus: 'unresolved' | 'conflicted';
  requiredEvidence: string;
  prohibitedFallbacks: string[];
}

export interface SpatialTruthIndependentLandmark {
  candidateEntityId: string;
  displayNameAr: string;
  spatialStatus: 'independent-landmark';
  journeyMembership: 'outside-current-journey';
}

export interface SpatialTruthLimitation {
  limitationId: string;
  labelAr: string;
  status: 'missing' | 'unknown' | 'unverified' | 'unavailable' | 'prohibited';
  scope: string;
}

export interface SpatialTruthChange {
  path: string;
  before: unknown;
  after: unknown;
}

export interface SpatialTruthRevisionMetadata {
  changeReason: string;
  previousHash: string;
  beforeAfterDiff: SpatialTruthChange[];
  actor: string;
  date: string;
  evidenceOrAuthorityReferences: string[];
}

export interface SpatialTruthPack {
  schemaVersion: '1.0.0';
  packId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  revision: number;
  effectiveDate: string;
  authorityType: 'founder-product-authority';
  approvedBy: string;
  approvalScope: string[];
  sourceReferences: SpatialTruthSourceReference[];
  semanticDecisions: SpatialSemanticDecision[];
  candidateRelationships: SpatialTruthCandidateRelationship[];
  unresolvedItems: SpatialTruthUnresolvedItem[];
  independentLandmarks: SpatialTruthIndependentLandmark[];
  engineeringLimitations: SpatialTruthLimitation[];
  operationalLimitations: SpatialTruthLimitation[];
  supersedes: string | null;
  revisionMetadata: SpatialTruthRevisionMetadata | null;
  frozen: true;
  contentHash: string;
}

export type SpatialTruthPackDraft = Omit<SpatialTruthPack, 'packId' | 'contentHash' | 'frozen'>;

export interface CandidateVisualAnchor {
  candidateEntityId: string;
  x: number;
  y: number;
  sourceLayerId: string;
  sourceHash: string;
  anchorStatus: 'candidate-visual-anchor';
  revision: number;
}

export interface CandidateAnchorRevision {
  anchorRevisionId: string;
  projectId: string;
  eventId: string;
  venueId: string;
  baseTruthPackId: string;
  revision: number;
  status: 'draft' | 'frozen-candidate';
  sourceLayerId: string;
  sourceHash: string;
  anchors: CandidateVisualAnchor[];
  changeReason: string;
  actor: string;
  createdAt: string;
  previousAnchorRevisionId: string | null;
  beforeAfterDiff: SpatialTruthChange[];
  contentHash: string;
}

export interface CandidateAnchorEditingSession {
  projectId: string;
  eventId: string;
  venueId: string;
  baseTruthPackId: string;
  sourceLayerId: string;
  sourceHash: string;
  frozenRevision: number;
  frozenAnchors: CandidateVisualAnchor[];
  workingAnchors: CandidateVisualAnchor[];
  undoStack: CandidateVisualAnchor[][];
  redoStack: CandidateVisualAnchor[][];
  changeReason: string;
  dirty: boolean;
}
