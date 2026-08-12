import type { OperationalStatus, RiskLevel } from './status';

export type Vector3Tuple = [number, number, number];

export type EntityType =
  | 'site'
  | 'zone'
  | 'hall'
  | 'gate'
  | 'route'
  | 'stage'
  | 'parking'
  | 'service'
  | 'assembly'
  | 'asset';

export type SiteId = `SITE-${string}`;
export type ZoneId = `ZONE-${string}`;
export type HallId = `HALL-${string}`;
export type GateId = `GATE-${string}`;
export type RouteId = `ROUTE-${string}`;
export type StageId = `STAGE-${string}`;
export type ParkingId = `PARK-${string}`;
export type ServiceId = `SERVICE-${string}`;
export type AssemblyId = `ASSEMBLY-${string}`;
export type AssetId = `ASSET-${string}`;

export type SpatialEntityId =
  | SiteId
  | ZoneId
  | HallId
  | GateId
  | RouteId
  | StageId
  | ParkingId
  | ServiceId
  | AssemblyId
  | AssetId;

export type SpatialDataSource = 'temporary-demo' | 'operational-baseline';
export type SpatialStateLayer = 'baseline' | 'scenario';

export const operationalStateContextValues = ['temporary-demo', 'baseline', 'scenario'] as const;
export type OperationalStateContext = (typeof operationalStateContextValues)[number];
export const readinessStateContextValues = operationalStateContextValues;
export type ReadinessStateContext = OperationalStateContext;

export const readinessSourceTypeValues = ['temporary-demo', 'manual-update', 'approved-plan', 'field-check', 'exercise'] as const;
export type ReadinessSourceType = (typeof readinessSourceTypeValues)[number];

export const approvalStatusValues = ['draft', 'submitted', 'under-review', 'approved', 'rejected', 'expired'] as const;
export type ApprovalStatus = (typeof approvalStatusValues)[number];

export const readinessConfidenceValues = ['low', 'medium', 'high'] as const;
export type ReadinessConfidence = (typeof readinessConfidenceValues)[number];

export const escalationLevelValues = ['none', 'watch', 'elevated', 'urgent'] as const;
export type EscalationLevel = (typeof escalationLevelValues)[number];

export const evidenceStatusValues = ['verified', 'pending', 'missing'] as const;
export type EvidenceStatus = (typeof evidenceStatusValues)[number];

export interface EvidenceReference {
  id: string;
  type: 'checklist' | 'plan' | 'field-note' | 'photo-reference' | 'exercise';
  titleAr: string;
  source: string;
  capturedAt: string;
  status: EvidenceStatus;
}

export interface ReadinessBlocker {
  id: string;
  titleAr: string;
  owner: string;
  severity: RiskLevel;
  status: 'open' | 'resolved';
  dueAt: string;
}

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high';

export interface OperationalImpact {
  opening: ImpactLevel;
  visitorRoutes: ImpactLevel;
  safety: ImpactLevel;
  dependentAreas: ImpactLevel;
  summaryAr: string;
}

export interface FutureRevisionRecord {
  revisionId: string;
  updatedAt: string;
  updatedBy: string;
  note?: string;
}

export interface OperationalReadinessContract {
  stateContext: ReadinessStateContext;
  source: string;
  sourceType: ReadinessSourceType;
  updatedAt: string;
  updatedBy: string;
  owner: string;
  responsibleParty: string;
  evidence: EvidenceReference[];
  confidence: ReadinessConfidence;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  revision: number;
  changeReason: string;
  targetReadinessDate: string;
  blockers: ReadinessBlocker[];
  dependencies: ZoneId[];
  requiredAction: string;
  escalationLevel: EscalationLevel;
  dueAt: string;
  operationalImpact: OperationalImpact;
  relatedRouteIds: RouteId[];
  openingImpact: ImpactLevel;
  expiresAt?: string;
}

export interface ZoneReadinessRecord extends OperationalReadinessContract {
  zoneId: ZoneId;
  readiness: number;
  status: OperationalStatus;
  riskLevel: RiskLevel;
}

export interface EventStateContext {
  dataSource: SpatialDataSource;
  stateLayer: SpatialStateLayer;
}

/** Compatibility contract for future source-backed integrations. */
export interface FutureOperationalEvidenceContract {
  source: string;
  updatedAt: string;
  updatedBy: string;
  owner: string;
  evidence: EvidenceReference[];
  confidence: ReadinessConfidence;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  revisionHistory: FutureRevisionRecord[];
}

export type EntityMetadataValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[];

export interface SpatialEntity {
  id: SpatialEntityId;
  nameAr: string;
  nameEn: string;
  type: EntityType;
  parentId: SpatialEntityId | null;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  scale: Vector3Tuple;
  status: OperationalStatus;
  readiness: number;
  riskLevel: RiskLevel;
  capacity: number;
  responsibleParty: string;
  description: string;
  metadata: Record<string, EntityMetadataValue>;
  operationalReadiness?: OperationalReadinessContract;
}

export type SpatialEntityRecord = Record<SpatialEntityId, SpatialEntity>;
