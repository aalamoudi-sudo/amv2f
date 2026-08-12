import type { DecisionRecord, EventId, VenueId } from '../types/decision';
import type { SpatialEntityId } from '../types/spatial';
import {
  migrateUntrustedDecisionRecord,
  type DecisionMigrationWarning
} from './decisionRelationshipMigration';
import {
  createImportFormatIssue,
  validateDecisionDataset,
  type DecisionValidationIssue
} from './decisionValidation';

export type DecisionPackFormat = 'csv' | 'json';

export interface DecisionImportOptions {
  knownEntityIds: Iterable<SpatialEntityId>;
  knownEventIds: Iterable<EventId>;
  knownVenueIds: Iterable<VenueId>;
  now?: Date;
}

export interface DecisionImportPreview {
  fileName: string;
  format: DecisionPackFormat;
  records: unknown[];
  validRecords: DecisionRecord[];
  issues: DecisionValidationIssue[];
  blockingErrorCount: number;
  warningCount: number;
  canAcceptForExperiment: boolean;
  migrationNotices: Array<{
    recordIndex: number;
    recordId: string;
    warnings: DecisionMigrationWarning[];
    fieldsRequiringReview: string[];
    originalSchemaVersion: number;
    targetSchemaVersion: number;
  }>;
  generatedAt: string;
}

const jsonFields = new Set([
  'relationships',
  'evidence',
  'assumptions',
  'constraints',
  'availableOptions',
  'rejectedOptions',
  'expectedImpact',
  'actualImpact',
  'completionEvidenceIds',
  'verificationEvidenceIds',
  'changeHistory'
]);
const numberFields = new Set(['priority', 'revision']);
const nullableFields = new Set(['selectedOption', 'approvedBy', 'approvedAt', 'assignedTo', 'actualImpact', 'verifiedBy', 'verifiedAt', 'closedBy', 'closedAt']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;
    const next = source[index + 1];
    if (quoted && character === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  if (quoted) throw new Error('unclosed-quote');
  return rows;
}

class DecisionCsvValueError extends Error {
  constructor(
    readonly rowNumber: number,
    readonly field: string
  ) {
    super(`invalid-csv-value:${rowNumber}:${field}`);
  }
}

function parseCsvValue(header: string, value: string, rowNumber: number): unknown {
  const trimmed = value.trim();
  if (nullableFields.has(header) && (trimmed === '' || trimmed === 'null')) return null;
  if (numberFields.has(header)) return trimmed === '' ? Number.NaN : Number(trimmed);
  if (jsonFields.has(header)) {
    if (trimmed === '' && header === 'actualImpact') return null;
    try {
      return JSON.parse(trimmed || '[]');
    } catch {
      throw new DecisionCsvValueError(rowNumber, header);
    }
  }
  return trimmed;
}

export function parseDecisionCsv(source: string): unknown[] {
  const rows = parseCsvRows(source);
  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  if (headers.length === 0 || !headers.includes('decisionId')) throw new Error('missing-header');
  return rows.slice(1).map((row, rowIndex) => headers.reduce<Record<string, unknown>>((record, header, index) => {
    record[header] = parseCsvValue(header, row[index] ?? '', rowIndex + 2);
    return record;
  }, {}));
}

export function parseDecisionJson(source: string): unknown[] {
  const parsed: unknown = JSON.parse(source);
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed) && Array.isArray(parsed.decisions)) return parsed.decisions;
  throw new Error('invalid-json-envelope');
}

function migrateImportCandidate(value: unknown): ReturnType<typeof migrateUntrustedDecisionRecord> | null {
  if (!isRecord(value) || !Array.isArray(value.changeHistory)) return null;
  if (!Array.isArray(value.relationships) && !Array.isArray(value.relatedEntityIds)) return null;
  try {
    return migrateUntrustedDecisionRecord(value);
  } catch {
    return null;
  }
}

export function previewDecisionPack(
  source: string,
  fileName: string,
  format: DecisionPackFormat,
  options: DecisionImportOptions
): DecisionImportPreview {
  const generatedAt = new Date().toISOString();
  let records: unknown[] = [];
  let parseIssues: DecisionValidationIssue[] = [];
  const migrationNotices: DecisionImportPreview['migrationNotices'] = [];
  try {
    records = (format === 'csv' ? parseDecisionCsv(source) : parseDecisionJson(source)).map((record, recordIndex) => {
      const migration = migrateImportCandidate(record);
      if (!migration) return record;
      if (migration.warnings.length > 0) {
        migrationNotices.push({
          recordIndex,
          recordId: isRecord(record) && typeof record.decisionId === 'string' ? record.decisionId : `record-${recordIndex + 1}`,
          warnings: migration.warnings,
          fieldsRequiringReview: migration.fieldsRequiringReview,
          originalSchemaVersion: migration.originalSchemaVersion,
          targetSchemaVersion: migration.targetSchemaVersion
        });
      }
      return migration.candidate;
    });
  } catch (error) {
    if (error instanceof DecisionCsvValueError) {
      parseIssues = [{
        ...createImportFormatIssue(`تعذر قراءة القيمة المنظمة في الصف ${error.rowNumber}. راجع الحقل المحدد.`, 'import', error.field),
        rowNumber: error.rowNumber,
        path: error.field
      }];
    } else {
      parseIssues = [createImportFormatIssue('تعذر قراءة الحزمة. تحقق من بنية الملف والقيم المنظمة داخله.')];
    }
  }
  const validation = validateDecisionDataset(records, {
    knownEntityIds: options.knownEntityIds,
    knownEventIds: options.knownEventIds,
    knownVenueIds: options.knownVenueIds,
    targetStateContext: 'baseline',
    sourceFormat: format,
    now: options.now
  });
  const issues = [...parseIssues, ...validation.issues];
  const blockingErrorCount = issues.filter((currentIssue) => currentIssue.severity === 'error').length;
  const warningCount = issues.filter((currentIssue) => currentIssue.severity === 'warning').length;
  return {
    fileName,
    format,
    records,
    validRecords: blockingErrorCount === 0 ? validation.validRecords : [],
    issues,
    blockingErrorCount,
    warningCount,
    canAcceptForExperiment: records.length > 0 && blockingErrorCount === 0,
    migrationNotices,
    generatedAt
  };
}

function csvEscape(value: unknown): string {
  const stringValue = value === null || value === undefined
    ? ''
    : typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
  return /[",\n\r]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

export function serializeDecisionValidationReport(preview: DecisionImportPreview, format: DecisionPackFormat): string {
  const report = {
    fileName: preview.fileName,
    generatedAt: preview.generatedAt,
    recordCount: preview.records.length,
    validRecordCount: preview.validRecords.length,
    blockingErrorCount: preview.blockingErrorCount,
    warningCount: preview.warningCount,
    acceptedForExperiment: preview.canAcceptForExperiment,
    migrationNotices: preview.migrationNotices,
    issues: preview.issues
  };
  if (format === 'json') return JSON.stringify(report, null, 2);
  const rows = [
    ['recordNumber', 'recordId', 'severity', 'blocking', 'code', 'path', 'messageAr'],
    ...preview.issues.map((currentIssue) => [currentIssue.rowNumber ?? '', currentIssue.recordId, currentIssue.severity, currentIssue.blocking, currentIssue.code, currentIssue.path, currentIssue.messageAr])
  ];
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}
