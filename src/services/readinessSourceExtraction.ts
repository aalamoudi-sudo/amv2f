import { sha256PayloadSync } from './integrationHash';
import type {
  OperationalReadinessSource,
  OperationalSourceLocatorType,
  OperationalSourceTrace
} from '../types/operationalReadinessPack';

export interface StructuredSourceLocator {
  locatorType: OperationalSourceLocatorType;
  slideNumber?: number;
  sheetName?: string;
  rowNumber?: number;
  tableIndex?: number;
  shapeId?: string;
  sectionReference?: string;
}

export interface StructuredOperationalStatement {
  sourceId: string;
  sourceRevision: number;
  sourceHash: string;
  locator: StructuredSourceLocator;
  sanitizedSourceLabel: string;
  extractedMeaning: string;
  extractionConfidence: OperationalSourceTrace['extractionConfidence'];
  reviewStatus: OperationalSourceTrace['reviewStatus'];
}

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const phonePattern = /(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/gu;
const identifierPattern = /\b\d{10,}\b/gu;

export function sanitizeOperationalSourceText(value: string): string {
  return value
    .replace(emailPattern, '[بيانات اتصال محجوبة]')
    .replace(phonePattern, '[بيانات اتصال محجوبة]')
    .replace(identifierPattern, '[معرّف شخصي محجوب]')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function verifyOperationalSourceFingerprint(source: OperationalReadinessSource): {
  valid: boolean;
  status: OperationalReadinessSource['fingerprintStatus'];
  issues: string[];
} {
  const issues: string[] = [];
  if (source.expectedByteSize !== null && source.expectedByteSize !== source.observedByteSize) {
    issues.push('byte-size-mismatch');
  }
  if (source.expectedSha256 !== null && source.expectedSha256 !== source.observedSha256) {
    issues.push('sha256-mismatch');
  }
  if (!/^[a-f0-9]{64}$/.test(source.observedSha256)) issues.push('observed-sha256-invalid');
  const expectedStatus: OperationalReadinessSource['fingerprintStatus'] = source.expectedSha256 === null
    ? 'recorded-first-observation'
    : issues.length === 0
      ? 'verified'
      : 'mismatch';
  if (source.fingerprintStatus !== expectedStatus) issues.push('fingerprint-status-inconsistent');
  return {
    valid: issues.length === 0,
    status: expectedStatus,
    issues
  };
}

export function createDeterministicSourceTrace(statement: StructuredOperationalStatement): OperationalSourceTrace {
  const locator = {
    locatorType: statement.locator.locatorType,
    slideNumber: statement.locator.slideNumber ?? null,
    sheetName: statement.locator.sheetName ?? null,
    rowNumber: statement.locator.rowNumber ?? null,
    tableIndex: statement.locator.tableIndex ?? null,
    shapeId: statement.locator.shapeId ?? null,
    sectionReference: statement.locator.sectionReference ?? null
  };
  const extractedMeaning = sanitizeOperationalSourceText(statement.extractedMeaning);
  const traceIdentity = sha256PayloadSync({
    sourceId: statement.sourceId,
    sourceRevision: statement.sourceRevision,
    sourceHash: statement.sourceHash,
    locator,
    extractedMeaning
  }).slice(0, 20).toUpperCase();
  return {
    traceId: `SOURCE-TRACE-${traceIdentity}`,
    sourceId: statement.sourceId,
    sourceRevision: statement.sourceRevision,
    sourceHash: statement.sourceHash,
    ...locator,
    sanitizedSourceLabel: sanitizeOperationalSourceText(statement.sanitizedSourceLabel),
    extractedMeaning,
    extractionConfidence: statement.extractionConfidence,
    reviewStatus: statement.reviewStatus
  };
}

export function createDeterministicRequirementId(input: {
  namespace: string;
  workstreamId: string;
  sourceTraceIds: string[];
  titleAr: string;
}): string {
  const slug = input.titleAr
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 24);
  const suffix = sha256PayloadSync({
    namespace: input.namespace,
    workstreamId: input.workstreamId,
    sourceTraceIds: [...input.sourceTraceIds].sort(),
    titleAr: input.titleAr
  }).slice(0, 10).toUpperCase();
  return `${input.namespace}-${slug || 'REQUIREMENT'}-${suffix}`;
}

export interface WorkbookRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

export function extractAllowedEmployeeReferences(input: {
  sheetName: string;
  rows: WorkbookRow[];
  allowedDisplayNames: string[];
  nameField: string;
  roleField: string;
}): Array<{
  sheetName: string;
  rowNumber: number;
  displayName: string;
  roleLabel: string | null;
}> {
  const allowed = new Set(input.allowedDisplayNames.map((name) => name.trim()));
  return input.rows.flatMap((row) => {
    const rawName = row.values[input.nameField];
    if (typeof rawName !== 'string' || !allowed.has(rawName.trim())) return [];
    const rawRole = row.values[input.roleField];
    return [{
      sheetName: input.sheetName,
      rowNumber: row.rowNumber,
      displayName: sanitizeOperationalSourceText(rawName),
      roleLabel: typeof rawRole === 'string' && rawRole.trim()
        ? sanitizeOperationalSourceText(rawRole)
        : null
    }];
  });
}

export function sourceRevisionForFingerprint(input: {
  registeredHash: string;
  observedHash: string;
  registeredRevision: number;
}): {
  revision: number;
  supersedesRegisteredRevision: boolean;
  sameRevision: boolean;
} {
  const sameRevision = input.registeredHash === input.observedHash;
  return {
    revision: sameRevision ? input.registeredRevision : input.registeredRevision + 1,
    supersedesRegisteredRevision: !sameRevision,
    sameRevision
  };
}
