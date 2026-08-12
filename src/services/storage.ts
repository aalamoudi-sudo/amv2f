import { cloneDemoEntities } from '../data/entities';
import { cloneDemoDecisions } from '../data/decisions';
import { cloneDemoZoneReadiness } from '../data/zoneReadiness';
import { createDefaultRouteVisibility, routeDefinitions } from '../data/routes';
import { normalizeProjectionSettings } from '../data/projectionPresets';
import { validateZoneReadinessDataset } from './zoneReadinessValidation';
import { validateDecisionDataset, type DecisionValidationIssue } from './decisionValidation';
import {
  migrateUntrustedDecisionRecord,
  type DecisionMigrationWarning
} from './decisionRelationshipMigration';
import type { ProjectionSettings } from '../types/projection';
import type { RouteVisibility } from '../types/routes';
import type { EventStateContext, SpatialDataSource, SpatialEntityId, SpatialEntityRecord, ZoneReadinessRecord } from '../types/spatial';
import type { DecisionId, DecisionRecord } from '../types/decision';
import { isOperationalStatus, isRiskLevel } from '../types/status';

export const localStorageKeys = {
  eventStore: 'mayadeen-event-intelligence-twin:v1',
  projectionSettings: 'mayadeen-event-intelligence-twin:projection:v1'
} as const;

export const EVENT_STORE_PERSISTENCE_VERSION = 8;

export interface PersistedDecisionRejection {
  lane: 'current' | 'baseline';
  recordIndex: number;
  recordId: string;
  issues: DecisionValidationIssue[];
}

export interface PersistedDecisionMigrationNotice {
  lane: 'current' | 'baseline';
  recordIndex: number;
  recordId: string;
  warnings: DecisionMigrationWarning[];
  fieldsRequiringReview: string[];
  originalSchemaVersion: number;
  targetSchemaVersion: number;
}

export interface PersistedDecisionRecovery {
  rejectedRecords: PersistedDecisionRejection[];
  migrationNotices: PersistedDecisionMigrationNotice[];
  sourcePersistenceVersion: number;
  targetPersistenceVersion: number;
}

export interface PersistedEventState {
  entities: SpatialEntityRecord;
  baselineEntities: SpatialEntityRecord;
  zoneReadiness: ZoneReadinessRecord[];
  baselineZoneReadiness: ZoneReadinessRecord[];
  decisions: DecisionRecord[];
  baselineDecisions: DecisionRecord[];
  stateContext: EventStateContext;
  selectedEntityId: SpatialEntityId | null;
  selectedDecisionId: DecisionId | null;
  routeVisibility: RouteVisibility;
  projectionSettings: ProjectionSettings;
  lastSavedAt: number | null;
  decisionRecovery: PersistedDecisionRecovery;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSpatialDataSource(value: unknown): value is SpatialDataSource {
  return value === 'temporary-demo' || value === 'operational-baseline';
}

function normalizeStateContext(value: unknown, fallback: EventStateContext): EventStateContext {
  const candidate = isRecord(value) ? value : {};

  return {
    dataSource: isSpatialDataSource(candidate.dataSource) ? candidate.dataSource : fallback.dataSource,
    // Scenario playback is transient and is never restored as a baseline after reload.
    stateLayer: 'baseline'
  };
}

function normalizeReadiness(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function normalizePersistedEntities(value: unknown): SpatialEntityRecord {
  const candidate = isRecord(value) ? value : {};
  const baseline = cloneDemoEntities();

  return Object.keys(baseline).reduce<SpatialEntityRecord>((entities, entityId) => {
    const baselineEntity = baseline[entityId as SpatialEntityId]!;
    const persistedEntity = isRecord(candidate[entityId]) ? candidate[entityId] : {};

    entities[entityId as SpatialEntityId] = {
      ...baselineEntity,
      status: isOperationalStatus(persistedEntity.status) ? persistedEntity.status : baselineEntity.status,
      readiness: normalizeReadiness(persistedEntity.readiness, baselineEntity.readiness),
      riskLevel: isRiskLevel(persistedEntity.riskLevel) ? persistedEntity.riskLevel : baselineEntity.riskLevel
    };
    return entities;
  }, {} as SpatialEntityRecord);
}

export function normalizePersistedRouteVisibility(value: unknown, fallback: RouteVisibility): RouteVisibility {
  const candidate = isRecord(value) ? value : {};
  const defaults = createDefaultRouteVisibility();

  return routeDefinitions.reduce<RouteVisibility>((visibility, route) => {
    const persistedValue = candidate[route.id];
    const fallbackValue = fallback[route.id];
    const defaultValue = defaults[route.id] ?? route.defaultVisible;
    visibility[route.id] =
      typeof persistedValue === 'boolean'
        ? persistedValue
        : typeof fallbackValue === 'boolean'
          ? fallbackValue
          : defaultValue;
    return visibility;
  }, {} as RouteVisibility);
}

export function normalizePersistedZoneReadiness(value: unknown, fallback: ZoneReadinessRecord[]): ZoneReadinessRecord[] {
  const candidate: unknown[] = Array.isArray(value) ? value as unknown[] : [];
  const fallbackRecords = fallback.length ? fallback : cloneDemoZoneReadiness();
  const validation = validateZoneReadinessDataset(candidate, fallbackRecords.map((record) => record.zoneId), {
    targetStateContext: 'baseline'
  });
  const validById = new Map(validation.validRecords.map((record) => [record.zoneId, record]));

  return fallbackRecords.map((fallbackRecord) => {
    const persistedRecord = validById.get(fallbackRecord.zoneId);
    if (!persistedRecord) {
      return { ...fallbackRecord, stateContext: 'baseline' };
    }

    return {
      ...persistedRecord,
      stateContext: 'baseline',
      evidence: persistedRecord.evidence.map((evidence) => ({ ...evidence })),
      blockers: persistedRecord.blockers.map((blocker) => ({ ...blocker })),
      dependencies: [...persistedRecord.dependencies],
      relatedRouteIds: [...persistedRecord.relatedRouteIds],
      operationalImpact: { ...persistedRecord.operationalImpact }
    };
  });
}

function cloneDecision(record: DecisionRecord): DecisionRecord {
  return {
    ...record,
    relationships: record.relationships.map((relation) => ({ ...relation })),
    evidence: record.evidence.map((item) => ({ ...item })),
    assumptions: [...record.assumptions],
    constraints: [...record.constraints],
    availableOptions: record.availableOptions.map((item) => ({ ...item, risks: [...item.risks] })),
    rejectedOptions: [...record.rejectedOptions],
    expectedImpact: { ...record.expectedImpact, dimensions: { ...record.expectedImpact.dimensions } },
    actualImpact: record.actualImpact ? { ...record.actualImpact, dimensions: { ...record.actualImpact.dimensions } } : null,
    completionEvidenceIds: [...record.completionEvidenceIds],
    verificationEvidenceIds: [...record.verificationEvidenceIds],
    changeHistory: record.changeHistory.map((item) => ({ ...item }))
  };
}

interface PersistedDecisionLaneRecovery {
  decisions: DecisionRecord[];
  rejectedRecords: Omit<PersistedDecisionRejection, 'lane'>[];
  migrationNotices: Omit<PersistedDecisionMigrationNotice, 'lane'>[];
}

export function recoverPersistedDecisions(
  value: unknown,
  fallback: DecisionRecord[],
  knownEntityIds: Iterable<SpatialEntityId>
): PersistedDecisionLaneRecovery {
  const candidate: unknown[] = Array.isArray(value) ? value as unknown[] : [];
  const fallbackRecords = fallback.length ? fallback : cloneDemoDecisions();
  const migrationNotices: PersistedDecisionLaneRecovery['migrationNotices'] = [];
  const migratedCandidate = candidate.map((record, recordIndex) => {
    if (!isRecord(record) || !Array.isArray(record.changeHistory)) return record;
    if (!Array.isArray(record.relationships) && !Array.isArray(record.relatedEntityIds)) return record;
    try {
      const result = migrateUntrustedDecisionRecord(record);
      if (result.warnings.length > 0) {
        migrationNotices.push({
          recordIndex,
          recordId: typeof record.decisionId === 'string' ? record.decisionId : `record-${recordIndex + 1}`,
          warnings: result.warnings,
          fieldsRequiringReview: result.fieldsRequiringReview,
          originalSchemaVersion: result.originalSchemaVersion,
          targetSchemaVersion: result.targetSchemaVersion
        });
      }
      return result.candidate;
    } catch {
      return record;
    }
  });
  const validation = validateDecisionDataset(migratedCandidate, {
    knownEntityIds,
    targetStateContext: 'baseline',
    sourceFormat: 'runtime'
  });
  const merged = new Map<DecisionId, DecisionRecord>();
  fallbackRecords.forEach((record) => merged.set(record.decisionId, cloneDecision(record)));
  validation.validRecords.forEach((record) => merged.set(record.decisionId, cloneDecision(record)));
  const rejectedByIndex = new Map<number, DecisionValidationIssue[]>();
  validation.issues
    .filter((currentIssue) => currentIssue.blocking && currentIssue.recordIndex !== undefined)
    .forEach((currentIssue) => {
      const recordIssues = rejectedByIndex.get(currentIssue.recordIndex!) ?? [];
      recordIssues.push(currentIssue);
      rejectedByIndex.set(currentIssue.recordIndex!, recordIssues);
    });
  const rejectedRecords = [...rejectedByIndex.entries()].map(([recordIndex, issues]) => ({
    recordIndex,
    recordId: isRecord(candidate[recordIndex]) && typeof candidate[recordIndex].decisionId === 'string'
      ? candidate[recordIndex].decisionId
      : `record-${recordIndex + 1}`,
    issues
  }));
  return {
    decisions: [...merged.values()].sort((left, right) => left.decisionId.localeCompare(right.decisionId, 'en', { numeric: true })),
    rejectedRecords,
    migrationNotices
  };
}

export function normalizePersistedDecisions(value: unknown, fallback: DecisionRecord[], knownEntityIds: Iterable<SpatialEntityId>): DecisionRecord[] {
  return recoverPersistedDecisions(value, fallback, knownEntityIds).decisions;
}

export function normalizePersistedEventState(
  value: unknown,
  fallback: PersistedEventState,
  sourcePersistenceVersion = EVENT_STORE_PERSISTENCE_VERSION
): PersistedEventState {
  const envelope = isRecord(value) && isRecord(value.state) && !('entities' in value) ? value.state : value;
  const candidate = isRecord(envelope) ? envelope : {};
  const persistedRecovery = isRecord(candidate.decisionRecovery) ? candidate.decisionRecovery : {};
  const effectiveSourcePersistenceVersion = sourcePersistenceVersion !== EVENT_STORE_PERSISTENCE_VERSION
    ? sourcePersistenceVersion
    : typeof persistedRecovery.sourcePersistenceVersion === 'number'
      ? persistedRecovery.sourcePersistenceVersion
      : sourcePersistenceVersion;
  const baselineEntities = normalizePersistedEntities(candidate.baselineEntities ?? candidate.entities);
  const persistedStateWasScenario =
    isRecord(candidate.stateContext) && candidate.stateContext.stateLayer === 'scenario';
  const entities = persistedStateWasScenario
    ? baselineEntities
    : normalizePersistedEntities(candidate.entities ?? baselineEntities);
  const fallbackBaselineZoneReadiness = fallback.baselineZoneReadiness ?? cloneDemoZoneReadiness();
  const baselineZoneReadiness = normalizePersistedZoneReadiness(
    candidate.baselineZoneReadiness ?? candidate.zoneReadiness,
    fallbackBaselineZoneReadiness
  );
  const zoneReadiness = persistedStateWasScenario
    ? baselineZoneReadiness
    : normalizePersistedZoneReadiness(candidate.zoneReadiness ?? baselineZoneReadiness, fallback.zoneReadiness ?? baselineZoneReadiness);
  const fallbackBaselineDecisions = fallback.baselineDecisions ?? cloneDemoDecisions();
  const baselineDecisionRecovery = recoverPersistedDecisions(
    candidate.baselineDecisions ?? candidate.decisions,
    fallbackBaselineDecisions,
    Object.keys(baselineEntities) as SpatialEntityId[]
  );
  const baselineDecisions = baselineDecisionRecovery.decisions;
  const currentDecisionRecovery = persistedStateWasScenario
    ? { decisions: baselineDecisions.map(cloneDecision), rejectedRecords: [], migrationNotices: [] }
    : recoverPersistedDecisions(candidate.decisions ?? baselineDecisions, fallback.decisions ?? baselineDecisions, Object.keys(entities) as SpatialEntityId[]);
  const decisions = currentDecisionRecovery.decisions;
  const stateContext = normalizeStateContext(candidate.stateContext, fallback.stateContext);
  const fallbackSelection =
    fallback.selectedEntityId !== null && Object.prototype.hasOwnProperty.call(entities, fallback.selectedEntityId)
      ? fallback.selectedEntityId
      : 'ZONE-001';
  const selectedEntityId =
    candidate.selectedEntityId === null
      ? null
      : typeof candidate.selectedEntityId === 'string' && Object.prototype.hasOwnProperty.call(entities, candidate.selectedEntityId)
        ? (candidate.selectedEntityId as SpatialEntityId)
        : fallbackSelection;
  const fallbackDecisionSelection = fallback.selectedDecisionId && baselineDecisions.some((decision) => decision.decisionId === fallback.selectedDecisionId)
    ? fallback.selectedDecisionId
    : baselineDecisions[0]?.decisionId ?? null;
  const selectedDecisionId = candidate.selectedDecisionId === null
    ? null
    : typeof candidate.selectedDecisionId === 'string' && decisions.some((decision) => decision.decisionId === candidate.selectedDecisionId)
      ? (candidate.selectedDecisionId as DecisionId)
      : fallbackDecisionSelection;
  const projectionSettings = normalizeProjectionSettings(candidate.projectionSettings, fallback.projectionSettings);

  return {
    entities,
    baselineEntities,
    zoneReadiness,
    baselineZoneReadiness,
    decisions,
    baselineDecisions,
    stateContext,
    selectedEntityId,
    selectedDecisionId,
    routeVisibility: normalizePersistedRouteVisibility(candidate.routeVisibility, fallback.routeVisibility),
    projectionSettings,
    decisionRecovery: {
      rejectedRecords: [
        ...baselineDecisionRecovery.rejectedRecords.map((record) => ({ ...record, lane: 'baseline' as const })),
        ...currentDecisionRecovery.rejectedRecords.map((record) => ({ ...record, lane: 'current' as const }))
      ],
      migrationNotices: [
        ...baselineDecisionRecovery.migrationNotices.map((notice) => ({ ...notice, lane: 'baseline' as const })),
        ...currentDecisionRecovery.migrationNotices.map((notice) => ({ ...notice, lane: 'current' as const }))
      ],
      sourcePersistenceVersion: effectiveSourcePersistenceVersion,
      targetPersistenceVersion: EVENT_STORE_PERSISTENCE_VERSION
    },
    lastSavedAt:
      candidate.lastSavedAt === null
        ? null
        : typeof candidate.lastSavedAt === 'number' && Number.isFinite(candidate.lastSavedAt) && candidate.lastSavedAt >= 0
          ? Math.round(candidate.lastSavedAt)
          : fallback.lastSavedAt
  };
}

const unavailableStorage: Storage = {
  get length() {
    return 0;
  },
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined
};

export function getSafeLocalStorage(): Storage {
  if (typeof window === 'undefined') {
    return unavailableStorage;
  }

  try {
    return window.localStorage;
  } catch {
    return unavailableStorage;
  }
}

export function safeRemoveLocalStorageItem(key: string): void {
  try {
    getSafeLocalStorage()?.removeItem(key);
  } catch {
    // Storage can be unavailable or quota-restricted in embedded browsers.
  }
}
