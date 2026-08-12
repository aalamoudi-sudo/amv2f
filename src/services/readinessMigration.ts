import { sha256PayloadSync } from './integrationHash';
import { validateZoneReadinessRecord } from './zoneReadinessValidation';
import type {
  LegacyReadinessCompatibilityRecord,
  ReadinessMigrationQuarantineRecord,
  ReadinessMigrationResult
} from '../types/readinessIntelligence';
import type { ZoneReadinessRecord } from '../types/spatial';

interface LegacyReadinessMigrationInput {
  records: unknown[];
  sourceProjectId: string;
  targetProjectId: string;
  eventId: string;
  venueId: string;
  knownZoneIds: Iterable<string>;
}

function legacyZoneId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = (value as Record<string, unknown>).zoneId;
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}

function quarantine(
  value: unknown,
  sourceIndex: number,
  issueCodes: string[]
): ReadinessMigrationQuarantineRecord {
  const rawRecordHash = sha256PayloadSync(value);
  return {
    quarantineId: `READINESS-QUARANTINE-${sourceIndex + 1}-${rawRecordHash.slice(0, 16)}`,
    sourceIndex,
    sourceRecordId: legacyZoneId(value),
    issueCodes: [...new Set(issueCodes)].sort(),
    rawRecordHash
  };
}

function migrateRecord(
  record: ZoneReadinessRecord,
  scope: Pick<LegacyReadinessMigrationInput, 'targetProjectId' | 'eventId' | 'venueId'>
): LegacyReadinessCompatibilityRecord {
  return {
    compatibilityRecordId: `LEGACY-READINESS-${scope.targetProjectId}-${record.zoneId}-r${record.revision}`,
    legacyZoneId: record.zoneId,
    projectId: scope.targetProjectId,
    eventId: scope.eventId,
    venueId: scope.venueId,
    classification: 'legacy-temporary-demo',
    stateContext: 'temporary-demo',
    manualPercentage: record.readiness,
    source: record.source,
    sourceRevision: record.revision,
    updatedAt: record.updatedAt,
    legacyStatus: record.status,
    legacyApprovalLabel: record.approvalStatus,
    evidenceReferenceIds: record.evidence.map((evidence) => evidence.id),
    verificationStatus: 'not-migrated',
    approvalStatus: 'not-migrated',
    provenanceStatus: 'not-fabricated',
    operationalTruthEligible: false
  };
}

export function migrateLegacyZoneReadiness(
  input: LegacyReadinessMigrationInput
): ReadinessMigrationResult {
  const knownZoneIds = [...input.knownZoneIds];
  const migrated: LegacyReadinessCompatibilityRecord[] = [];
  const quarantined: ReadinessMigrationQuarantineRecord[] = [];
  const seen = new Set<string>();
  const projectMismatch = input.sourceProjectId !== input.targetProjectId;

  input.records.forEach((value, index) => {
    const issues = validateZoneReadinessRecord(value, knownZoneIds, {
      targetStateContext: 'temporary-demo'
    });
    const record = value as Partial<ZoneReadinessRecord>;
    const issueCodes: string[] = issues
      .filter((entry) => entry.severity === 'error')
      .map((entry) => entry.code);
    if (projectMismatch) issueCodes.push('cross-project-source');
    if (record.stateContext !== 'temporary-demo') issueCodes.push('legacy-context-not-temporary-demo');
    if (record.sourceType !== 'temporary-demo') issueCodes.push('legacy-source-not-temporary-demo');
    if (typeof record.zoneId === 'string' && seen.has(record.zoneId)) issueCodes.push('duplicate-record');
    if (typeof record.zoneId === 'string') seen.add(record.zoneId);

    if (issueCodes.length > 0) {
      quarantined.push(quarantine(value, index, issueCodes));
      return;
    }
    migrated.push(migrateRecord(value as ZoneReadinessRecord, input));
  });

  return {
    migrationVersion: 'legacy-zone-readiness-v1',
    projectId: input.targetProjectId,
    eventId: input.eventId,
    venueId: input.venueId,
    migrated,
    quarantined
  };
}

export function legacyManualReadinessCanPromoteOperationalTruth(
  record: LegacyReadinessCompatibilityRecord
): false {
  void record;
  return false;
}
