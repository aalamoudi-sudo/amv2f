import {
  approvalStatusValues,
  readinessConfidenceValues,
  readinessSourceTypeValues,
  readinessStateContextValues,
  type ZoneReadinessRecord
} from '../types/spatial';

export type ZoneReadinessIssueCode =
  | 'missing-zone-id'
  | 'unknown-zone-id'
  | 'duplicate-record'
  | 'missing-owner'
  | 'missing-source'
  | 'invalid-readiness'
  | 'invalid-confidence'
  | 'invalid-approval-status'
  | 'missing-evidence'
  | 'missing-approver'
  | 'expired-information'
  | 'invalid-date'
  | 'target-date-before-update'
  | 'unknown-dependency'
  | 'scenario-imported-as-baseline'
  | 'invalid-state-context'
  | 'invalid-source-type';

export interface ZoneReadinessValidationIssue {
  code: ZoneReadinessIssueCode;
  field: string;
  recordId: string;
  severity: 'error' | 'warning';
  messageAr: string;
}

export interface ZoneReadinessValidationResult {
  valid: boolean;
  issues: ZoneReadinessValidationIssue[];
  validRecords: ZoneReadinessRecord[];
}

export interface ZoneReadinessValidationOptions {
  targetStateContext?: 'baseline' | 'scenario' | 'temporary-demo';
  now?: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function issue(
  code: ZoneReadinessIssueCode,
  field: string,
  recordId: string,
  messageAr: string,
  severity: 'error' | 'warning' = 'error'
): ZoneReadinessValidationIssue {
  return { code, field, recordId, severity, messageAr };
}

export function isExpiredReadinessRecord(record: Pick<ZoneReadinessRecord, 'approvalStatus' | 'expiresAt'>, now = new Date()): boolean {
  return record.approvalStatus === 'expired' || (record.expiresAt ? Date.parse(record.expiresAt) < now.getTime() : false);
}

export function getReadinessCompletenessPercentage(record: Partial<ZoneReadinessRecord>): number {
  const checks = [
    isNonEmptyString(record.zoneId),
    isNonEmptyString(record.source),
    isNonEmptyString(record.updatedAt),
    isNonEmptyString(record.updatedBy),
    isNonEmptyString(record.owner),
    isNonEmptyString(record.responsibleParty),
    Array.isArray(record.evidence) && record.evidence.length > 0,
    isNonEmptyString(record.confidence),
    isNonEmptyString(record.approvalStatus),
    isNonEmptyString(record.targetReadinessDate),
    isNonEmptyString(record.requiredAction),
    isNonEmptyString(record.dueAt),
    Array.isArray(record.relatedRouteIds),
    Boolean(record.operationalImpact)
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function validateRecord(
  value: unknown,
  knownZoneIds: Set<string>,
  options: ZoneReadinessValidationOptions,
  recordId: string
): ZoneReadinessValidationIssue[] {
  const candidate = isRecord(value) ? value : {};
  const issues: ZoneReadinessValidationIssue[] = [];
  const zoneId = candidate.zoneId;
  const effectiveRecordId = typeof zoneId === 'string' && zoneId ? zoneId : recordId;

  if (!isNonEmptyString(zoneId)) {
    issues.push(issue('missing-zone-id', 'zoneId', effectiveRecordId, 'المعرّف مطلوب لكل سجل جاهزية.'));
  } else if (!knownZoneIds.has(zoneId)) {
    issues.push(issue('unknown-zone-id', 'zoneId', effectiveRecordId, 'المعرّف لا يطابق منطقة معروفة في النموذج الحالي.'));
  }

  if (!isNonEmptyString(candidate.owner)) {
    issues.push(issue('missing-owner', 'owner', effectiveRecordId, 'مالك الحالة مطلوب ولا يمكن تركه فارغاً.'));
  }

  if (!isNonEmptyString(candidate.source)) {
    issues.push(issue('missing-source', 'source', effectiveRecordId, 'مصدر الحالة مطلوب قبل قبول السجل.'));
  }

  if (typeof candidate.readiness !== 'number' || !Number.isFinite(candidate.readiness) || candidate.readiness < 0 || candidate.readiness > 100) {
    issues.push(issue('invalid-readiness', 'readiness', effectiveRecordId, 'نسبة الجاهزية يجب أن تكون رقماً بين 0 و100.'));
  }

  if (!readinessConfidenceValues.includes(candidate.confidence as (typeof readinessConfidenceValues)[number])) {
    issues.push(issue('invalid-confidence', 'confidence', effectiveRecordId, 'درجة الثقة يجب أن تكون منخفضة أو متوسطة أو عالية.'));
  }

  if (!approvalStatusValues.includes(candidate.approvalStatus as (typeof approvalStatusValues)[number])) {
    issues.push(issue('invalid-approval-status', 'approvalStatus', effectiveRecordId, 'حالة الاعتماد غير معروفة.'));
  }

  if (!readinessSourceTypeValues.includes(candidate.sourceType as (typeof readinessSourceTypeValues)[number])) {
    issues.push(issue('invalid-source-type', 'sourceType', effectiveRecordId, 'نوع المصدر غير معروف.'));
  }

  if (!readinessStateContextValues.includes(candidate.stateContext as (typeof readinessStateContextValues)[number])) {
    issues.push(issue('invalid-state-context', 'stateContext', effectiveRecordId, 'نوع الحالة يجب أن يكون تجريبياً أو أساسياً أو سيناريو.'));
  }

  if (candidate.approvalStatus === 'approved' && (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0)) {
    issues.push(issue('missing-evidence', 'evidence', effectiveRecordId, 'لا يمكن اعتماد السجل دون دليل منظم واحد على الأقل.'));
  }

  if (candidate.approvalStatus === 'approved' && (!isNonEmptyString(candidate.approvedBy) || !isIsoDate(candidate.approvedAt))) {
    issues.push(issue('missing-approver', 'approvedBy', effectiveRecordId, 'السجل المعتمد يحتاج إلى approvedBy وapprovedAt صالحين.'));
  }

  if (candidate.approvalStatus === 'expired' || (candidate.expiresAt !== undefined && !isIsoDate(candidate.expiresAt))) {
    issues.push(issue('expired-information', 'expiresAt', effectiveRecordId, 'معلومات الجاهزية منتهية الصلاحية وتحتاج تحديثاً.', 'warning'));
  } else if (isIsoDate(candidate.expiresAt) && Date.parse(candidate.expiresAt) < (options.now ?? new Date()).getTime()) {
    issues.push(issue('expired-information', 'expiresAt', effectiveRecordId, 'انتهت صلاحية المعلومات قبل وقت التحقق.', 'warning'));
  }

  const updatedAt = isIsoDate(candidate.updatedAt) ? Date.parse(candidate.updatedAt) : NaN;
  const targetReadinessDate = isIsoDate(candidate.targetReadinessDate) ? Date.parse(candidate.targetReadinessDate) : NaN;
  if (!isIsoDate(candidate.updatedAt)) {
    issues.push(issue('invalid-date', 'updatedAt', effectiveRecordId, 'وقت التحديث يجب أن يكون تاريخ ISO صالحاً.'));
  }
  if (!isIsoDate(candidate.targetReadinessDate) || !isIsoDate(candidate.dueAt)) {
    issues.push(issue('invalid-date', 'targetReadinessDate', effectiveRecordId, 'موعد الجاهزية وموعد الإجراء يجب أن يكونا تاريخي ISO صالحين.'));
  } else if (targetReadinessDate < updatedAt) {
    issues.push(issue('target-date-before-update', 'targetReadinessDate', effectiveRecordId, 'موعد الجاهزية لا يمكن أن يسبق وقت آخر تحديث.'));
  }

  if (Array.isArray(candidate.dependencies)) {
    candidate.dependencies.forEach((dependency) => {
      if (typeof dependency !== 'string' || !knownZoneIds.has(dependency)) {
        issues.push(issue('unknown-dependency', 'dependencies', effectiveRecordId, `الاعتمادية ${String(dependency)} لا تطابق منطقة معروفة.`));
      }
    });
  }

  if (options.targetStateContext === 'baseline' && candidate.stateContext === 'scenario') {
    issues.push(issue('scenario-imported-as-baseline', 'stateContext', effectiveRecordId, 'لا يمكن استيراد بيانات السيناريو إلى الحالة الأساسية.'));
  }

  return issues;
}

export function validateZoneReadinessDataset(
  values: unknown,
  knownZoneIds: Iterable<string>,
  options: ZoneReadinessValidationOptions = {}
): ZoneReadinessValidationResult {
  const knownIds = new Set(knownZoneIds);
  const records = Array.isArray(values) ? values : [];
  const issues: ZoneReadinessValidationIssue[] = [];
  const seenIds = new Set<string>();
  const validRecords: ZoneReadinessRecord[] = [];

  records.forEach((value, index) => {
    const candidate = isRecord(value) ? value : {};
    const zoneId = typeof candidate.zoneId === 'string' ? candidate.zoneId : `record-${index + 1}`;
    const recordIssues: ZoneReadinessValidationIssue[] = [];
    if (seenIds.has(zoneId)) {
      const duplicateIssue = issue('duplicate-record', 'zoneId', zoneId, 'يوجد أكثر من سجل للمنطقة نفسها.');
      issues.push(duplicateIssue);
      recordIssues.push(duplicateIssue);
    }
    seenIds.add(zoneId);
    const currentRecordIssues = validateRecord(value, knownIds, options, zoneId);
    issues.push(...currentRecordIssues);
    recordIssues.push(...currentRecordIssues);
    if (recordIssues.every((currentIssue) => currentIssue.severity !== 'error') && isRecord(value)) {
      validRecords.push(value as unknown as ZoneReadinessRecord);
    }
  });

  return { valid: issues.every((currentIssue) => currentIssue.severity !== 'error'), issues, validRecords };
}

export function validateZoneReadinessRecord(
  value: unknown,
  knownZoneIds: Iterable<string>,
  options: ZoneReadinessValidationOptions = {}
): ZoneReadinessValidationIssue[] {
  const candidate = isRecord(value) ? value : {};
  const recordId = typeof candidate.zoneId === 'string' ? candidate.zoneId : 'record-1';
  return validateRecord(value, new Set(knownZoneIds), options, recordId);
}
