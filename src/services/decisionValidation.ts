import {
  decisionApprovalStatusValues,
  decisionConfidenceValues,
  decisionLifecycleValues,
  decisionOutcomeValues,
  decisionRelationTypeValues,
  decisionTypeValues,
  decisionUrgencyValues,
  type DecisionEntityRelation,
  type DecisionHistoryEntry,
  type DecisionImpactAssessment,
  type DecisionLifecycleStatus,
  type DecisionOption,
  type DecisionRecord,
  type EventId,
  type VenueId
} from '../types/decision';
import {
  escalationLevelValues,
  evidenceStatusValues,
  operationalStateContextValues,
  type EvidenceReference,
  type ImpactLevel,
  type SpatialEntityId
} from '../types/spatial';

export type DecisionValidationCode =
  | 'missing-decision-id'
  | 'invalid-decision-id'
  | 'missing-event-id'
  | 'invalid-event-id'
  | 'unknown-event-id'
  | 'missing-venue-id'
  | 'invalid-venue-id'
  | 'unknown-venue-id'
  | 'duplicate-decision'
  | 'missing-title'
  | 'missing-problem-statement'
  | 'missing-source'
  | 'invalid-source-type'
  | 'missing-creation-data'
  | 'missing-owner'
  | 'missing-responsible-party'
  | 'missing-approving-authority'
  | 'invalid-state-context'
  | 'invalid-decision-type'
  | 'invalid-urgency'
  | 'invalid-confidence'
  | 'invalid-priority'
  | 'invalid-escalation-level'
  | 'invalid-revision'
  | 'invalid-approval-status'
  | 'approval-lifecycle-mismatch'
  | 'approved-status-needs-approval'
  | 'invalid-lifecycle-status'
  | 'invalid-outcome-status'
  | 'missing-option'
  | 'invalid-option'
  | 'duplicate-option'
  | 'missing-selected-option'
  | 'invalid-selected-option'
  | 'invalid-rejected-option'
  | 'selected-option-rejected'
  | 'missing-evidence'
  | 'invalid-evidence'
  | 'duplicate-evidence'
  | 'missing-approver'
  | 'invalid-date'
  | 'missing-assignment'
  | 'missing-action'
  | 'missing-completion-evidence'
  | 'dangling-completion-evidence'
  | 'missing-verifier'
  | 'missing-verification-evidence'
  | 'dangling-verification-evidence'
  | 'unverified-verification-evidence'
  | 'missing-closure-information'
  | 'missing-lessons-learned'
  | 'missing-relationship'
  | 'invalid-relation-type'
  | 'invalid-relationship'
  | 'duplicate-relationship'
  | 'unknown-related-entity'
  | 'scenario-imported-as-baseline'
  | 'invalid-transition'
  | 'missing-actual-impact'
  | 'invalid-impact'
  | 'incomplete-outcome-measurement'
  | 'invalid-string-list'
  | 'missing-history'
  | 'invalid-history-entry'
  | 'invalid-history-first-state'
  | 'duplicate-history-revision'
  | 'history-revision-gap'
  | 'skipped-lifecycle'
  | 'backward-lifecycle'
  | 'status-history-mismatch'
  | 'revision-history-mismatch'
  | 'invalid-history-chronology'
  | 'invalid-approval-chronology'
  | 'invalid-verification-chronology'
  | 'invalid-closure-chronology'
  | 'invalid-contract-value'
  | 'invalid-import-format';

export interface DecisionValidationIssue {
  code: DecisionValidationCode;
  field: string;
  path: string;
  recordId: string;
  recordIndex?: number;
  rowNumber?: number;
  severity: 'error' | 'warning';
  blocking: boolean;
  messageAr: string;
}

export interface DecisionValidationOptions {
  knownEntityIds?: Iterable<SpatialEntityId>;
  knownEventIds?: Iterable<EventId>;
  knownVenueIds?: Iterable<VenueId>;
  targetStateContext?: 'temporary-demo' | 'baseline' | 'scenario';
  sourceFormat?: 'csv' | 'json' | 'runtime';
  now?: Date;
}

export interface DecisionValidationResult {
  valid: boolean;
  issues: DecisionValidationIssue[];
  validRecords: DecisionRecord[];
}

export interface DecisionRuntimeParseResult {
  valid: boolean;
  issues: DecisionValidationIssue[];
  record: DecisionRecord | null;
}

const nextLifecycleStatus: Partial<Record<DecisionLifecycleStatus, DecisionLifecycleStatus>> = {
  draft: 'review',
  review: 'approved',
  approved: 'assigned',
  assigned: 'in-progress',
  'in-progress': 'completed',
  completed: 'verified',
  verified: 'closed'
};
const lifecycleIndex = new Map(decisionLifecycleValues.map((status, index) => [status, index]));
const decisionSourceTypeValues: DecisionRecord['sourceType'][] = ['temporary-demo', 'manual-update', 'exercise', 'approved-plan', 'field-check'];
const evidenceTypeValues: EvidenceReference['type'][] = ['checklist', 'plan', 'field-note', 'photo-reference', 'exercise'];
const impactLevelValues: ImpactLevel[] = ['none', 'low', 'medium', 'high'];
const impactDimensionValues = ['operational', 'safety', 'visitor', 'schedule', 'dependency', 'resource'] as const;
const measuredOutcomeValues: DecisionRecord['outcomeStatus'][] = ['positive', 'mixed', 'negative'];
const spatialIdPattern = /^(SITE|ZONE|HALL|GATE|ROUTE|STAGE|PARK|SERVICE|ASSEMBLY|ASSET)-[A-Za-z0-9-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function containsArabic(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value);
}

function issue(
  code: DecisionValidationCode,
  field: string,
  recordId: string,
  messageAr: string,
  severity: 'error' | 'warning' = 'error'
): DecisionValidationIssue {
  return {
    code,
    field,
    path: field,
    recordId,
    severity,
    blocking: severity === 'error',
    messageAr
  };
}

function findUndefinedPath(value: unknown, path = '$', seen = new Set<object>()): string | null {
  if (value === undefined) return path;
  if (typeof value !== 'object' || value === null) return null;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nested = findUndefinedPath(value[index], `${path}[${index}]`, seen);
      if (nested) return nested;
    }
    return null;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const nested = findUndefinedPath(nestedValue, `${path}.${key}`, seen);
    if (nested) return nested;
  }
  return null;
}

function validateRelationships(
  candidate: Record<string, unknown>,
  options: DecisionValidationOptions,
  effectiveId: string
): DecisionValidationIssue[] {
  const issues: DecisionValidationIssue[] = [];
  if (!Array.isArray(candidate.relationships) || candidate.relationships.length === 0) {
    return [issue('missing-relationship', 'relationships', effectiveId, 'يجب ربط القرار بعلاقة مكانية صريحة واحدة على الأقل.')];
  }

  const knownEntityIds = options.knownEntityIds ? new Set(options.knownEntityIds) : null;
  const relationIds = new Set<string>();
  const semanticKeys = new Set<string>();
  candidate.relationships.forEach((value, index) => {
    const relation = isRecord(value) ? value : {};
    const field = `relationships[${index}]`;
    const relationId = isNonEmptyString(relation.relationId) ? relation.relationId : `${effectiveId}-${index}`;
    const semanticKey = `${String(relation.entityId)}:${String(relation.relationType)}`;
    if (!isNonEmptyString(relation.relationId)) {
      issues.push(issue('invalid-relationship', `${field}.relationId`, effectiveId, 'معرف العلاقة المكانية مطلوب.'));
    }
    if (relation.decisionId !== effectiveId) {
      issues.push(issue('invalid-relationship', `${field}.decisionId`, effectiveId, 'معرف القرار داخل العلاقة لا يطابق القرار الحالي.'));
    }
    if (!isNonEmptyString(relation.entityId) || !spatialIdPattern.test(relation.entityId)) {
      issues.push(issue('invalid-relationship', `${field}.entityId`, effectiveId, 'معرف العنصر المكاني في العلاقة غير صالح.'));
    }
    if (!isNonEmptyString(relation.descriptionAr)) {
      issues.push(issue('invalid-relationship', `${field}.descriptionAr`, effectiveId, 'وصف العلاقة بالعربية مطلوب.'));
    }
    if (!isNonEmptyString(relation.source)) {
      issues.push(issue('invalid-relationship', `${field}.source`, effectiveId, 'مصدر العلاقة المكانية مطلوب.'));
    }
    if (!decisionRelationTypeValues.includes(relation.relationType as (typeof decisionRelationTypeValues)[number])) {
      issues.push(issue('invalid-relation-type', `${field}.relationType`, effectiveId, 'نوع العلاقة المكانية غير معروف.'));
    }
    if (!impactLevelValues.includes(relation.impactLevel as ImpactLevel)) {
      issues.push(issue('invalid-relationship', `${field}.impactLevel`, effectiveId, 'مستوى أثر العلاقة غير صالح.'));
    }
    if (!decisionConfidenceValues.includes(relation.confidence as (typeof decisionConfidenceValues)[number])) {
      issues.push(issue('invalid-relationship', `${field}.confidence`, effectiveId, 'درجة الثقة في العلاقة غير صالحة.'));
    }
    if (!operationalStateContextValues.includes(relation.stateContext as (typeof operationalStateContextValues)[number])) {
      issues.push(issue('invalid-relationship', `${field}.stateContext`, effectiveId, 'سياق العلاقة غير صالح.'));
    } else if (relation.stateContext !== candidate.stateContext) {
      issues.push(issue('invalid-relationship', `${field}.stateContext`, effectiveId, 'سياق العلاقة يجب أن يطابق سياق القرار.'));
    }
    if (knownEntityIds && isNonEmptyString(relation.entityId) && !knownEntityIds.has(relation.entityId as SpatialEntityId)) {
      issues.push(issue('unknown-related-entity', `${field}.entityId`, effectiveId, `العنصر المرتبط ${relation.entityId} غير معروف.`));
    }
    if (relationIds.has(relationId) || semanticKeys.has(semanticKey)) {
      issues.push(issue('duplicate-relationship', field, effectiveId, 'يوجد تكرار في العلاقة المكانية للقرار.'));
    }
    relationIds.add(relationId);
    semanticKeys.add(semanticKey);
    if (options.targetStateContext === 'baseline' && relation.stateContext === 'scenario') {
      issues.push(issue('scenario-imported-as-baseline', `${field}.stateContext`, effectiveId, 'لا يمكن إدخال علاقة سيناريو إلى الحالة الأساسية.'));
    }
  });
  return issues;
}

function validateEvidence(candidate: Record<string, unknown>, effectiveId: string): DecisionValidationIssue[] {
  const issues: DecisionValidationIssue[] = [];
  if (!Array.isArray(candidate.evidence)) {
    return [issue('invalid-evidence', 'evidence', effectiveId, 'قائمة الأدلة المنظمة مطلوبة حتى عندما تكون فارغة.')];
  }
  const ids = new Set<string>();
  candidate.evidence.forEach((value, index) => {
    const evidence = isRecord(value) ? value : {};
    const field = `evidence[${index}]`;
    if (
      !isNonEmptyString(evidence.id) ||
      !evidenceTypeValues.includes(evidence.type as EvidenceReference['type']) ||
      !isNonEmptyString(evidence.titleAr) ||
      !isNonEmptyString(evidence.source) ||
      !isIsoDate(evidence.capturedAt) ||
      !evidenceStatusValues.includes(evidence.status as EvidenceReference['status'])
    ) {
      issues.push(issue('invalid-evidence', field, effectiveId, 'مرجع الدليل يحتاج معرفاً ونوعاً وعنواناً ومصدراً ووقتاً وحالة صالحة.'));
    }
    if (isNonEmptyString(evidence.id) && ids.has(evidence.id)) {
      issues.push(issue('duplicate-evidence', `${field}.id`, effectiveId, `معرف الدليل ${evidence.id} مكرر.`));
    }
    if (isNonEmptyString(evidence.id)) ids.add(evidence.id);
  });
  return issues;
}

function validateOptions(candidate: Record<string, unknown>, effectiveId: string): DecisionValidationIssue[] {
  const issues: DecisionValidationIssue[] = [];
  if (!Array.isArray(candidate.availableOptions) || candidate.availableOptions.length === 0) {
    return [issue('missing-option', 'availableOptions', effectiveId, 'يجب توفير خيار قرار واحد على الأقل.')];
  }
  const optionIds = new Set<string>();
  candidate.availableOptions.forEach((value, index) => {
    const option = isRecord(value) ? value : {};
    const field = `availableOptions[${index}]`;
    if (
      !isNonEmptyString(option.optionId) ||
      !isNonEmptyString(option.titleAr) ||
      !isNonEmptyString(option.descriptionAr) ||
      !isNonEmptyString(option.expectedImpact) ||
      !isStringArray(option.risks)
    ) {
      issues.push(issue('invalid-option', field, effectiveId, 'الخيار يحتاج معرفاً وعنواناً ووصفاً وأثراً متوقعاً وقائمة مخاطر صالحة.'));
    }
    if (isNonEmptyString(option.optionId) && optionIds.has(option.optionId)) {
      issues.push(issue('duplicate-option', `${field}.optionId`, effectiveId, `معرف الخيار ${option.optionId} مكرر.`));
    }
    if (isNonEmptyString(option.optionId)) optionIds.add(option.optionId);
  });

  if (candidate.selectedOption !== null && !isNonEmptyString(candidate.selectedOption)) {
    issues.push(issue('invalid-selected-option', 'selectedOption', effectiveId, 'الخيار المحدد يجب أن يكون معرف خيار صالحاً أو فارغاً.'));
  } else if (isNonEmptyString(candidate.selectedOption) && !optionIds.has(candidate.selectedOption)) {
    issues.push(issue('invalid-selected-option', 'selectedOption', effectiveId, 'الخيار المحدد غير موجود ضمن الخيارات المتاحة.'));
  }
  if (!isStringArray(candidate.rejectedOptions)) {
    issues.push(issue('invalid-rejected-option', 'rejectedOptions', effectiveId, 'قائمة الخيارات المرفوضة غير صالحة.'));
  } else {
    const rejected = new Set<string>();
    for (const optionId of candidate.rejectedOptions) {
      if (!optionIds.has(optionId) || rejected.has(optionId)) {
        issues.push(issue('invalid-rejected-option', 'rejectedOptions', effectiveId, 'يوجد خيار مرفوض غير موجود أو مكرر.'));
      }
      rejected.add(optionId);
    }
    if (isNonEmptyString(candidate.selectedOption) && rejected.has(candidate.selectedOption)) {
      issues.push(issue('selected-option-rejected', 'rejectedOptions', effectiveId, 'لا يمكن أن يكون الخيار المحدد مرفوضاً في الوقت نفسه.'));
    }
  }
  return issues;
}

function validateImpact(value: unknown, field: string, effectiveId: string, required: boolean): DecisionValidationIssue[] {
  if (!required && value === null) return [];
  if (!isRecord(value)) {
    return [issue('invalid-impact', field, effectiveId, required ? 'تقييم الأثر المنظم مطلوب.' : 'تقييم الأثر الفعلي غير صالح.')];
  }
  const issues: DecisionValidationIssue[] = [];
  if (!impactLevelValues.includes(value.level as ImpactLevel)) {
    issues.push(issue('invalid-impact', `${field}.level`, effectiveId, 'مستوى الأثر غير صالح.'));
  }
  if (!isNonEmptyString(value.summaryAr) || !containsArabic(value.summaryAr)) {
    issues.push(issue('invalid-impact', `${field}.summaryAr`, effectiveId, 'ملخص الأثر بالعربية مطلوب.'));
  }
  if (!isRecord(value.dimensions)) {
    issues.push(issue('invalid-impact', `${field}.dimensions`, effectiveId, 'أبعاد الأثر يجب أن تكون بنية منظمة.'));
  } else {
    for (const [key, dimension] of Object.entries(value.dimensions)) {
      if (!impactDimensionValues.includes(key as (typeof impactDimensionValues)[number]) || !impactLevelValues.includes(dimension as ImpactLevel)) {
        issues.push(issue('invalid-impact', `${field}.dimensions.${key}`, effectiveId, 'بعد الأثر أو مستواه غير صالح.'));
      }
    }
  }
  return issues;
}

function validateHistory(candidate: Record<string, unknown>, effectiveId: string): DecisionValidationIssue[] {
  const issues: DecisionValidationIssue[] = [];
  if (!Array.isArray(candidate.changeHistory) || candidate.changeHistory.length === 0) {
    return [issue('missing-history', 'changeHistory', effectiveId, 'سجل تغييرات القرار مطلوب ويجب أن يبدأ بمسودة.')];
  }
  const history: unknown[] = candidate.changeHistory;

  const seenRevisions = new Set<number>();
  let previousStatusIndex = -1;
  let previousTimestamp = Number.NEGATIVE_INFINITY;
  const createdAt = isIsoDate(candidate.createdAt) ? Date.parse(candidate.createdAt) : Number.NaN;
  history.forEach((value, index) => {
    const entry = isRecord(value) ? value : {};
    const field = `changeHistory[${index}]`;
    const revision = entry.revision;
    const status = entry.status;
    const statusIndex = decisionLifecycleValues.includes(status as DecisionLifecycleStatus)
      ? lifecycleIndex.get(status as DecisionLifecycleStatus) ?? -1
      : -1;
    if (!Number.isInteger(revision) || Number(revision) <= 0) {
      issues.push(issue('invalid-history-entry', `${field}.revision`, effectiveId, 'رقم مراجعة سجل التغيير يجب أن يكون عدداً صحيحاً موجباً.'));
    } else {
      if (seenRevisions.has(Number(revision))) {
        issues.push(issue('duplicate-history-revision', `${field}.revision`, effectiveId, `رقم المراجعة ${String(revision)} مكرر.`));
      }
      if (Number(revision) !== index + 1) {
        issues.push(issue('history-revision-gap', `${field}.revision`, effectiveId, 'مراجعات سجل التغيير يجب أن تكون متسلسلة من 1 دون فجوات.'));
      }
      seenRevisions.add(Number(revision));
    }
    if (statusIndex < 0) {
      issues.push(issue('invalid-history-entry', `${field}.status`, effectiveId, 'حالة دورة القرار في سجل التغيير غير صالحة.'));
    } else if (index === 0 && status !== 'draft') {
      issues.push(issue('invalid-history-first-state', `${field}.status`, effectiveId, 'أول مراجعة في سجل القرار يجب أن تكون مسودة.'));
    } else if (index > 0) {
      if (statusIndex < previousStatusIndex) {
        issues.push(issue('backward-lifecycle', `${field}.status`, effectiveId, 'سجل القرار يحتوي انتقالاً عكسياً غير مسموح.'));
      } else if (statusIndex > previousStatusIndex + 1) {
        issues.push(issue('skipped-lifecycle', `${field}.status`, effectiveId, 'سجل القرار تجاوز مرحلة إلزامية في دورة القرار.'));
      }
    }
    if (!isIsoDate(entry.changedAt) || !isNonEmptyString(entry.changedBy) || !isNonEmptyString(entry.changeReason)) {
      issues.push(issue('invalid-history-entry', field, effectiveId, 'كل مراجعة تحتاج وقتاً ومحرراً وسبب تغيير واضحاً.'));
    } else {
      const timestamp = Date.parse(entry.changedAt);
      if (timestamp < previousTimestamp || (Number.isFinite(createdAt) && timestamp < createdAt)) {
        issues.push(issue('invalid-history-chronology', `${field}.changedAt`, effectiveId, 'أوقات سجل القرار يجب أن تكون مرتبة وألا تسبق إنشاء القرار.'));
      }
      previousTimestamp = timestamp;
    }
    if (statusIndex >= 0) previousStatusIndex = statusIndex;
  });

  const finalEntry = history.at(-1);
  if (isRecord(finalEntry)) {
    if (candidate.revision !== finalEntry.revision) {
      issues.push(issue('revision-history-mismatch', 'revision', effectiveId, 'رقم مراجعة القرار لا يطابق آخر مراجعة في السجل.'));
    }
    if (candidate.status !== finalEntry.status) {
      issues.push(issue('status-history-mismatch', 'status', effectiveId, 'حالة القرار لا تطابق الحالة النهائية في سجل التغيير.'));
    }
  }
  return issues;
}

function validateLifecycleRequirements(
  candidate: Record<string, unknown>,
  effectiveId: string,
  throughStatus: DecisionLifecycleStatus
): DecisionValidationIssue[] {
  const issues: DecisionValidationIssue[] = [];
  const throughIndex = lifecycleIndex.get(throughStatus) ?? -1;
  const atLeast = (status: DecisionLifecycleStatus) => throughIndex >= (lifecycleIndex.get(status) ?? Number.POSITIVE_INFINITY);

  if (atLeast('review')) {
    if (!isNonEmptyString(candidate.problemStatement)) issues.push(issue('missing-problem-statement', 'problemStatement', effectiveId, 'رفع القرار للمراجعة يحتاج وصفاً واضحاً للمشكلة.'));
    if (!isNonEmptyString(candidate.decisionOwner)) issues.push(issue('missing-owner', 'decisionOwner', effectiveId, 'رفع القرار للمراجعة يحتاج مالك قرار.'));
    if (!isNonEmptyString(candidate.responsibleParty)) issues.push(issue('missing-responsible-party', 'responsibleParty', effectiveId, 'رفع القرار للمراجعة يحتاج مسؤولاً عن التنفيذ.'));
    if (!isNonEmptyString(candidate.source)) issues.push(issue('missing-source', 'source', effectiveId, 'رفع القرار للمراجعة يحتاج مصدراً.'));
    if (!Array.isArray(candidate.availableOptions) || candidate.availableOptions.length === 0) issues.push(issue('missing-option', 'availableOptions', effectiveId, 'رفع القرار للمراجعة يحتاج خياراً واحداً على الأقل.'));
  }
  if (atLeast('approved')) {
    if (!isNonEmptyString(candidate.approvingAuthority)) issues.push(issue('missing-approving-authority', 'approvingAuthority', effectiveId, 'الاعتماد يحتاج جهة اعتماد معروفة.'));
    if (!isNonEmptyString(candidate.selectedOption)) issues.push(issue('missing-selected-option', 'selectedOption', effectiveId, 'الاعتماد يحتاج خياراً محدداً.'));
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) issues.push(issue('missing-evidence', 'evidence', effectiveId, 'الاعتماد يحتاج دليلاً منظماً صالحاً.'));
    if (!isNonEmptyString(candidate.approvedBy) || !isIsoDate(candidate.approvedAt)) issues.push(issue('missing-approver', 'approvedBy', effectiveId, 'الاعتماد يحتاج اسم المعتمد ووقت الاعتماد.'));
    if (candidate.approvalStatus !== 'approved') issues.push(issue('approved-status-needs-approval', 'approvalStatus', effectiveId, 'حالة دورة القرار المعتمدة تحتاج اعتماداً محلياً مكتملاً.'));
  }
  if (atLeast('assigned')) {
    if (!isNonEmptyString(candidate.assignedTo)) issues.push(issue('missing-assignment', 'assignedTo', effectiveId, 'الإسناد يحتاج منفذاً محدداً.'));
    if (!isNonEmptyString(candidate.actionRequired)) issues.push(issue('missing-action', 'actionRequired', effectiveId, 'الإسناد يحتاج إجراءً مطلوباً واضحاً.'));
    if (!isIsoDate(candidate.dueAt)) issues.push(issue('invalid-date', 'dueAt', effectiveId, 'الإسناد يحتاج موعداً صالحاً بصيغة زمنية معيارية.'));
  }
  if (atLeast('completed')) {
    const evidenceIds = Array.isArray(candidate.completionEvidenceIds) ? candidate.completionEvidenceIds.filter(isNonEmptyString) : [];
    if (evidenceIds.length === 0 && !isNonEmptyString(candidate.completionNote)) {
      issues.push(issue('missing-completion-evidence', 'completionEvidenceIds', effectiveId, 'اكتمال التنفيذ يحتاج دليل إكمال أو ملاحظة إكمال واضحة.'));
    }
  }
  if (atLeast('verified')) {
    if (!isRecord(candidate.actualImpact) || !isNonEmptyString(candidate.actualImpact.summaryAr)) {
      issues.push(issue('missing-actual-impact', 'actualImpact', effectiveId, 'التحقق يحتاج أثراً فعلياً مقاساً.'));
    }
    if (!measuredOutcomeValues.includes(candidate.outcomeStatus as DecisionRecord['outcomeStatus'])) {
      issues.push(issue('incomplete-outcome-measurement', 'outcomeStatus', effectiveId, 'التحقق يحتاج نتيجة مقاسة: إيجابية أو مختلطة أو سلبية.'));
    }
    if (!isNonEmptyString(candidate.verifiedBy) || !isIsoDate(candidate.verifiedAt)) {
      issues.push(issue('missing-verifier', 'verifiedBy', effectiveId, 'التحقق يحتاج اسم من تحقق من النتيجة ووقت التحقق.'));
    }
    if (!Array.isArray(candidate.verificationEvidenceIds) || candidate.verificationEvidenceIds.filter(isNonEmptyString).length === 0) {
      issues.push(issue('missing-verification-evidence', 'verificationEvidenceIds', effectiveId, 'التحقق يحتاج مرجع دليل واحداً على الأقل.'));
    }
  }
  if (atLeast('closed')) {
    if (!isNonEmptyString(candidate.closedBy) || !isIsoDate(candidate.closedAt) || !isNonEmptyString(candidate.closureReason)) {
      issues.push(issue('missing-closure-information', 'closureReason', effectiveId, 'الإغلاق يحتاج اسم من أغلق القرار ووقت الإغلاق وسبباً واضحاً.'));
    }
    if (!isNonEmptyString(candidate.lessonsLearned)) {
      issues.push(issue('missing-lessons-learned', 'lessonsLearned', effectiveId, 'الإغلاق يحتاج درساً مستفاداً أو تصريحاً بعدم وجود درس.'));
    }
  }
  return issues;
}

function validateEvidenceReferences(candidate: Record<string, unknown>, effectiveId: string): DecisionValidationIssue[] {
  const issues: DecisionValidationIssue[] = [];
  const evidenceById = new Map<string, Record<string, unknown>>();
  if (Array.isArray(candidate.evidence)) {
    candidate.evidence.forEach((value) => {
      if (isRecord(value) && isNonEmptyString(value.id)) evidenceById.set(value.id, value);
    });
  }
  const completionIds = isStringArray(candidate.completionEvidenceIds) ? candidate.completionEvidenceIds : [];
  for (const evidenceId of completionIds) {
    if (!evidenceById.has(evidenceId)) {
      issues.push(issue('dangling-completion-evidence', 'completionEvidenceIds', effectiveId, `مرجع دليل الإكمال ${evidenceId} غير موجود ضمن أدلة القرار.`));
    }
  }
  const verificationIds = isStringArray(candidate.verificationEvidenceIds) ? candidate.verificationEvidenceIds : [];
  for (const evidenceId of verificationIds) {
    const evidence = evidenceById.get(evidenceId);
    if (!evidence) {
      issues.push(issue('dangling-verification-evidence', 'verificationEvidenceIds', effectiveId, `مرجع دليل التحقق ${evidenceId} غير موجود ضمن أدلة القرار.`));
    } else if (evidence.status !== 'verified') {
      issues.push(issue('unverified-verification-evidence', 'verificationEvidenceIds', effectiveId, `دليل التحقق ${evidenceId} لم يسجل بحالة موثقة.`));
    }
  }
  return issues;
}

function validateChronology(candidate: Record<string, unknown>, effectiveId: string): DecisionValidationIssue[] {
  const issues: DecisionValidationIssue[] = [];
  const createdAt = isIsoDate(candidate.createdAt) ? Date.parse(candidate.createdAt) : Number.NaN;
  const approvedAt = isIsoDate(candidate.approvedAt) ? Date.parse(candidate.approvedAt) : Number.NaN;
  const verifiedAt = isIsoDate(candidate.verifiedAt) ? Date.parse(candidate.verifiedAt) : Number.NaN;
  const closedAt = isIsoDate(candidate.closedAt) ? Date.parse(candidate.closedAt) : Number.NaN;
  const history = Array.isArray(candidate.changeHistory) ? candidate.changeHistory.filter(isRecord) : [];
  const completionEntry = history.find((entry) => entry.status === 'completed');

  if (Number.isFinite(approvedAt) && approvedAt < createdAt) {
    issues.push(issue('invalid-approval-chronology', 'approvedAt', effectiveId, 'وقت الاعتماد لا يمكن أن يسبق إنشاء القرار.'));
  }
  if (
    Number.isFinite(verifiedAt) &&
    ((Number.isFinite(approvedAt) && verifiedAt < approvedAt) ||
      (completionEntry && isIsoDate(completionEntry.changedAt) && verifiedAt < Date.parse(completionEntry.changedAt)))
  ) {
    issues.push(issue('invalid-verification-chronology', 'verifiedAt', effectiveId, 'وقت التحقق لا يمكن أن يسبق الاعتماد أو اكتمال التنفيذ.'));
  }
  if (Number.isFinite(closedAt) && (!Number.isFinite(verifiedAt) || closedAt < verifiedAt)) {
    issues.push(issue('invalid-closure-chronology', 'closedAt', effectiveId, 'وقت الإغلاق لا يمكن أن يسبق التحقق.'));
  }
  return issues;
}

function validateRecord(value: unknown, options: DecisionValidationOptions, recordId: string): DecisionValidationIssue[] {
  const candidate = isRecord(value) ? value : {};
  const issues: DecisionValidationIssue[] = [];
  const effectiveId = isNonEmptyString(candidate.decisionId) ? candidate.decisionId : recordId;
  const undefinedPath = findUndefinedPath(value);
  if (undefinedPath) issues.push(issue('invalid-contract-value', undefinedPath, effectiveId, 'يحتوي سجل القرار قيمة غير معرفة ولا يمكن قبولها.'));

  if (!isNonEmptyString(candidate.decisionId)) issues.push(issue('missing-decision-id', 'decisionId', effectiveId, 'معرف القرار مطلوب.'));
  else if (!/^DECISION-[A-Za-z0-9-]+$/.test(candidate.decisionId)) issues.push(issue('invalid-decision-id', 'decisionId', effectiveId, 'معرف القرار يجب أن يبدأ بـ DECISION-.'));
  if (!isNonEmptyString(candidate.eventId)) issues.push(issue('missing-event-id', 'eventId', effectiveId, 'معرف الحدث مطلوب.'));
  else if (!/^EVENT-[A-Za-z0-9-]+$/.test(candidate.eventId)) issues.push(issue('invalid-event-id', 'eventId', effectiveId, 'معرف الحدث يجب أن يبدأ بـ EVENT-.'));
  if (!isNonEmptyString(candidate.venueId)) issues.push(issue('missing-venue-id', 'venueId', effectiveId, 'معرف الموقع مطلوب.'));
  else if (!/^VENUE-[A-Za-z0-9-]+$/.test(candidate.venueId)) issues.push(issue('invalid-venue-id', 'venueId', effectiveId, 'معرف الموقع يجب أن يبدأ بـ VENUE-.'));
  if (options.knownEventIds && isNonEmptyString(candidate.eventId) && !new Set(options.knownEventIds).has(candidate.eventId as EventId)) issues.push(issue('unknown-event-id', 'eventId', effectiveId, 'معرف الحدث غير معروف في حزمة التحقق الحالية.'));
  if (options.knownVenueIds && isNonEmptyString(candidate.venueId) && !new Set(options.knownVenueIds).has(candidate.venueId as VenueId)) issues.push(issue('unknown-venue-id', 'venueId', effectiveId, 'معرف الموقع غير معروف في حزمة التحقق الحالية.'));
  if (!isNonEmptyString(candidate.title)) issues.push(issue('missing-title', 'title', effectiveId, 'عنوان القرار مطلوب.'));
  if (typeof candidate.description !== 'string') issues.push(issue('invalid-contract-value', 'description', effectiveId, 'وصف القرار يجب أن يكون نصاً.'));
  if (typeof candidate.problemStatement !== 'string') issues.push(issue('invalid-contract-value', 'problemStatement', effectiveId, 'وصف مشكلة القرار يجب أن يكون نصاً.'));
  if (!isNonEmptyString(candidate.source)) issues.push(issue('missing-source', 'source', effectiveId, 'مصدر القرار مطلوب.'));
  if (!decisionSourceTypeValues.includes(candidate.sourceType as DecisionRecord['sourceType'])) issues.push(issue('invalid-source-type', 'sourceType', effectiveId, 'نوع مصدر القرار غير معروف.'));
  if (!isIsoDate(candidate.createdAt) || !isNonEmptyString(candidate.createdBy)) issues.push(issue('missing-creation-data', 'createdAt', effectiveId, 'وقت إنشاء القرار ومنشئه مطلوبان.'));
  if (!isNonEmptyString(candidate.decisionOwner)) issues.push(issue('missing-owner', 'decisionOwner', effectiveId, 'مالك القرار مطلوب.'));
  if (!isNonEmptyString(candidate.responsibleParty)) issues.push(issue('missing-responsible-party', 'responsibleParty', effectiveId, 'المسؤول عن التنفيذ مطلوب.'));
  if (!isNonEmptyString(candidate.approvingAuthority)) issues.push(issue('missing-approving-authority', 'approvingAuthority', effectiveId, 'جهة الاعتماد المطلوبة يجب أن تكون معروفة.'));

  if (!operationalStateContextValues.includes(candidate.stateContext as (typeof operationalStateContextValues)[number])) issues.push(issue('invalid-state-context', 'stateContext', effectiveId, 'نوع الحالة غير معروف.'));
  if (!decisionTypeValues.includes(candidate.decisionType as (typeof decisionTypeValues)[number])) issues.push(issue('invalid-decision-type', 'decisionType', effectiveId, 'نوع القرار غير معروف.'));
  if (!decisionUrgencyValues.includes(candidate.urgency as (typeof decisionUrgencyValues)[number])) issues.push(issue('invalid-urgency', 'urgency', effectiveId, 'درجة الاستعجال غير معروفة.'));
  if (!Number.isFinite(candidate.priority)) issues.push(issue('invalid-priority', 'priority', effectiveId, 'قيمة الأولوية التشخيصية يجب أن تكون رقماً صالحاً.'));
  if (!decisionConfidenceValues.includes(candidate.confidence as (typeof decisionConfidenceValues)[number])) issues.push(issue('invalid-confidence', 'confidence', effectiveId, 'درجة الثقة غير معروفة.'));
  if (!escalationLevelValues.includes(candidate.escalationLevel as (typeof escalationLevelValues)[number])) issues.push(issue('invalid-escalation-level', 'escalationLevel', effectiveId, 'مستوى التصعيد غير صالح.'));
  if (!decisionApprovalStatusValues.includes(candidate.approvalStatus as (typeof decisionApprovalStatusValues)[number])) issues.push(issue('invalid-approval-status', 'approvalStatus', effectiveId, 'حالة الاعتماد غير معروفة.'));
  if (!decisionLifecycleValues.includes(candidate.status as DecisionLifecycleStatus)) issues.push(issue('invalid-lifecycle-status', 'status', effectiveId, 'حالة دورة القرار غير معروفة.'));
  if (!decisionOutcomeValues.includes(candidate.outcomeStatus as (typeof decisionOutcomeValues)[number])) issues.push(issue('invalid-outcome-status', 'outcomeStatus', effectiveId, 'حالة الأثر غير معروفة.'));
  if (!Number.isInteger(candidate.revision) || Number(candidate.revision) <= 0) issues.push(issue('invalid-revision', 'revision', effectiveId, 'رقم مراجعة القرار يجب أن يكون عدداً صحيحاً موجباً.'));
  if (!isNonEmptyString(candidate.changeReason)) issues.push(issue('invalid-contract-value', 'changeReason', effectiveId, 'سبب آخر تغيير مطلوب.'));

  if (!isStringArray(candidate.assumptions)) issues.push(issue('invalid-string-list', 'assumptions', effectiveId, 'قائمة الافتراضات غير صالحة.'));
  if (!isStringArray(candidate.constraints)) issues.push(issue('invalid-string-list', 'constraints', effectiveId, 'قائمة القيود غير صالحة.'));
  if (!isStringArray(candidate.completionEvidenceIds)) issues.push(issue('invalid-evidence', 'completionEvidenceIds', effectiveId, 'مراجع أدلة الإكمال يجب أن تكون قائمة معرفات.'));
  if (!isStringArray(candidate.verificationEvidenceIds)) issues.push(issue('invalid-evidence', 'verificationEvidenceIds', effectiveId, 'مراجع أدلة التحقق يجب أن تكون قائمة معرفات.'));
  if (typeof candidate.completionNote !== 'string' || typeof candidate.approvalComments !== 'string' || typeof candidate.closureReason !== 'string' || typeof candidate.lessonsLearned !== 'string') {
    issues.push(issue('invalid-contract-value', 'notes', effectiveId, 'حقول الملاحظات والتعليقات يجب أن تكون نصوصاً.'));
  }
  for (const [field, fieldValue] of Object.entries({ approvedBy: candidate.approvedBy, approvedAt: candidate.approvedAt, assignedTo: candidate.assignedTo, verifiedBy: candidate.verifiedBy, verifiedAt: candidate.verifiedAt, closedBy: candidate.closedBy, closedAt: candidate.closedAt })) {
    if (!isNullableString(fieldValue)) issues.push(issue('invalid-contract-value', field, effectiveId, 'القيمة يجب أن تكون نصاً أو فارغة.'));
    if (typeof fieldValue === 'string' && field.endsWith('At') && fieldValue.length > 0 && !isIsoDate(fieldValue)) issues.push(issue('invalid-date', field, effectiveId, 'الوقت المسجل غير صالح.'));
  }
  if (!isNonEmptyString(candidate.actionRequired)) issues.push(issue('missing-action', 'actionRequired', effectiveId, 'الإجراء المطلوب يجب أن يكون واضحاً.'));
  if (!isIsoDate(candidate.dueAt)) issues.push(issue('invalid-date', 'dueAt', effectiveId, 'موعد الإجراء غير صالح.'));
  if (isIsoDate(candidate.createdAt) && isIsoDate(candidate.dueAt) && Date.parse(candidate.dueAt) < Date.parse(candidate.createdAt)) issues.push(issue('invalid-date', 'dueAt', effectiveId, 'موعد الإجراء لا يمكن أن يسبق إنشاء القرار.'));

  issues.push(...validateOptions(candidate, effectiveId));
  issues.push(...validateEvidence(candidate, effectiveId));
  issues.push(...validateRelationships(candidate, options, effectiveId));
  issues.push(...validateImpact(candidate.expectedImpact, 'expectedImpact', effectiveId, true));
  issues.push(...validateImpact(candidate.actualImpact, 'actualImpact', effectiveId, false));
  issues.push(...validateHistory(candidate, effectiveId));
  issues.push(...validateEvidenceReferences(candidate, effectiveId));
  issues.push(...validateChronology(candidate, effectiveId));

  if (options.targetStateContext === 'baseline' && candidate.stateContext === 'scenario') issues.push(issue('scenario-imported-as-baseline', 'stateContext', effectiveId, 'لا يمكن استيراد قرار سيناريو إلى الحالة الأساسية.'));
  if (decisionLifecycleValues.includes(candidate.status as DecisionLifecycleStatus)) {
    const statusIndex = lifecycleIndex.get(candidate.status as DecisionLifecycleStatus) ?? -1;
    const approvedIndex = lifecycleIndex.get('approved') ?? 2;
    if (candidate.approvalStatus === 'approved' && statusIndex < approvedIndex) {
      issues.push(issue('approval-lifecycle-mismatch', 'approvalStatus', effectiveId, 'لا يمكن تسجيل الاعتماد قبل وصول دورة القرار إلى حالة معتمد.'));
    }
    if (statusIndex >= approvedIndex && candidate.approvalStatus !== 'approved') {
      issues.push(issue('approved-status-needs-approval', 'approvalStatus', effectiveId, 'الحالة الحالية تحتاج اعتماداً محلياً مكتملاً ومتسقاً.'));
    }
    issues.push(...validateLifecycleRequirements(candidate, effectiveId, candidate.status as DecisionLifecycleStatus));
  }
  if (candidate.approvalStatus === 'approved' && (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0)) issues.push(issue('missing-evidence', 'evidence', effectiveId, 'لا يمكن تسجيل اعتماد محلي دون دليل منظم صالح.'));
  if (candidate.approvalStatus === 'approved' && (!isNonEmptyString(candidate.approvedBy) || !isIsoDate(candidate.approvedAt))) issues.push(issue('missing-approver', 'approvedBy', effectiveId, 'الاعتماد المحلي يحتاج اسم المعتمد ووقت الاعتماد.'));
  if (isIsoDate(candidate.dueAt) && Date.parse(candidate.dueAt) < (options.now ?? new Date()).getTime() && candidate.status !== 'closed') {
    issues.push(issue('invalid-date', 'dueAt', effectiveId, 'موعد القرار متأخر ويحتاج تصعيداً أو تحديثاً.', 'warning'));
  }
  return issues;
}

function cloneImpact(value: Record<string, unknown>): DecisionImpactAssessment {
  const dimensionsValue = isRecord(value.dimensions) ? value.dimensions : {};
  const dimensions: DecisionImpactAssessment['dimensions'] = {};
  for (const key of impactDimensionValues) {
    const dimension = dimensionsValue[key];
    if (impactLevelValues.includes(dimension as ImpactLevel)) dimensions[key] = dimension as ImpactLevel;
  }
  return {
    level: value.level as ImpactLevel,
    summaryAr: String(value.summaryAr),
    dimensions
  };
}

function cloneRuntimeRecord(candidate: Record<string, unknown>): DecisionRecord {
  const relationships = (candidate.relationships as unknown[]).map((value) => {
    const relation = value as Record<string, unknown>;
    return {
      relationId: String(relation.relationId),
      decisionId: String(relation.decisionId) as DecisionEntityRelation['decisionId'],
      entityId: String(relation.entityId) as SpatialEntityId,
      relationType: relation.relationType as DecisionEntityRelation['relationType'],
      impactLevel: relation.impactLevel as ImpactLevel,
      descriptionAr: String(relation.descriptionAr),
      source: String(relation.source),
      confidence: relation.confidence as DecisionEntityRelation['confidence'],
      stateContext: relation.stateContext as DecisionEntityRelation['stateContext']
    };
  });
  const evidence = (candidate.evidence as unknown[]).map((value) => {
    const item = value as Record<string, unknown>;
    return {
      id: String(item.id),
      type: item.type as EvidenceReference['type'],
      titleAr: String(item.titleAr),
      source: String(item.source),
      capturedAt: String(item.capturedAt),
      status: item.status as EvidenceReference['status']
    };
  });
  const availableOptions = (candidate.availableOptions as unknown[]).map((value) => {
    const option = value as Record<string, unknown>;
    return {
      optionId: String(option.optionId),
      titleAr: String(option.titleAr),
      descriptionAr: String(option.descriptionAr),
      expectedImpact: String(option.expectedImpact),
      risks: [...(option.risks as string[])]
    } satisfies DecisionOption;
  });
  const changeHistory = (candidate.changeHistory as unknown[]).map((value) => {
    const entry = value as Record<string, unknown>;
    return {
      revision: Number(entry.revision),
      status: entry.status as DecisionLifecycleStatus,
      changedAt: String(entry.changedAt),
      changedBy: String(entry.changedBy),
      changeReason: String(entry.changeReason)
    } satisfies DecisionHistoryEntry;
  });
  return {
    decisionId: String(candidate.decisionId) as DecisionRecord['decisionId'],
    title: String(candidate.title),
    description: String(candidate.description),
    eventId: String(candidate.eventId) as EventId,
    venueId: String(candidate.venueId) as VenueId,
    relationships,
    stateContext: candidate.stateContext as DecisionRecord['stateContext'],
    source: String(candidate.source),
    sourceType: candidate.sourceType as DecisionRecord['sourceType'],
    createdAt: String(candidate.createdAt),
    createdBy: String(candidate.createdBy),
    decisionOwner: String(candidate.decisionOwner),
    responsibleParty: String(candidate.responsibleParty),
    approvingAuthority: String(candidate.approvingAuthority),
    problemStatement: String(candidate.problemStatement),
    decisionType: candidate.decisionType as DecisionRecord['decisionType'],
    urgency: candidate.urgency as DecisionRecord['urgency'],
    priority: Number(candidate.priority),
    confidence: candidate.confidence as DecisionRecord['confidence'],
    evidence,
    assumptions: [...(candidate.assumptions as string[])],
    constraints: [...(candidate.constraints as string[])],
    availableOptions,
    selectedOption: candidate.selectedOption as string | null,
    rejectedOptions: [...(candidate.rejectedOptions as string[])],
    approvalStatus: candidate.approvalStatus as DecisionRecord['approvalStatus'],
    approvedBy: candidate.approvedBy as string | null,
    approvedAt: candidate.approvedAt as string | null,
    approvalComments: String(candidate.approvalComments),
    actionRequired: String(candidate.actionRequired),
    assignedTo: candidate.assignedTo as string | null,
    dueAt: String(candidate.dueAt),
    escalationLevel: candidate.escalationLevel as DecisionRecord['escalationLevel'],
    status: candidate.status as DecisionRecord['status'],
    expectedImpact: cloneImpact(candidate.expectedImpact as Record<string, unknown>),
    actualImpact: candidate.actualImpact === null ? null : cloneImpact(candidate.actualImpact as Record<string, unknown>),
    outcomeStatus: candidate.outcomeStatus as DecisionRecord['outcomeStatus'],
    completionEvidenceIds: [...(candidate.completionEvidenceIds as string[])],
    completionNote: String(candidate.completionNote),
    verifiedBy: candidate.verifiedBy as string | null,
    verifiedAt: candidate.verifiedAt as string | null,
    verificationEvidenceIds: [...(candidate.verificationEvidenceIds as string[])],
    closedBy: candidate.closedBy as string | null,
    closedAt: candidate.closedAt as string | null,
    closureReason: String(candidate.closureReason),
    lessonsLearned: String(candidate.lessonsLearned),
    revision: Number(candidate.revision),
    changeReason: String(candidate.changeReason),
    changeHistory
  };
}

export function parseDecisionRecord(value: unknown, options: DecisionValidationOptions = {}): DecisionRuntimeParseResult {
  const candidate = isRecord(value) ? value : {};
  const recordId = isNonEmptyString(candidate.decisionId) ? candidate.decisionId : 'record-1';
  const issues = validateRecord(value, options, recordId);
  const hasBlockingErrors = issues.some((currentIssue) => currentIssue.blocking);
  return {
    valid: !hasBlockingErrors,
    issues,
    record: !hasBlockingErrors && isRecord(value) ? cloneRuntimeRecord(value) : null
  };
}

export function validateDecisionRecord(value: unknown, options: DecisionValidationOptions = {}): DecisionValidationIssue[] {
  return parseDecisionRecord(value, options).issues;
}

export function validateDecisionDataset(values: unknown, options: DecisionValidationOptions = {}): DecisionValidationResult {
  const records = Array.isArray(values) ? values : [];
  const issues: DecisionValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenRelationIds = new Set<string>();
  const validRecords: DecisionRecord[] = [];

  records.forEach((value, index) => {
    const candidate = isRecord(value) ? value : {};
    const recordId = isNonEmptyString(candidate.decisionId) ? candidate.decisionId : `record-${index + 1}`;
    const parsed = parseDecisionRecord(value, options);
    const recordIssues = [...parsed.issues];
    if (seenIds.has(recordId)) recordIssues.push(issue('duplicate-decision', 'decisionId', recordId, 'يوجد أكثر من سجل للقرار نفسه.'));
    if (Array.isArray(candidate.relationships)) {
      candidate.relationships.forEach((relationship, relationshipIndex) => {
        if (!isRecord(relationship) || !isNonEmptyString(relationship.relationId)) return;
        if (seenRelationIds.has(relationship.relationId)) recordIssues.push(issue('duplicate-relationship', `relationships[${relationshipIndex}].relationId`, recordId, 'معرف العلاقة مكرر داخل حزمة القرارات.'));
        seenRelationIds.add(relationship.relationId);
      });
    }
    seenIds.add(recordId);
    const contextualIssues = recordIssues.map((currentIssue) => ({
      ...currentIssue,
      recordIndex: index,
      rowNumber: options.sourceFormat === 'csv' ? index + 2 : index + 1,
      path: options.sourceFormat === 'json' ? `$[${index}].${currentIssue.field}` : currentIssue.field
    }));
    issues.push(...contextualIssues);
    if (parsed.record && contextualIssues.every((currentIssue) => !currentIssue.blocking)) validRecords.push(parsed.record);
  });
  return { valid: issues.every((currentIssue) => !currentIssue.blocking), issues, validRecords };
}

export function getDecisionContractCompleteness(record: Partial<DecisionRecord>): number {
  const checks = [
    isNonEmptyString(record.decisionId),
    isNonEmptyString(record.title),
    isNonEmptyString(record.source),
    isNonEmptyString(record.decisionOwner),
    isNonEmptyString(record.responsibleParty),
    isNonEmptyString(record.approvingAuthority),
    isNonEmptyString(record.problemStatement),
    Array.isArray(record.evidence) && record.evidence.length > 0,
    isNonEmptyString(record.actionRequired),
    isIsoDate(record.dueAt),
    Array.isArray(record.relationships) && record.relationships.length > 0,
    Array.isArray(record.availableOptions) && record.availableOptions.length > 0,
    Array.isArray(record.changeHistory) && record.changeHistory.length > 0
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function isDecisionOverdue(record: Pick<DecisionRecord, 'dueAt' | 'status'>, now = new Date()): boolean {
  return record.status !== 'closed' && Number.isFinite(Date.parse(record.dueAt)) && Date.parse(record.dueAt) < now.getTime();
}

export function getDecisionTransitionIssues(
  record: DecisionRecord,
  nextStatus: DecisionLifecycleStatus,
  candidate: DecisionRecord = { ...record, status: nextStatus }
): DecisionValidationIssue[] {
  if (nextStatus === record.status) return [];
  if (nextLifecycleStatus[record.status] !== nextStatus) {
    return [issue('invalid-transition', 'status', record.decisionId, 'لا يمكن الانتقال مباشرة مع تجاوز مرحلة إلزامية أو الرجوع إلى مرحلة سابقة.')];
  }
  return validateLifecycleRequirements(candidate as unknown as Record<string, unknown>, record.decisionId, nextStatus);
}

export function createImportFormatIssue(messageAr: string, recordId = 'import', field = 'file'): DecisionValidationIssue {
  return issue('invalid-import-format', field, recordId, messageAr);
}
