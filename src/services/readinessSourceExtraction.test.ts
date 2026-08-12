import { describe, expect, it } from 'vitest';
import {
  createDeterministicRequirementId,
  createDeterministicSourceTrace,
  extractAllowedEmployeeReferences,
  sanitizeOperationalSourceText,
  sourceRevisionForFingerprint,
  verifyOperationalSourceFingerprint
} from './readinessSourceExtraction';
import type { OperationalReadinessSource } from '../types/operationalReadinessPack';

const verifiedSource: OperationalReadinessSource = {
  sourceId: 'SOURCE-GOVERNANCE-001',
  sourceRevisionId: `SOURCE-GOVERNANCE-001:R1:${'a'.repeat(16).toUpperCase()}`,
  originalFilename: 'governance.pptx',
  absoluteLocalPath: '/local/ignored/governance.pptx',
  expectedByteSize: 100,
  observedByteSize: 100,
  expectedSha256: 'a'.repeat(64),
  observedSha256: 'a'.repeat(64),
  fingerprintStatus: 'verified',
  sourceClassification: 'founder-approved-project-governance-source',
  approvalScope: 'Governance extraction only.',
  approvalLimitations: ['No operational claim.'],
  extractedAt: '2026-07-29T12:00:00Z',
  extractionTool: 'fixture-extractor',
  extractionToolVersion: '1',
  sourceRevision: 1,
  supersedesSourceId: null,
  supersedesSourceRevisionId: null,
  previousSourceHash: null,
  committedBinary: false
};

describe('Stage 3G.1 deterministic source extraction', () => {
  it('accepts a byte-for-byte source fingerprint and blocks a mismatch', () => {
    expect(verifyOperationalSourceFingerprint(verifiedSource)).toEqual({
      valid: true,
      status: 'verified',
      issues: []
    });

    const mismatch = {
      ...verifiedSource,
      observedSha256: 'b'.repeat(64),
      fingerprintStatus: 'mismatch' as const
    };
    expect(verifyOperationalSourceFingerprint(mismatch)).toMatchObject({
      valid: false,
      status: 'mismatch',
      issues: ['sha256-mismatch']
    });
  });

  it('registers changed bytes as a separate source revision', () => {
    expect(sourceRevisionForFingerprint({
      registeredHash: 'a'.repeat(64),
      observedHash: 'b'.repeat(64),
      registeredRevision: 3
    })).toEqual({
      revision: 4,
      supersedesRegisteredRevision: true,
      sameRevision: false
    });
  });

  it('produces stable PPTX source locators and trace IDs', () => {
    const statement = {
      sourceId: 'SOURCE-GOVERNANCE-001',
      sourceRevision: 1,
      sourceHash: 'a'.repeat(64),
      locator: {
        locatorType: 'slide-table-row' as const,
        slideNumber: 7,
        tableIndex: 1,
        rowNumber: 8
      },
      sanitizedSourceLabel: 'جدول مسؤوليات المسارات',
      extractedMeaning: 'يسجل المصدر مسؤولية تنفيذ متعارضة.',
      extractionConfidence: 'high' as const,
      reviewStatus: 'conflicted' as const
    };
    const first = createDeterministicSourceTrace(statement);
    const second = createDeterministicSourceTrace(structuredClone(statement));
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      locatorType: 'slide-table-row',
      slideNumber: 7,
      tableIndex: 1,
      rowNumber: 8,
      reviewStatus: 'conflicted'
    });
  });

  it('extracts only explicitly allowed workbook rows and fields', () => {
    const extracted = extractAllowedEmployeeReferences({
      sheetName: 'موظفين',
      nameField: 'الاسم',
      roleField: 'المسمى',
      allowedDisplayNames: ['محمد إبراهيم'],
      rows: [
        { rowNumber: 2, values: { الاسم: 'شخص غير مصرح', المسمى: 'مدير', هاتف: '0500000000' } },
        { rowNumber: 28, values: { الاسم: 'محمد إبراهيم', المسمى: 'عامل مكتب', راتب: 12345 } }
      ]
    });
    expect(extracted).toEqual([{
      sheetName: 'موظفين',
      rowNumber: 28,
      displayName: 'محمد إبراهيم',
      roleLabel: 'عامل مكتب'
    }]);
    expect(JSON.stringify(extracted)).not.toContain('راتب');
    expect(JSON.stringify(extracted)).not.toContain('هاتف');
  });

  it('redacts contact and personal identifier patterns', () => {
    const sanitized = sanitizeOperationalSourceText(
      'البريد person@example.com والهاتف +966 50 123 4567 والمعرف 123456789012'
    );
    expect(sanitized).not.toContain('person@example.com');
    expect(sanitized).not.toContain('501234567');
    expect(sanitized).not.toContain('123456789012');
    expect(sanitized).toContain('[بيانات اتصال محجوبة]');
  });

  it('creates deterministic requirement IDs independent of trace ordering', () => {
    const base = {
      namespace: 'REQ-CONFERENCE',
      workstreamId: 'WORKSTREAM-OPS',
      titleAr: 'تسليم خطة التشغيل'
    };
    expect(createDeterministicRequirementId({
      ...base,
      sourceTraceIds: ['TRACE-B', 'TRACE-A']
    })).toBe(createDeterministicRequirementId({
      ...base,
      sourceTraceIds: ['TRACE-A', 'TRACE-B']
    }));
  });
});
