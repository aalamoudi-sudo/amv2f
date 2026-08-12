import type {
  DecisionEntityRelation,
  DecisionRecord,
  LegacyDecisionRecordInput
} from '../types/decision';

export const DECISION_RELATIONSHIP_SCHEMA_VERSION = 2;
export const DECISION_INTEGRITY_SCHEMA_VERSION = 3;

export const decisionRelationLabelsAr: Record<DecisionEntityRelation['relationType'], string> = {
  'execution-target': 'هدف التنفيذ',
  affected: 'عنصر متأثر',
  dependency: 'اعتمادية',
  'evidence-source': 'مصدر دليل'
};

export interface DecisionMigrationWarning {
  code: 'missing-completion-provenance' | 'missing-verification-provenance' | 'missing-closure-provenance' | 'legacy-positional-relationships';
  field: string;
  messageAr: string;
}

export interface DecisionMigrationResult {
  record: DecisionRecord;
  warnings: DecisionMigrationWarning[];
  fieldsRequiringReview: string[];
  originalSchemaVersion: number;
  targetSchemaVersion: number;
}

export interface UntrustedDecisionMigrationResult {
  candidate: unknown;
  warnings: DecisionMigrationWarning[];
  fieldsRequiringReview: string[];
  originalSchemaVersion: number;
  targetSchemaVersion: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toUnknownArray(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((item: unknown) => item);
}

function relationDescription(relationType: DecisionEntityRelation['relationType']): string {
  const descriptions: Record<DecisionEntityRelation['relationType'], string> = {
    'execution-target': 'العنصر الذي يستهدفه تنفيذ القرار مباشرة.',
    affected: 'عنصر يتأثر بنتيجة القرار أو تأخره.',
    dependency: 'عنصر تعتمد عليه نتيجة القرار أو تنفيذه.',
    'evidence-source': 'عنصر مكاني يرتبط بمصدر دليل القرار.'
  };
  return descriptions[relationType];
}

export function migrateLegacyDecisionRelationships(
  decision: Pick<LegacyDecisionRecordInput, 'decisionId' | 'relatedEntityIds' | 'expectedImpact' | 'source' | 'confidence' | 'stateContext'>
): DecisionEntityRelation[] {
  return decision.relatedEntityIds.map((entityId, index) => {
    const relationType: DecisionEntityRelation['relationType'] = index === 0 ? 'execution-target' : 'affected';
    return {
      relationId: `RELATION-${decision.decisionId.replace('DECISION-', '')}-${String(index + 1).padStart(2, '0')}`,
      decisionId: decision.decisionId,
      entityId,
      relationType,
      impactLevel: decision.expectedImpact.level,
      descriptionAr: relationDescription(relationType),
      source: decision.source,
      confidence: decision.confidence,
      stateContext: decision.stateContext
    };
  });
}

function warning(
  code: DecisionMigrationWarning['code'],
  field: string,
  messageAr: string
): DecisionMigrationWarning {
  return { code, field, messageAr };
}

export function migrateLegacyDecisionRecordWithWarnings(
  input: DecisionRecord | LegacyDecisionRecordInput
): DecisionMigrationResult {
  const untrusted = migrateUntrustedDecisionRecord(input);
  return {
    record: untrusted.candidate as DecisionRecord,
    warnings: untrusted.warnings,
    fieldsRequiringReview: untrusted.fieldsRequiringReview,
    originalSchemaVersion: untrusted.originalSchemaVersion,
    targetSchemaVersion: untrusted.targetSchemaVersion
  };
}

export function migrateUntrustedDecisionRecord(value: unknown): UntrustedDecisionMigrationResult {
  if (!isRecord(value)) {
    return {
      candidate: value,
      warnings: [],
      fieldsRequiringReview: [],
      originalSchemaVersion: 1,
      targetSchemaVersion: DECISION_INTEGRITY_SCHEMA_VERSION
    };
  }
  const explicitRelationships = toUnknownArray(value.relationships);
  const hadExplicitRelationships = explicitRelationships !== null;
  const decisionId = typeof value.decisionId === 'string' ? value.decisionId : 'DECISION-UNKNOWN';
  const expectedImpact = isRecord(value.expectedImpact) ? value.expectedImpact : {};
  const relatedEntityIds = toUnknownArray(value.relatedEntityIds) ?? [];
  const relationships: unknown[] = explicitRelationships
    ? explicitRelationships.map((relation) => isRecord(relation) ? { ...relation } : relation)
    : relatedEntityIds.map((entityId, index) => {
        const relationType: DecisionEntityRelation['relationType'] = index === 0 ? 'execution-target' : 'affected';
        return {
          relationId: `RELATION-${decisionId.replace('DECISION-', '')}-${String(index + 1).padStart(2, '0')}`,
          decisionId,
          entityId,
          relationType,
          impactLevel: expectedImpact.level,
          descriptionAr: relationDescription(relationType),
          source: value.source,
          confidence: value.confidence,
          stateContext: value.stateContext
        };
      });
  const candidate: Record<string, unknown> = { ...value };
  delete candidate.relatedEntityIds;
  candidate.relationships = relationships;
  if (!Object.prototype.hasOwnProperty.call(candidate, 'completionEvidenceIds')) candidate.completionEvidenceIds = [];
  if (!Object.prototype.hasOwnProperty.call(candidate, 'completionNote')) candidate.completionNote = '';
  if (!Object.prototype.hasOwnProperty.call(candidate, 'verifiedBy')) candidate.verifiedBy = null;
  if (!Object.prototype.hasOwnProperty.call(candidate, 'verifiedAt')) candidate.verifiedAt = null;
  if (!Object.prototype.hasOwnProperty.call(candidate, 'verificationEvidenceIds')) candidate.verificationEvidenceIds = [];
  if (!Object.prototype.hasOwnProperty.call(candidate, 'closedBy')) candidate.closedBy = null;
  if (!Object.prototype.hasOwnProperty.call(candidate, 'closedAt')) candidate.closedAt = null;
  if (!Object.prototype.hasOwnProperty.call(candidate, 'closureReason')) candidate.closureReason = '';

  const warnings: DecisionMigrationWarning[] = [];
  const statusIndex = ['draft', 'review', 'approved', 'assigned', 'in-progress', 'completed', 'verified', 'closed'].indexOf(
    typeof candidate.status === 'string' ? candidate.status : ''
  );
  if (!hadExplicitRelationships && relatedEntityIds.length > 0) {
    warnings.push(warning(
      'legacy-positional-relationships',
      'relationships',
      'حُولت العلاقات القديمة حتمياً: العنصر الأول هدف تنفيذ والبقية عناصر متأثرة. يجب مراجعة المعنى قبل الاعتماد.'
    ));
  }
  const completionEvidenceIds = Array.isArray(candidate.completionEvidenceIds) ? candidate.completionEvidenceIds : [];
  const completionNote = typeof candidate.completionNote === 'string' ? candidate.completionNote : '';
  if (statusIndex >= 5 && completionEvidenceIds.length === 0 && completionNote.trim().length === 0) {
    warnings.push(warning(
      'missing-completion-provenance',
      'completionEvidenceIds',
      'السجل القديم لا يحتوي مصدر إكمال صريحاً؛ لم يُنشأ دليل بديل تلقائياً.'
    ));
  }
  const verificationEvidenceIds = Array.isArray(candidate.verificationEvidenceIds) ? candidate.verificationEvidenceIds : [];
  if (
    statusIndex >= 6 &&
    (typeof candidate.verifiedBy !== 'string' || candidate.verifiedBy.trim().length === 0 || typeof candidate.verifiedAt !== 'string' || candidate.verifiedAt.trim().length === 0 || verificationEvidenceIds.length === 0)
  ) {
    warnings.push(warning(
      'missing-verification-provenance',
      'verificationEvidenceIds',
      'السجل القديم يفتقد مصدر التحقق الكامل؛ لم يُنسخ المعتمد أو الدليل العام إلى حقول التحقق.'
    ));
  }
  if (
    statusIndex >= 7 &&
    (typeof candidate.closedBy !== 'string' || candidate.closedBy.trim().length === 0 || typeof candidate.closedAt !== 'string' || candidate.closedAt.trim().length === 0 || typeof candidate.closureReason !== 'string' || candidate.closureReason.trim().length === 0)
  ) {
    warnings.push(warning(
      'missing-closure-provenance',
      'closureReason',
      'السجل القديم يفتقد مصدر الإغلاق الكامل؛ لم يُستنتج الفاعل أو الوقت أو السبب من حقول أخرى.'
    ));
  }

  return {
    candidate,
    warnings,
    fieldsRequiringReview: [...new Set(warnings.map((currentWarning) => currentWarning.field))],
    originalSchemaVersion: hadExplicitRelationships ? DECISION_RELATIONSHIP_SCHEMA_VERSION : 1,
    targetSchemaVersion: DECISION_INTEGRITY_SCHEMA_VERSION
  };
}

export function migrateLegacyDecisionRecord(
  input: DecisionRecord | LegacyDecisionRecordInput
): DecisionRecord {
  return migrateLegacyDecisionRecordWithWarnings(input).record;
}
