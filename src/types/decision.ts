import type {
  EvidenceReference,
  EscalationLevel,
  ImpactLevel,
  OperationalStateContext,
  SpatialEntityId
} from './spatial';

export type DecisionId = `DECISION-${string}`;
export type EventId = `EVENT-${string}`;
export type VenueId = `VENUE-${string}`;

export const decisionRelationTypeValues = [
  'execution-target',
  'affected',
  'dependency',
  'evidence-source'
] as const;
export type DecisionRelationType = (typeof decisionRelationTypeValues)[number];

export const decisionTypeValues = [
  'readiness',
  'safety',
  'quality',
  'logistics',
  'visitor-experience',
  'security',
  'technical',
  'supplier',
  'schedule',
  'resource-allocation'
] as const;
export type DecisionType = (typeof decisionTypeValues)[number];

export const decisionUrgencyValues = ['low', 'medium', 'high', 'critical'] as const;
export type DecisionUrgency = (typeof decisionUrgencyValues)[number];

export const decisionConfidenceValues = ['low', 'medium', 'high'] as const;
export type DecisionConfidence = (typeof decisionConfidenceValues)[number];

export const decisionApprovalStatusValues = ['draft', 'under-review', 'approved', 'rejected'] as const;
export type DecisionApprovalStatus = (typeof decisionApprovalStatusValues)[number];

export const decisionLifecycleValues = [
  'draft',
  'review',
  'approved',
  'assigned',
  'in-progress',
  'completed',
  'verified',
  'closed'
] as const;
export type DecisionLifecycleStatus = (typeof decisionLifecycleValues)[number];

export const decisionOutcomeValues = ['not-started', 'pending', 'positive', 'mixed', 'negative', 'not-measured'] as const;
export type DecisionOutcomeStatus = (typeof decisionOutcomeValues)[number];

export type DecisionPriorityLabel = 'عاجلة' | 'مرتفعة' | 'متوسطة' | 'منخفضة';

export interface DecisionEntityRelation {
  relationId: string;
  decisionId: DecisionId;
  entityId: SpatialEntityId;
  relationType: DecisionRelationType;
  impactLevel: ImpactLevel;
  descriptionAr: string;
  source: string;
  confidence: DecisionConfidence;
  stateContext: OperationalStateContext;
}

export interface DecisionOption {
  optionId: string;
  titleAr: string;
  descriptionAr: string;
  expectedImpact: string;
  risks: string[];
}

export interface DecisionImpactAssessment {
  level: ImpactLevel;
  summaryAr: string;
  dimensions: Partial<Record<'operational' | 'safety' | 'visitor' | 'schedule' | 'dependency' | 'resource', ImpactLevel>>;
}

export interface DecisionHistoryEntry {
  revision: number;
  status: DecisionLifecycleStatus;
  changedAt: string;
  changedBy: string;
  changeReason: string;
}

export interface DecisionRecord {
  decisionId: DecisionId;
  title: string;
  description: string;
  eventId: EventId;
  venueId: VenueId;
  relationships: DecisionEntityRelation[];
  stateContext: OperationalStateContext;
  source: string;
  sourceType: 'temporary-demo' | 'manual-update' | 'exercise' | 'approved-plan' | 'field-check';
  createdAt: string;
  createdBy: string;
  decisionOwner: string;
  responsibleParty: string;
  approvingAuthority: string;
  problemStatement: string;
  decisionType: DecisionType;
  urgency: DecisionUrgency;
  priority: number;
  confidence: DecisionConfidence;
  evidence: EvidenceReference[];
  assumptions: string[];
  constraints: string[];
  availableOptions: DecisionOption[];
  selectedOption: string | null;
  rejectedOptions: string[];
  approvalStatus: DecisionApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalComments: string;
  actionRequired: string;
  assignedTo: string | null;
  dueAt: string;
  escalationLevel: EscalationLevel;
  status: DecisionLifecycleStatus;
  expectedImpact: DecisionImpactAssessment;
  actualImpact: DecisionImpactAssessment | null;
  outcomeStatus: DecisionOutcomeStatus;
  completionEvidenceIds: string[];
  completionNote: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verificationEvidenceIds: string[];
  closedBy: string | null;
  closedAt: string | null;
  closureReason: string;
  lessonsLearned: string;
  revision: number;
  changeReason: string;
  changeHistory: DecisionHistoryEntry[];
}

export type LegacyDecisionRecordInput = Omit<
  DecisionRecord,
  | 'relationships'
  | 'completionEvidenceIds'
  | 'completionNote'
  | 'verifiedBy'
  | 'verifiedAt'
  | 'verificationEvidenceIds'
  | 'closedBy'
  | 'closedAt'
  | 'closureReason'
> & {
  relatedEntityIds: SpatialEntityId[];
  completionEvidenceIds?: string[];
  completionNote?: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  verificationEvidenceIds?: string[];
  closedBy?: string | null;
  closedAt?: string | null;
  closureReason?: string;
};
