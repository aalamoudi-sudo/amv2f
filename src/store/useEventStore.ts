import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { defaultProjectionSettings, getProjectionPreset, normalizeProjectionSettings } from '../data/projectionPresets';
import { createDefaultRouteVisibility, routeDefinitions as defaultRouteDefinitions } from '../data/routes';
import { scenarioDefinitions as fallbackScenarioDefinitions } from '../data/scenarios';
import { fallbackRuntimeIdentity } from '../data/fallbackRuntime';
import { cloneDemoEntities } from '../data/entities';
import { cloneDemoDecisions } from '../data/decisions';
import { cloneDemoZoneReadiness } from '../data/zoneReadiness';
import {
  createIdleScenarioRuntime,
  createScenarioRuntime,
  getScenarioById,
  getScenarioProgress,
  isScenarioId,
  normalizeScenarioRuntime,
  normalizeScenarioStepIndex
} from '../services/scenarioEngine';
import {
  getSafeLocalStorage,
  EVENT_STORE_PERSISTENCE_VERSION,
  localStorageKeys,
  normalizePersistedEventState,
  safeRemoveLocalStorageItem,
  type PersistedDecisionRecovery,
  type PersistedEventState
} from '../services/storage';
import { validateZoneReadinessRecord } from '../services/zoneReadinessValidation';
import { getDecisionTransitionIssues, validateDecisionRecord } from '../services/decisionValidation';
import { isViewMode, type ProjectionSettings, type ViewMode } from '../types/projection';
import type {
  EventStateContext,
  RouteId,
  SpatialEntity,
  SpatialEntityId,
  ZoneReadinessRecord
} from '../types/spatial';
import type {
  DecisionEntityRelation,
  DecisionId,
  DecisionLifecycleStatus,
  DecisionRecord,
  DecisionType
} from '../types/decision';
import { isOperationalStatus, isRiskLevel, type OperationalStatus, type RiskLevel } from '../types/status';
import type { ScenarioDefinition, ScenarioId, ScenarioRuntime, ScenarioStep } from '../types/scenario';
import type { SpatialEntityRecord } from '../types/spatial';
import type { RouteDefinition, RouteVisibility } from '../types/routes';
import type {
  EventPackageActivationHistoryEntry,
  EventRuntimeConfiguration
} from '../types/eventPackage';
import { verifyEventRuntimeHealth } from '../services/eventRuntimeConfiguration';
import { getScenarioPlayerPackConfiguration } from '../services/scenarioPackValidation';

export interface EventStoreState {
  activeProjectId: string | null;
  activeProjectEventId: string | null;
  activeProjectUsesLocalDemo: boolean;
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
  activeRuntime: EventRuntimeConfiguration | null;
  previousRuntimeSession: EventStoreRuntimeSession | null;
  activationHistory: EventPackageActivationHistoryEntry[];
  packageSessionSnapshot: EventStorePackageSessionSnapshot | null;
  viewMode: ViewMode;
  isProjectionMode: boolean;
  projectionCleanMode: boolean;
  projectionSettings: ProjectionSettings;
  scenarioRuntime: ScenarioRuntime;
  cameraResetNonce: number;
  lastSavedAt: number | null;
  decisionRecovery: PersistedDecisionRecovery;
  errorMessage: string | null;
}

export interface EventStoreActions {
  clearProjectScopedState: (projectId: string | null, eventId: string | null) => void;
  activateLocalDemoProjectScope: (projectId: string, eventId: string, snapshot?: EventStoreState | null) => void;
  selectEntity: (entityId: SpatialEntityId | null) => void;
  updateEntityStatus: (entityId: SpatialEntityId, status: OperationalStatus) => void;
  updateEntityReadiness: (entityId: SpatialEntityId, readiness: number) => void;
  updateZoneReadiness: (zoneId: SpatialEntityId, update: ZoneReadinessUpdate) => void;
  selectDecision: (decisionId: DecisionId | null) => void;
  createDecisionDraft: (input: CreateDecisionInput) => DecisionId | null;
  createRehearsalDecisionDraft: (input: CreateRehearsalDecisionInput) => DecisionId | null;
  updateDecision: (decisionId: DecisionId, update: DecisionUpdate) => void;
  approveDecision: (decisionId: DecisionId, approvalComments: string) => void;
  transitionDecision: (decisionId: DecisionId, status: DecisionLifecycleStatus) => void;
  updateEntityRiskLevel: (entityId: SpatialEntityId, riskLevel: RiskLevel) => void;
  setRouteVisible: (routeId: RouteId, visible: boolean) => void;
  toggleRoute: (routeId: RouteId) => void;
  setViewMode: (viewMode: ViewMode) => void;
  resetCamera: () => void;
  enterProjectionMode: () => void;
  exitProjectionMode: () => void;
  enterProjectionCleanMode: () => void;
  exitProjectionCleanMode: () => void;
  setProjectionPreset: (presetId: ProjectionSettings['presetId']) => void;
  updateProjectionSettings: (settings: Partial<ProjectionSettings>) => void;
  startScenario: (scenarioId: ScenarioId) => void;
  pauseScenario: () => void;
  resumeScenario: () => void;
  advanceScenario: () => void;
  stopScenario: () => void;
  resetScenario: () => void;
  activateTemporaryEventRuntime: (runtime: EventRuntimeConfiguration, reasonAr?: string, projectScope?: { projectId: string; eventId: string }) => boolean;
  rollbackTemporaryEventRuntime: () => boolean;
  deactivateTemporaryEventRuntime: () => void;
  resetDemoData: () => void;
  clearError: () => void;
}

export type EventStore = EventStoreState & EventStoreActions;

export interface EventStorePackageSessionSnapshot {
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
}

export interface EventStoreRuntimeSession {
  runtime: EventRuntimeConfiguration;
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
}

const migratedPersistenceMarker = Symbol('mayadeen-migrated-persistence');
const emptyRuntimeRoutes = Object.freeze([]) as unknown as RouteDefinition[];
const emptyRuntimeScenarios = Object.freeze([]) as unknown as ScenarioDefinition[];

function markMigratedPersistence(state: PersistedEventState): PersistedEventState {
  Object.defineProperty(state, migratedPersistenceMarker, { value: true, enumerable: false });
  return state;
}

function isMarkedMigratedPersistence(value: unknown): value is PersistedEventState {
  return typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, migratedPersistenceMarker);
}

export interface CreateDecisionInput {
  title: string;
  description: string;
  decisionType: DecisionType;
  decisionOwner: string;
  responsibleParty: string;
  relationships: Array<Pick<DecisionEntityRelation, 'entityId' | 'relationType' | 'impactLevel' | 'descriptionAr'>>;
}

export interface CreateRehearsalDecisionInput {
  projectId: string;
  eventId: DecisionRecord['eventId'];
  venueId: DecisionRecord['venueId'];
  title: string;
  description: string;
  createdAt: string;
  runId: string;
  eventDayId: string;
  momentId: string;
  personaVariantId: string;
  journeyStepId: string | null;
  relatedSpatialObjectIds: string[];
  sourceTraceIds: string[];
}

export type DecisionUpdate = Partial<Pick<DecisionRecord,
  | 'title'
  | 'description'
  | 'decisionOwner'
  | 'responsibleParty'
  | 'approvingAuthority'
  | 'source'
  | 'confidence'
  | 'evidence'
  | 'availableOptions'
  | 'selectedOption'
  | 'rejectedOptions'
  | 'approvalStatus'
  | 'approvedBy'
  | 'approvedAt'
  | 'approvalComments'
  | 'actionRequired'
  | 'assignedTo'
  | 'dueAt'
  | 'status'
  | 'outcomeStatus'
  | 'actualImpact'
  | 'completionEvidenceIds'
  | 'completionNote'
  | 'verifiedBy'
  | 'verifiedAt'
  | 'verificationEvidenceIds'
  | 'closedBy'
  | 'closedAt'
  | 'closureReason'
  | 'lessonsLearned'
  | 'changeReason'
  | 'relationships'
>>;

export type ZoneReadinessUpdate = Partial<
  Pick<
    ZoneReadinessRecord,
    | 'readiness'
    | 'confidence'
    | 'responsibleParty'
    | 'requiredAction'
    | 'targetReadinessDate'
    | 'approvalStatus'
    | 'evidence'
    | 'blockers'
    | 'changeReason'
  >
>;

export function createInitialEventStoreState(): EventStoreState {
  return {
    activeProjectId: null,
    activeProjectEventId: null,
    activeProjectUsesLocalDemo: false,
    entities: cloneDemoEntities(),
    baselineEntities: cloneDemoEntities(),
    zoneReadiness: cloneDemoZoneReadiness(),
    baselineZoneReadiness: cloneDemoZoneReadiness(),
    decisions: cloneDemoDecisions(),
    baselineDecisions: cloneDemoDecisions(),
    stateContext: { dataSource: 'temporary-demo', stateLayer: 'baseline' },
    selectedEntityId: 'ZONE-001',
    selectedDecisionId: 'DECISION-001',
    routeVisibility: createDefaultRouteVisibility(),
    activeRuntime: null,
    previousRuntimeSession: null,
    activationHistory: [],
    packageSessionSnapshot: null,
    viewMode: 'operator',
    isProjectionMode: false,
    projectionCleanMode: false,
    projectionSettings: { ...defaultProjectionSettings },
    scenarioRuntime: createIdleScenarioRuntime(),
    cameraResetNonce: 0,
    lastSavedAt: null,
    decisionRecovery: {
      rejectedRecords: [],
      migrationNotices: [],
      sourcePersistenceVersion: EVENT_STORE_PERSISTENCE_VERSION,
      targetPersistenceVersion: EVENT_STORE_PERSISTENCE_VERSION
    },
    errorMessage: null
  };
}

function clampReadiness(readiness: number): number {
  if (!Number.isFinite(readiness)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(readiness)));
}

function markSaved(): number {
  return Date.now();
}

function isDecisionSpatialEntityId(value: string): value is SpatialEntityId {
  return /^(SITE|ZONE|HALL|GATE|ROUTE|STAGE|PARK|SERVICE|ASSEMBLY|ASSET)-/.test(value);
}

function readinessStateContextForStore(
  state: EventStoreState,
  record?: Pick<ZoneReadinessRecord, 'stateContext'>
): ZoneReadinessRecord['stateContext'] {
  if (state.stateContext.stateLayer === 'scenario') return 'scenario';
  if (record && record.stateContext !== 'scenario') return record.stateContext;
  return state.stateContext.dataSource === 'temporary-demo' ? 'temporary-demo' : 'baseline';
}

function cloneReadinessWithContext(records: ZoneReadinessRecord[], stateContext?: ZoneReadinessRecord['stateContext']): ZoneReadinessRecord[] {
  return records.map((record) => ({
    ...record,
    stateContext: stateContext ?? record.stateContext,
    evidence: record.evidence.map((evidence) => ({ ...evidence })),
    blockers: record.blockers.map((blocker) => ({ ...blocker })),
    dependencies: [...record.dependencies],
    relatedRouteIds: [...record.relatedRouteIds],
    operationalImpact: { ...record.operationalImpact }
  }));
}

function cloneDecisionsWithContext(records: DecisionRecord[], stateContext?: DecisionRecord['stateContext']): DecisionRecord[] {
  return records.map((decision) => ({
    ...decision,
    stateContext: stateContext ?? decision.stateContext,
    relationships: decision.relationships.map((relation) => ({ ...relation, stateContext: stateContext ?? decision.stateContext })),
    evidence: decision.evidence.map((item) => ({ ...item })),
    assumptions: [...decision.assumptions],
    constraints: [...decision.constraints],
    availableOptions: decision.availableOptions.map((item) => ({ ...item, risks: [...item.risks] })),
    rejectedOptions: [...decision.rejectedOptions],
    expectedImpact: { ...decision.expectedImpact, dimensions: { ...decision.expectedImpact.dimensions } },
    actualImpact: decision.actualImpact ? { ...decision.actualImpact, dimensions: { ...decision.actualImpact.dimensions } } : null,
    completionEvidenceIds: [...decision.completionEvidenceIds],
    verificationEvidenceIds: [...decision.verificationEvidenceIds],
    changeHistory: decision.changeHistory.map((item) => ({ ...item }))
  }));
}

function decisionStateContextForStore(
  state: EventStoreState,
  record?: Pick<DecisionRecord, 'stateContext'>
): DecisionRecord['stateContext'] {
  if (state.stateContext.stateLayer === 'scenario') return 'scenario';
  if (record && record.stateContext !== 'scenario') return record.stateContext;
  return state.stateContext.dataSource === 'temporary-demo' ? 'temporary-demo' : 'baseline';
}

function nextDecisionId(records: DecisionRecord[]): DecisionId {
  const used = new Set(records.map((record) => record.decisionId));
  let index = records.length + 1;
  while (used.has(`DECISION-${String(index).padStart(3, '0')}`)) index += 1;
  return `DECISION-${String(index).padStart(3, '0')}`;
}

function cloneDecisionUpdate(update: DecisionUpdate, record: DecisionRecord): DecisionRecord {
  return {
    ...record,
    ...update,
    stateContext: record.stateContext,
    relationships: update.relationships
      ? update.relationships.map((relation) => ({ ...relation, stateContext: record.stateContext }))
      : record.relationships.map((relation) => ({ ...relation })),
    evidence: update.evidence ? update.evidence.map((item) => ({ ...item })) : record.evidence.map((item) => ({ ...item })),
    assumptions: [...record.assumptions],
    constraints: [...record.constraints],
    availableOptions: update.availableOptions
      ? update.availableOptions.map((item) => ({ ...item, risks: [...item.risks] }))
      : record.availableOptions.map((item) => ({ ...item, risks: [...item.risks] })),
    rejectedOptions: update.rejectedOptions ? [...update.rejectedOptions] : [...record.rejectedOptions],
    expectedImpact: { ...record.expectedImpact, dimensions: { ...record.expectedImpact.dimensions } },
    actualImpact: update.actualImpact
      ? { ...update.actualImpact, dimensions: { ...update.actualImpact.dimensions } }
      : record.actualImpact
        ? { ...record.actualImpact, dimensions: { ...record.actualImpact.dimensions } }
        : null,
    completionEvidenceIds: update.completionEvidenceIds ? [...update.completionEvidenceIds] : [...record.completionEvidenceIds],
    verificationEvidenceIds: update.verificationEvidenceIds ? [...update.verificationEvidenceIds] : [...record.verificationEvidenceIds],
    changeHistory: [...record.changeHistory]
  };
}

interface DecisionUpdateResult {
  updates: { decisions: DecisionRecord[]; baselineDecisions: DecisionRecord[] } | null;
  errorMessage: string | null;
}

function applyDecisionUpdate(
  state: EventStoreState,
  decisionId: DecisionId,
  update: DecisionUpdate
): DecisionUpdateResult {
  const current = state.decisions.find((decision) => decision.decisionId === decisionId);
  if (!current) return { updates: null, errorMessage: 'تعذر العثور على القرار المحدد.' };
  if (state.activeRuntime && (
    current.eventId !== state.activeRuntime.identity.eventInstanceId
    || current.venueId !== state.activeRuntime.identity.venueId
  )) {
    return { updates: null, errorMessage: 'حُجب التعديل لأن القرار لا ينتمي إلى نطاق الفعالية والموقع النشطين.' };
  }
  const nextStatus = update.status ?? current.status;
  const nextRecord = cloneDecisionUpdate(update, current);
  nextRecord.stateContext = decisionStateContextForStore(state, current);
  nextRecord.relationships = nextRecord.relationships.map((relation) => ({
    ...relation,
    decisionId: nextRecord.decisionId,
    stateContext: nextRecord.stateContext
  }));
  nextRecord.revision = current.revision + 1;
  nextRecord.changeReason = update.changeReason?.trim() || 'تحديث محلي للقرار.';
  nextRecord.changeHistory = [
    ...current.changeHistory.map((item) => ({ ...item })),
    {
      revision: nextRecord.revision,
      status: nextRecord.status,
      changedAt: new Date().toISOString(),
      changedBy: 'المستخدم المحلي',
      changeReason: nextRecord.changeReason
    }
  ];
  const transitionIssues = getDecisionTransitionIssues(current, nextStatus, nextRecord);
  if (transitionIssues.length > 0) return { updates: null, errorMessage: transitionIssues[0]!.messageAr };
  const validationIssues = validateDecisionRecord(nextRecord, {
    knownEntityIds: Object.keys(state.entities) as SpatialEntityId[],
    targetStateContext: nextRecord.stateContext
  }).filter((currentIssue) => currentIssue.severity === 'error');
  if (validationIssues.length > 0) return { updates: null, errorMessage: validationIssues[0]!.messageAr };
  const decisions = state.decisions.map((decision) => decision.decisionId === decisionId ? nextRecord : decision);
  const baselineDecisions = state.stateContext.stateLayer === 'baseline'
    ? state.baselineDecisions.map((decision) => decision.decisionId === decisionId ? cloneDecisionsWithContext([nextRecord])[0]! : decision)
    : state.baselineDecisions;
  return { updates: { decisions, baselineDecisions }, errorMessage: null };
}

function applyReadinessUpdate(
  state: EventStoreState,
  zoneId: SpatialEntityId,
  update: ZoneReadinessUpdate
): { zoneReadiness: ZoneReadinessRecord[]; baselineZoneReadiness: ZoneReadinessRecord[]; entities: SpatialEntityRecord; baselineEntities: SpatialEntityRecord } | null {
  const record = state.zoneReadiness.find((candidate) => candidate.zoneId === zoneId);
  if (!record) {
    return null;
  }

  const nextRecord: ZoneReadinessRecord = {
    ...record,
    ...update,
    stateContext: readinessStateContextForStore(state, record),
    updatedAt: state.stateContext.stateLayer === 'scenario' ? record.updatedAt : new Date().toISOString(),
    updatedBy: state.stateContext.stateLayer === 'scenario' ? record.updatedBy : 'المستخدم المحلي',
    revision: record.revision + 1,
    evidence: update.evidence ? update.evidence.map((evidence) => ({ ...evidence })) : record.evidence.map((evidence) => ({ ...evidence })),
    blockers: update.blockers ? update.blockers.map((blocker) => ({ ...blocker })) : record.blockers.map((blocker) => ({ ...blocker })),
    dependencies: [...record.dependencies],
    relatedRouteIds: [...record.relatedRouteIds],
    operationalImpact: { ...record.operationalImpact }
  };
  const knownZoneIds = state.zoneReadiness.map((candidate) => candidate.zoneId);
  const validationIssues = validateZoneReadinessRecord(nextRecord, knownZoneIds, {
    targetStateContext: readinessStateContextForStore(state, record)
  }).filter((validationIssue) => validationIssue.severity === 'error');
  if (validationIssues.length > 0) {
    return null;
  }

  const zoneReadiness = state.zoneReadiness.map((candidate) => (candidate.zoneId === zoneId ? nextRecord : candidate));
  const baselineZoneReadiness: ZoneReadinessRecord[] =
    state.stateContext.stateLayer === 'baseline'
      ? state.baselineZoneReadiness.map((candidate): ZoneReadinessRecord =>
          candidate.zoneId === zoneId ? { ...nextRecord, stateContext: nextRecord.stateContext } : candidate
        )
      : state.baselineZoneReadiness;
  const entities = {
    ...state.entities,
    [zoneId]: state.entities[zoneId] ? { ...state.entities[zoneId], readiness: nextRecord.readiness } : state.entities[zoneId]
  };
  const baselineEntities =
    state.stateContext.stateLayer === 'baseline'
      ? {
          ...state.baselineEntities,
          [zoneId]: state.baselineEntities[zoneId]
            ? { ...state.baselineEntities[zoneId], readiness: nextRecord.readiness }
            : state.baselineEntities[zoneId]
        }
      : state.baselineEntities;

  return { zoneReadiness, baselineZoneReadiness, entities, baselineEntities };
}

function createRouteVisibility(routes: RouteDefinition[]): RouteVisibility {
  return routes.reduce<RouteVisibility>((visibility, route) => {
    visibility[route.id] = route.defaultVisible;
    return visibility;
  }, {} as RouteVisibility);
}

function normalizeRuntimeRouteVisibility(value: RouteVisibility, routes: RouteDefinition[]): RouteVisibility {
  const defaults = createRouteVisibility(routes);
  return routes.reduce<RouteVisibility>((visibility, route) => {
    visibility[route.id] = typeof value[route.id] === 'boolean' ? value[route.id]! : defaults[route.id]!;
    return visibility;
  }, {} as RouteVisibility);
}

export function selectRuntimeRoutes(state: Pick<EventStoreState, 'activeRuntime' | 'activeProjectId' | 'activeProjectUsesLocalDemo'>): RouteDefinition[] {
  if (state.activeProjectId && !state.activeProjectUsesLocalDemo) return state.activeRuntime?.routes ?? emptyRuntimeRoutes;
  return state.activeRuntime?.routes ?? defaultRouteDefinitions;
}

export function selectRuntimeScenarios(state: Pick<EventStoreState, 'activeRuntime' | 'activeProjectId' | 'activeProjectUsesLocalDemo'>): ScenarioDefinition[] {
  if (!state.activeRuntime) return state.activeProjectId && !state.activeProjectUsesLocalDemo ? emptyRuntimeScenarios : fallbackScenarioDefinitions;
  return getScenarioPlayerPackConfiguration(state.activeRuntime.operationalPackConfiguration)?.scenarios ?? [];
}

export function selectRuntimeScenarioConfiguration(state: Pick<EventStoreState, 'activeRuntime'>) {
  return state.activeRuntime
    ? getScenarioPlayerPackConfiguration(state.activeRuntime.operationalPackConfiguration)
    : null;
}

export function isOperationalPackEnabled(
  state: Pick<EventStoreState, 'activeRuntime' | 'activeProjectId' | 'activeProjectUsesLocalDemo'>,
  packId: string
): boolean {
  return state.activeProjectId && !state.activeRuntime && !state.activeProjectUsesLocalDemo
    ? false
    : !state.activeRuntime
    || state.activeRuntime.enabledOperationalPacks.some((pack) => pack.packId === packId);
}

function isRuntimeRouteId(state: Pick<EventStoreState, 'activeRuntime' | 'activeProjectId' | 'activeProjectUsesLocalDemo'>, routeId: RouteId): boolean {
  return selectRuntimeRoutes(state).some((route) => route.id === routeId);
}

function createPackageSessionSnapshot(state: EventStoreState): EventStorePackageSessionSnapshot {
  const scenario = state.stateContext.stateLayer === 'scenario';
  return {
    entities: structuredClone(scenario ? state.baselineEntities : state.entities),
    baselineEntities: structuredClone(state.baselineEntities),
    zoneReadiness: cloneReadinessWithContext(scenario ? state.baselineZoneReadiness : state.zoneReadiness),
    baselineZoneReadiness: cloneReadinessWithContext(state.baselineZoneReadiness),
    decisions: cloneDecisionsWithContext(scenario ? state.baselineDecisions : state.decisions),
    baselineDecisions: cloneDecisionsWithContext(state.baselineDecisions),
    stateContext: { ...state.stateContext, stateLayer: 'baseline' },
    selectedEntityId: state.selectedEntityId,
    selectedDecisionId: state.selectedDecisionId,
    routeVisibility: { ...state.routeVisibility },
    projectionSettings: { ...state.projectionSettings }
  };
}

function createRuntimeSession(state: EventStoreState): EventStoreRuntimeSession | null {
  if (!state.activeRuntime) return null;
  const scenario = state.stateContext.stateLayer === 'scenario';
  return {
    runtime: structuredClone(state.activeRuntime),
    entities: structuredClone(scenario ? state.baselineEntities : state.entities),
    baselineEntities: structuredClone(state.baselineEntities),
    zoneReadiness: cloneReadinessWithContext(scenario ? state.baselineZoneReadiness : state.zoneReadiness),
    baselineZoneReadiness: cloneReadinessWithContext(state.baselineZoneReadiness),
    decisions: cloneDecisionsWithContext(scenario ? state.baselineDecisions : state.decisions),
    baselineDecisions: cloneDecisionsWithContext(state.baselineDecisions),
    stateContext: { ...state.stateContext, stateLayer: 'baseline' },
    selectedEntityId: state.selectedEntityId,
    selectedDecisionId: state.selectedDecisionId,
    routeVisibility: { ...state.routeVisibility },
    projectionSettings: { ...state.projectionSettings }
  };
}

function activationEntry(
  state: Pick<EventStoreState, 'activationHistory'>,
  runtime: EventRuntimeConfiguration | null,
  outcome: EventPackageActivationHistoryEntry['outcome'],
  reasonAr: string
): EventPackageActivationHistoryEntry {
  const nextSequence = state.activationHistory.reduce((maximum, entry) => {
    const sequence = Number(entry.activationId.replace('ACTIVATION-', ''));
    return Number.isFinite(sequence) ? Math.max(maximum, sequence) : maximum;
  }, 0) + 1;
  return {
    activationId: `ACTIVATION-${String(nextSequence).padStart(3, '0')}`,
    packageId: runtime?.identity.packageId ?? 'PACKAGE-NONE',
    packageContentHash: runtime?.identity.packageContentHash ?? '',
    activatedAt: new Date().toISOString(),
    activatedBy: 'local-demo-operator',
    outcome,
    reasonAr
  };
}

function runtimeActivationError(runtime: EventRuntimeConfiguration): string | null {
  const knownEntityIds = new Set(Object.keys(runtime.entities));
  const healthIssue = verifyEventRuntimeHealth(runtime).find((currentIssue) => currentIssue.severity === 'blocking');
  if (healthIssue) return healthIssue.messageAr;
  if (runtime.captureFixtures.some((record) => record.stateContext !== 'temporary-demo')) {
    return 'تحتوي حزمة الالتقاط على سجل خارج سياق البيانات التجريبية المؤقتة.';
  }
  const invalidDecision = runtime.decisions.some((record) =>
    record.eventId !== runtime.identity.eventInstanceId
    || record.venueId !== runtime.identity.venueId
    || record.relationships.some((relation) =>
      !knownEntityIds.has(relation.entityId)
      || relation.stateContext !== record.stateContext
    )
  );
  return invalidDecision ? 'تحتوي الحزمة على قرار أو علاقة خارج نطاق الفعالية النشطة.' : null;
}

function runtimeProjectionSettings(runtime: EventRuntimeConfiguration): ProjectionSettings {
  const profile = runtime.projectionProfiles[0];
  return profile
    ? {
        ...defaultProjectionSettings,
        labelsVisible: profile.labelsVisible,
        routesVisible: profile.routesVisible,
        statusColorsVisible: profile.statusColorsVisible
      }
    : { ...defaultProjectionSettings };
}

type EditableEntityState = Partial<Pick<SpatialEntity, 'status' | 'readiness' | 'riskLevel'>>;

function applyEntityStateUpdate(
  state: EventStoreState,
  entityId: SpatialEntityId,
  update: EditableEntityState
): Pick<EventStoreState, 'entities' | 'baselineEntities'> {
  const entity = state.entities[entityId];
  const baselineEntity = state.baselineEntities[entityId] ?? entity;
  const nextEntities: SpatialEntityRecord = {
    ...state.entities,
    [entityId]: { ...entity, ...update }
  };

  return {
    entities: nextEntities,
    baselineEntities:
      state.stateContext.stateLayer === 'baseline'
        ? { ...state.baselineEntities, [entityId]: { ...baselineEntity, ...update } }
        : state.baselineEntities
  };
}

function applyScenarioStepToState(state: EventStoreState, step: ScenarioStep): EventStoreState {
  const nextEntities: SpatialEntityRecord = { ...state.entities };

  step.changes?.forEach((change) => {
    const entity = nextEntities[change.entityId];
    if (!entity) {
      return;
    }

    nextEntities[change.entityId] = {
      ...entity,
      status: change.status ?? entity.status,
      readiness: change.readiness === undefined ? entity.readiness : clampReadiness(change.readiness),
      riskLevel: change.riskLevel ?? entity.riskLevel
    };
  });

  const routes = selectRuntimeRoutes(state);
  const nextRouteVisibility = normalizeRuntimeRouteVisibility(state.routeVisibility, routes);
  step.showRoutes?.forEach((routeId) => {
    if (isRuntimeRouteId(state, routeId)) {
      nextRouteVisibility[routeId] = true;
    }
  });
  step.hideRoutes?.forEach((routeId) => {
    if (isRuntimeRouteId(state, routeId)) {
      nextRouteVisibility[routeId] = false;
    }
  });

  const selectedEntityId = step.focusEntityId && nextEntities[step.focusEntityId] ? step.focusEntityId : state.selectedEntityId;
  const highlightedEntityIds = Array.from(
    new Set((step.highlightEntityIds ?? []).filter((entityId) => Boolean(nextEntities[entityId])))
  );

  return {
    ...state,
    entities: nextEntities,
    stateContext: { ...state.stateContext, stateLayer: 'scenario' },
    routeVisibility: nextRouteVisibility,
    selectedEntityId,
    scenarioRuntime: {
      ...state.scenarioRuntime,
      messageAr: step.messageAr,
      highlightedEntityIds,
      lastAppliedStepId: step.id
    },
    lastSavedAt: markSaved()
  };
}

export const useEventStore = create<EventStore>()(
  persist(
    (set, get) => ({
      ...createInitialEventStoreState(),
      clearProjectScopedState: (projectId, eventId) =>
        set((state) => ({
          activeProjectId: projectId,
          activeProjectEventId: eventId,
          activeProjectUsesLocalDemo: false,
          entities: {},
          baselineEntities: {},
          zoneReadiness: [],
          baselineZoneReadiness: [],
          decisions: [],
          baselineDecisions: [],
          stateContext: { dataSource: 'temporary-demo', stateLayer: 'baseline' },
          selectedEntityId: null,
          selectedDecisionId: null,
          routeVisibility: {},
          activeRuntime: null,
          previousRuntimeSession: null,
          packageSessionSnapshot: null,
          projectionSettings: { ...defaultProjectionSettings },
          scenarioRuntime: createIdleScenarioRuntime(),
          isProjectionMode: false,
          projectionCleanMode: false,
          viewMode: 'operator',
          cameraResetNonce: state.cameraResetNonce + 1,
          errorMessage: null
        })),
      activateLocalDemoProjectScope: (projectId, eventId, snapshot) =>
        set((state) => {
          const initial = createInitialEventStoreState();
          const source = snapshot?.entities['ZONE-001'] ? snapshot : initial;
          return {
            ...initial,
            activeProjectId: projectId,
            activeProjectEventId: eventId,
            activeProjectUsesLocalDemo: true,
            entities: structuredClone(source.entities),
            baselineEntities: structuredClone(source.baselineEntities),
            zoneReadiness: cloneReadinessWithContext(source.zoneReadiness),
            baselineZoneReadiness: cloneReadinessWithContext(source.baselineZoneReadiness),
            decisions: cloneDecisionsWithContext(source.decisions),
            baselineDecisions: cloneDecisionsWithContext(source.baselineDecisions),
            stateContext: { ...source.stateContext, stateLayer: 'baseline' },
            selectedEntityId: source.selectedEntityId,
            selectedDecisionId: source.selectedDecisionId,
            routeVisibility: { ...source.routeVisibility },
            projectionSettings: { ...source.projectionSettings },
            cameraResetNonce: state.cameraResetNonce + 1,
            lastSavedAt: source.lastSavedAt,
            decisionRecovery: structuredClone(source.decisionRecovery)
          };
        }),
      selectEntity: (entityId) =>
        set((state) => {
          if (entityId !== null && !state.entities[entityId]) {
            return { errorMessage: 'تعذر العثور على العنصر المحدد.' };
          }

          return { selectedEntityId: entityId, errorMessage: null };
        }),
      updateEntityStatus: (entityId, status) =>
        set((state) => {
          const entity = state.entities[entityId];
          if (!entity || !isOperationalStatus(status)) {
            return { errorMessage: 'تعذر تحديث الحالة لأن العنصر غير موجود.' };
          }

          return {
            ...applyEntityStateUpdate(state, entityId, { status }),
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        }),
      updateEntityReadiness: (entityId, readiness) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'zone-readiness')) {
            return { errorMessage: 'حزمة جاهزية المناطق غير مفعلة في تهيئة الفعالية الحالية.' };
          }
          const entity = state.entities[entityId];
          if (!entity) {
            return { errorMessage: 'تعذر تحديث الجاهزية لأن العنصر غير موجود.' };
          }

          const readinessUpdate = applyReadinessUpdate(state, entityId, {
            readiness: clampReadiness(readiness),
            changeReason: 'تحديث محلي من لوحة العنصر.'
          });
          if (readinessUpdate) {
            return {
              ...readinessUpdate,
              lastSavedAt: markSaved(),
              errorMessage: null
            };
          }

          return {
            ...applyEntityStateUpdate(state, entityId, { readiness: clampReadiness(readiness) }),
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        }),
      updateZoneReadiness: (zoneId, update) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'zone-readiness')) {
            return { errorMessage: 'حزمة جاهزية المناطق غير مفعلة في تهيئة الفعالية الحالية.' };
          }
          const result = applyReadinessUpdate(state, zoneId, update);
          if (!result) {
            const currentRecord = state.zoneReadiness.find((record) => record.zoneId === zoneId);
            if (update.approvalStatus === 'approved' && !(update.evidence ?? currentRecord?.evidence ?? []).length) {
              return { errorMessage: 'لا يمكن اعتماد المنطقة قبل استكمال الدليل المنظم.' };
            }
            return { errorMessage: currentRecord ? 'تعذر حفظ التعديل؛ راجع الحقول المطلوبة في عقد الجاهزية.' : 'تعذر العثور على سجل جاهزية المنطقة.' };
          }

          return { ...result, lastSavedAt: markSaved(), errorMessage: null };
        }),
      selectDecision: (decisionId) =>
        set((state) => {
          if (decisionId !== null && !state.decisions.some((decision) => decision.decisionId === decisionId)) {
            return { errorMessage: 'تعذر العثور على القرار المحدد.' };
          }
          return { selectedDecisionId: decisionId, errorMessage: null };
        }),
      createDecisionDraft: (input) => {
        let createdId: DecisionId | null = null;
        set((state) => {
          if (!isOperationalPackEnabled(state, 'decision-engine')) {
            return { errorMessage: 'محرك القرارات غير مفعّل في تهيئة الفعالية الحالية.' };
          }
          const invalidRelationship = input.relationships.find((relationship) => !state.entities[relationship.entityId]);
          if (invalidRelationship) {
            return { errorMessage: 'حُجبت المسودة لأن علاقة مكانية تشير إلى عنصر غير معروف أو خارج الفعالية النشطة.' };
          }
          const decisionId = nextDecisionId(state.decisions);
          const now = new Date().toISOString();
          const recordStateContext = decisionStateContextForStore(state);
          const nextDecision: DecisionRecord = {
            decisionId,
            title: input.title.trim(),
            description: input.description.trim(),
            eventId: state.activeRuntime?.identity.eventInstanceId ?? fallbackRuntimeIdentity.eventId,
            venueId: state.activeRuntime?.identity.venueId ?? fallbackRuntimeIdentity.venueId,
            relationships: input.relationships.map((relationship, index) => ({
              ...relationship,
              relationId: `RELATION-${decisionId.replace('DECISION-', '')}-${String(index + 1).padStart(2, '0')}`,
              decisionId,
              source: 'المستخدم المحلي',
              confidence: 'low',
              stateContext: recordStateContext
            })),
            stateContext: recordStateContext,
            source: 'المستخدم المحلي',
            sourceType: 'manual-update',
            createdAt: now,
            createdBy: 'المستخدم المحلي',
            decisionOwner: input.decisionOwner.trim(),
            responsibleParty: input.responsibleParty.trim(),
            approvingAuthority: 'جهة اعتماد لم تحدد في البيانات المحلية',
            problemStatement: input.description.trim(),
            decisionType: input.decisionType,
            urgency: 'medium',
            priority: 0,
            confidence: 'low',
            evidence: [],
            assumptions: ['هذه مسودة محلية للتحقق وليست قراراً تشغيلياً نافذاً.'],
            constraints: ['لا يوجد Backend أو سجل تدقيق خارجي في هذه المرحلة.'],
            availableOptions: [{ optionId: 'OPTION-DRAFT', titleAr: 'استكمال المراجعة', descriptionAr: 'استكمال المصدر والدليل قبل الاعتماد.', expectedImpact: 'تقليل غموض القرار.', risks: ['قد يتأخر الإجراء حتى اكتمال البيانات.'] }],
            selectedOption: null,
            rejectedOptions: [],
            approvalStatus: 'draft',
            approvedBy: null,
            approvedAt: null,
            approvalComments: '',
            actionRequired: 'استكمال بيانات القرار ومراجعته.',
            assignedTo: null,
            dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            escalationLevel: 'watch',
            status: 'draft',
            expectedImpact: { level: 'medium', summaryAr: 'الأثر المتوقع يحتاج تقييماً قبل الاعتماد.', dimensions: { operational: 'medium' } },
            actualImpact: null,
            outcomeStatus: 'not-started',
            completionEvidenceIds: [],
            completionNote: '',
            verifiedBy: null,
            verifiedAt: null,
            verificationEvidenceIds: [],
            closedBy: null,
            closedAt: null,
            closureReason: '',
            lessonsLearned: '',
            revision: 1,
            changeReason: 'إنشاء مسودة قرار محلية.',
            changeHistory: [{ revision: 1, status: 'draft', changedAt: now, changedBy: 'المستخدم المحلي', changeReason: 'إنشاء مسودة قرار محلية.' }]
          };
          const validationIssues = validateDecisionRecord(nextDecision, {
            knownEntityIds: Object.keys(state.entities) as SpatialEntityId[],
            targetStateContext: recordStateContext
          }).filter((currentIssue) => currentIssue.severity === 'error');
          if (validationIssues.length > 0) {
            return { errorMessage: validationIssues[0]!.messageAr };
          }
          createdId = decisionId;
          return {
            decisions: [...state.decisions, nextDecision],
            baselineDecisions: state.stateContext.stateLayer === 'baseline' ? [...state.baselineDecisions, cloneDecisionsWithContext([nextDecision])[0]!] : state.baselineDecisions,
            selectedDecisionId: decisionId,
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        });
        return createdId;
      },
      createRehearsalDecisionDraft: (input) => {
        let createdId: DecisionId | null = null;
        set((state) => {
          if (state.activeProjectId !== input.projectId || state.activeProjectEventId !== input.eventId) {
            return { errorMessage: 'حُجبت مسودة البروفة لأنها لا تطابق المشروع والفعالية النشطين.' };
          }
          if (!input.title.trim() || !input.description.trim() || !Number.isFinite(Date.parse(input.createdAt))) {
            return { errorMessage: 'مسودة قرار البروفة تحتاج عنوانًا ووصفًا ووقتًا محليًا صالحًا.' };
          }
          const decisionId = nextDecisionId(state.decisions);
          const relatedSpatialIds = [...new Set(input.relatedSpatialObjectIds.filter(isDecisionSpatialEntityId))];
          if (!relatedSpatialIds.length) {
            return { errorMessage: 'حُجبت مسودة البروفة لعدم وجود علاقة مكانية صريحة متوافقة مع عقد القرار.' };
          }
          const context = [
            `تشغيل البروفة: ${input.runId}`,
            `اليوم: ${input.eventDayId}`,
            `اللحظة: ${input.momentId}`,
            `منظور الشخصية: ${input.personaVariantId}`,
            `خطوة الرحلة: ${input.journeyStepId ?? 'غير متاحة'}`,
            `العناصر المكانية المرشحة: ${input.relatedSpatialObjectIds.join(', ') || 'لا توجد'}`,
            `تتبعات المصدر: ${input.sourceTraceIds.join(', ') || 'لا توجد'}`
          ];
          const nextDecision: DecisionRecord = {
            decisionId,
            title: input.title.trim(),
            description: input.description.trim(),
            eventId: input.eventId,
            venueId: input.venueId,
            relationships: relatedSpatialIds.map((entityId, index) => ({
              relationId: `RELATION-${decisionId.replace('DECISION-', '')}-REHEARSAL-${String(index + 1).padStart(2, '0')}`,
              decisionId,
              entityId,
              relationType: 'affected',
              impactLevel: 'low',
              descriptionAr: 'علاقة مكانية مرشحة مصدرها سياق البروفة الرقمية فقط.',
              source: 'البروفة الرقمية المحلية المرشحة',
              confidence: 'low',
              stateContext: 'scenario'
            })),
            stateContext: 'scenario',
            source: 'البروفة الرقمية المحلية المرشحة',
            sourceType: 'exercise',
            createdAt: input.createdAt,
            createdBy: 'جلسة بروفة محلية غير موثقة',
            decisionOwner: 'غير معيّن',
            responsibleParty: 'غير معيّن',
            approvingAuthority: 'جهة الاعتماد غير معيّنة',
            problemStatement: input.description.trim(),
            decisionType: 'visitor-experience',
            urgency: 'medium',
            priority: 0,
            confidence: 'low',
            evidence: [],
            assumptions: ['هذه مسودة ناتجة من بروفة مرشحة ولا تغيّر الجاهزية أو القرار أو الخط الأساسي.', ...context],
            constraints: ['لا اعتماد ولا دليل متحقق ولا تنفيذ تلقائي.', 'هوية الجلسة والوقت محليان وغير موثوقين تشغيليًا.'],
            availableOptions: [{ optionId: 'OPTION-REHEARSAL-REVIEW', titleAr: 'استكمال المراجعة', descriptionAr: 'إحالة المسألة إلى مسار القرار المحكوم مع المصدر والسلطة والدليل.', expectedImpact: 'توضيح المسألة دون تنفيذها.', risks: ['تبقى المسألة بلا حسم حتى ورود سلطة ودليل صالحين.'] }],
            selectedOption: null,
            rejectedOptions: [],
            approvalStatus: 'draft',
            approvedBy: null,
            approvedAt: null,
            approvalComments: '',
            actionRequired: 'مراجعة المسودة داخل محرك القرار قبل أي اعتماد.',
            assignedTo: null,
            dueAt: input.createdAt,
            escalationLevel: 'watch',
            status: 'draft',
            expectedImpact: { level: 'low', summaryAr: 'الأثر مرشح وغير مقيم؛ القيمة التقنية لا تمثل قياسًا تشغيليًا.', dimensions: {} },
            actualImpact: null,
            outcomeStatus: 'not-started',
            completionEvidenceIds: [],
            completionNote: '',
            verifiedBy: null,
            verifiedAt: null,
            verificationEvidenceIds: [],
            closedBy: null,
            closedAt: null,
            closureReason: '',
            lessonsLearned: '',
            revision: 1,
            changeReason: 'إنشاء مسودة قرار من بروفة رقمية مرشحة.',
            changeHistory: [{ revision: 1, status: 'draft', changedAt: input.createdAt, changedBy: 'جلسة بروفة محلية غير موثقة', changeReason: 'إنشاء مسودة قرار من بروفة رقمية مرشحة.' }]
          };
          const validationIssues = validateDecisionRecord(nextDecision, { targetStateContext: 'scenario' })
            .filter((currentIssue) => currentIssue.severity === 'error');
          if (validationIssues.length) return { errorMessage: validationIssues[0]!.messageAr };
          createdId = decisionId;
          return {
            decisions: [...state.decisions, nextDecision],
            selectedDecisionId: decisionId,
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        });
        return createdId;
      },
      updateDecision: (decisionId, update) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'decision-engine')) {
            return { errorMessage: 'محرك القرارات غير مفعّل في تهيئة الفعالية الحالية.' };
          }
          const result = applyDecisionUpdate(state, decisionId, update);
          if (!result.updates) return { errorMessage: result.errorMessage ?? 'تعذر حفظ القرار.' };
          return { ...result.updates, lastSavedAt: markSaved(), errorMessage: null };
        }),
      approveDecision: (decisionId, approvalComments) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'decision-engine')) {
            return { errorMessage: 'محرك القرارات غير مفعّل في تهيئة الفعالية الحالية.' };
          }
          const record = state.decisions.find((decision) => decision.decisionId === decisionId);
          if (!record) return { errorMessage: 'تعذر العثور على القرار المحدد.' };
          const result = applyDecisionUpdate(state, decisionId, {
            status: 'approved',
            approvalStatus: 'approved',
            approvedBy: 'المستخدم المحلي',
            approvedAt: new Date().toISOString(),
            approvalComments,
            changeReason: 'اعتماد محلي للتحقق فقط.'
          });
          if (!result.updates) return { errorMessage: result.errorMessage ?? 'لا يمكن اعتماد القرار قبل استكمال متطلباته.' };
          return { ...result.updates, lastSavedAt: markSaved(), errorMessage: null };
        }),
      transitionDecision: (decisionId, status) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'decision-engine')) {
            return { errorMessage: 'محرك القرارات غير مفعّل في تهيئة الفعالية الحالية.' };
          }
          const result = applyDecisionUpdate(state, decisionId, { status, changeReason: `انتقال محلي إلى ${status}.` });
          if (!result.updates) return { errorMessage: result.errorMessage ?? 'انتقال القرار غير مسموح أو يحتاج بيانات إضافية.' };
          return { ...result.updates, lastSavedAt: markSaved(), errorMessage: null };
        }),
      updateEntityRiskLevel: (entityId, riskLevel) =>
        set((state) => {
          const entity = state.entities[entityId];
          if (!entity || !isRiskLevel(riskLevel)) {
            return { errorMessage: 'تعذر تحديث مستوى المخاطر لأن العنصر غير موجود.' };
          }

          return {
            ...applyEntityStateUpdate(state, entityId, { riskLevel }),
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        }),
      setRouteVisible: (routeId, visible) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'spatial-foundation')) {
            return { errorMessage: 'عرض المسارات غير مفعّل في حزمة الفعالية الحالية.' };
          }
          if (!isRuntimeRouteId(state, routeId) || typeof visible !== 'boolean') {
            return { errorMessage: 'تعذر تحديث المسار المحدد.' };
          }

          return {
            routeVisibility: { ...normalizeRuntimeRouteVisibility(state.routeVisibility, selectRuntimeRoutes(state)), [routeId]: visible },
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        }),
      toggleRoute: (routeId) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'spatial-foundation')) {
            return { errorMessage: 'عرض المسارات غير مفعّل في حزمة الفعالية الحالية.' };
          }
          if (!isRuntimeRouteId(state, routeId)) {
            return { errorMessage: 'تعذر تحديث المسار المحدد.' };
          }

          const routeVisibility = normalizeRuntimeRouteVisibility(state.routeVisibility, selectRuntimeRoutes(state));
          return {
            routeVisibility: { ...routeVisibility, [routeId]: !routeVisibility[routeId] },
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        }),
      setViewMode: (viewMode) =>
        set((state) => {
          const nextViewMode = isViewMode(viewMode) ? viewMode : state.viewMode;
          if (nextViewMode === 'projection' && !isOperationalPackEnabled(state, 'projection-preview')) {
            return { errorMessage: 'معاينة الإسقاط غير مفعلة في حزمة الفعالية الحالية.' };
          }
          return {
            viewMode: nextViewMode,
            isProjectionMode: nextViewMode === 'projection',
            projectionCleanMode: nextViewMode === 'projection' ? state.projectionCleanMode : false,
            errorMessage: isViewMode(viewMode) ? null : 'تعذر تغيير نمط العرض.'
          };
        }),
      resetCamera: () => set((state) => ({ cameraResetNonce: state.cameraResetNonce + 1 })),
      enterProjectionMode: () =>
        set((state) => isOperationalPackEnabled(state, 'projection-preview')
          ? { isProjectionMode: true, projectionCleanMode: false, viewMode: 'projection', errorMessage: null }
          : { errorMessage: 'معاينة الإسقاط غير مفعلة في حزمة الفعالية الحالية.' }),
      exitProjectionMode: () =>
        set({ isProjectionMode: false, projectionCleanMode: false, viewMode: 'operator', errorMessage: null }),
      enterProjectionCleanMode: () =>
        set((state) => isOperationalPackEnabled(state, 'projection-preview')
          ? { isProjectionMode: true, projectionCleanMode: true, viewMode: 'projection', errorMessage: null }
          : { errorMessage: 'معاينة الإسقاط غير مفعلة في حزمة الفعالية الحالية.' }),
      exitProjectionCleanMode: () => set({ projectionCleanMode: false }),
      setProjectionPreset: (presetId) =>
        set((state) => {
          if (!isOperationalPackEnabled(state, 'projection-preview')) {
            return { errorMessage: 'معاينة الإسقاط غير مفعلة في حزمة الفعالية الحالية.' };
          }
          const preset = getProjectionPreset(presetId);

          return {
            projectionSettings: {
              ...state.projectionSettings,
              presetId: preset.id,
              labelsVisible: preset.labelsVisible,
              routesVisible: preset.routesVisible,
              statusColorsVisible: preset.statusColorsVisible
            },
            viewMode: 'projection',
            isProjectionMode: true,
            projectionCleanMode: false,
            lastSavedAt: markSaved(),
            errorMessage: null
          };
        }),
      updateProjectionSettings: (settings) =>
        set((state) => isOperationalPackEnabled(state, 'projection-preview')
          ? {
              projectionSettings: normalizeProjectionSettings({ ...state.projectionSettings, ...settings }, state.projectionSettings),
              lastSavedAt: markSaved(),
              errorMessage: null
            }
          : { errorMessage: 'معاينة الإسقاط غير مفعلة في حزمة الفعالية الحالية.' }),
      startScenario: (scenarioId) =>
        set((state) => {
          const scenarios = selectRuntimeScenarios(state);
          if (!isOperationalPackEnabled(state, 'scenario-player')) {
            return { errorMessage: 'مشغل التمرين غير مفعّل في حزمة الفعالية الحالية.' };
          }
          if (!isScenarioId(scenarioId, scenarios)) {
            return { errorMessage: 'تعذر تشغيل السيناريو المحدد أو أنه لا ينتمي إلى الفعالية النشطة.' };
          }

          const scenario = getScenarioById(scenarioId, scenarios);
          const runtime = createScenarioRuntime(scenario);
          const firstStep = scenario.steps[0];
          const baseState: EventStoreState = {
            ...state,
            entities: { ...state.baselineEntities },
            zoneReadiness: cloneReadinessWithContext(state.baselineZoneReadiness, 'scenario'),
            decisions: cloneDecisionsWithContext(state.baselineDecisions, 'scenario'),
            stateContext: { ...state.stateContext, stateLayer: 'scenario' },
            scenarioRuntime: runtime,
            errorMessage: null
          };

          return firstStep ? applyScenarioStepToState(baseState, firstStep) : baseState;
        }),
      pauseScenario: () =>
        set((state) => {
          const runtime = normalizeScenarioRuntime(state.scenarioRuntime, selectRuntimeScenarios(state));
          return {
            scenarioRuntime: runtime.playback === 'playing' ? { ...runtime, playback: 'paused' } : runtime
          };
        }),
      resumeScenario: () =>
        set((state) => {
          const runtime = normalizeScenarioRuntime(state.scenarioRuntime, selectRuntimeScenarios(state));
          return {
            scenarioRuntime: runtime.playback === 'paused' ? { ...runtime, playback: 'playing' } : runtime
          };
        }),
      advanceScenario: () =>
        set((state) => {
          const scenarios = selectRuntimeScenarios(state);
          const runtime = normalizeScenarioRuntime(state.scenarioRuntime, scenarios);
          if (runtime.playback !== 'playing' && runtime.playback !== 'paused') {
            return { scenarioRuntime: runtime };
          }

          const scenario = getScenarioById(runtime.scenarioId!, scenarios);
          const currentIndex = normalizeScenarioStepIndex(scenario, runtime.stepIndex);
          const nextIndex = currentIndex + 1;

          if (nextIndex >= scenario.steps.length) {
            return {
              scenarioRuntime: {
                ...runtime,
                stepIndex: currentIndex,
                playback: 'completed',
                progress: 100,
                messageAr: 'اكتمل السيناريو التشغيلي.'
              }
            };
          }

          const step = scenario.steps[nextIndex];
          if (!step) {
            return {
              scenarioRuntime: {
                ...state.scenarioRuntime,
                playback: 'completed',
                progress: 100,
                messageAr: 'اكتمل السيناريو التشغيلي.'
              }
            };
          }
          const nextState: EventStoreState = {
            ...state,
            scenarioRuntime: {
              ...runtime,
              stepIndex: nextIndex,
              playback: 'playing',
              progress: getScenarioProgress(scenario, nextIndex)
            }
          };

          return applyScenarioStepToState(nextState, step);
        }),
      stopScenario: () =>
        set((state) => ({
          entities: { ...state.baselineEntities },
          zoneReadiness: cloneReadinessWithContext(state.baselineZoneReadiness),
          decisions: cloneDecisionsWithContext(state.baselineDecisions),
          stateContext: { ...state.stateContext, stateLayer: 'baseline' },
          scenarioRuntime: createIdleScenarioRuntime(),
          routeVisibility: createRouteVisibility(selectRuntimeRoutes(state)),
          selectedEntityId:
            state.selectedEntityId && state.baselineEntities[state.selectedEntityId]
              ? state.selectedEntityId
              : (Object.values(state.baselineEntities).find((entity) => entity.type === 'zone')?.id ?? null),
          lastSavedAt: markSaved(),
          errorMessage: null
        })),
      resetScenario: () =>
        set((state) => ({
          ...state,
          entities: { ...state.baselineEntities },
          zoneReadiness: cloneReadinessWithContext(state.baselineZoneReadiness),
          decisions: cloneDecisionsWithContext(state.baselineDecisions),
          stateContext: { ...state.stateContext, stateLayer: 'baseline' },
          routeVisibility: createRouteVisibility(selectRuntimeRoutes(state)),
          scenarioRuntime: createIdleScenarioRuntime(),
          selectedEntityId: Object.values(state.baselineEntities).find((entity) => entity.type === 'zone')?.id ?? null,
          lastSavedAt: markSaved(),
          errorMessage: null
        })),
      activateTemporaryEventRuntime: (runtime, reasonAr = 'تفعيل محلي مؤقت بعد نجاح التحقق الكامل.', projectScope) => {
        const current = get();
        const requiredEventId = projectScope?.eventId ?? (current.activeProjectId ? current.activeProjectEventId : null);
        if (requiredEventId && runtime.identity.eventInstanceId !== requiredEventId) {
          set({ errorMessage: 'حُجب Runtime لأن فعاليته لا تطابق سياق المشروع المطلوب.' });
          return false;
        }
        if (projectScope && current.activeProjectId && current.activeProjectId !== projectScope.projectId) {
          set({ errorMessage: 'حُجب Runtime لأن المشروع المطلوب لا يطابق سياق المشروع النشط.' });
          return false;
        }
        const activationError = runtimeActivationError(runtime);
        if (activationError) {
          const entry = activationEntry(current, runtime, 'blocked', 'فشل فحص صحة التشغيل؛ بقيت الحزمة الحالية دون تغيير.');
          set({
            activationHistory: [entry, ...current.activationHistory].slice(0, 20),
            errorMessage: activationError
          });
          return false;
        }
        const activeRuntime = structuredClone(runtime);
        const entities = structuredClone(activeRuntime.entities);
        const zoneReadiness = cloneReadinessWithContext(activeRuntime.readinessRecords, 'temporary-demo');
        const decisions = cloneDecisionsWithContext(activeRuntime.decisions, 'temporary-demo');
        const selectedEntityId = Object.values(entities).find((entity) => entity.type === 'zone')?.id
          ?? Object.values(entities).find((entity) => entity.type !== 'site' && entity.type !== 'route')?.id
          ?? null;
        const entry = activationEntry(current, activeRuntime, 'activated', reasonAr);
        set({
          activeProjectId: projectScope?.projectId ?? current.activeProjectId,
          activeProjectEventId: projectScope?.eventId ?? runtime.identity.eventInstanceId,
          activeProjectUsesLocalDemo: false,
          entities,
          baselineEntities: structuredClone(entities),
          zoneReadiness,
          baselineZoneReadiness: cloneReadinessWithContext(zoneReadiness),
          decisions,
          baselineDecisions: cloneDecisionsWithContext(decisions),
          stateContext: { dataSource: 'temporary-demo', stateLayer: 'baseline' },
          selectedEntityId,
          selectedDecisionId: decisions[0]?.decisionId ?? null,
          routeVisibility: createRouteVisibility(activeRuntime.routes),
          activeRuntime,
          previousRuntimeSession: createRuntimeSession(current),
          activationHistory: [entry, ...current.activationHistory].slice(0, 20),
          packageSessionSnapshot: current.packageSessionSnapshot ?? createPackageSessionSnapshot(current),
          projectionSettings: runtimeProjectionSettings(activeRuntime),
          scenarioRuntime: createIdleScenarioRuntime(),
          isProjectionMode: false,
          projectionCleanMode: false,
          viewMode: 'operator',
          cameraResetNonce: current.cameraResetNonce + 1,
          lastSavedAt: current.lastSavedAt,
          errorMessage: null
        });
        return true;
      },
      rollbackTemporaryEventRuntime: () => {
        const current = get();
        const previous = current.previousRuntimeSession;
        if (!previous) {
          const entry = activationEntry(current, current.activeRuntime, 'blocked', 'لا توجد حزمة سابقة متاحة للتراجع المحلي.');
          set({
            activationHistory: [entry, ...current.activationHistory].slice(0, 20),
            errorMessage: 'لا توجد حزمة سابقة متاحة للتراجع المحلي.'
          });
          return false;
        }
        if (current.activeProjectId && current.activeProjectEventId && previous.runtime.identity.eventInstanceId !== current.activeProjectEventId) {
          const entry = activationEntry(current, previous.runtime, 'blocked', 'حُجب التراجع لأن الحزمة السابقة لا تنتمي إلى فعالية المشروع النشط.');
          set({
            activationHistory: [entry, ...current.activationHistory].slice(0, 20),
            errorMessage: 'حُجب التراجع لأن الحزمة السابقة لا تنتمي إلى فعالية المشروع النشط.'
          });
          return false;
        }
        const displaced = createRuntimeSession(current);
        const entry = activationEntry(current, previous.runtime, 'rolled-back', 'أعيدت جلسة الحزمة السابقة كاملة من دون تعديل خط الأساس المحفوظ.');
        set({
          activeRuntime: structuredClone(previous.runtime),
          previousRuntimeSession: displaced,
          entities: structuredClone(previous.entities),
          baselineEntities: structuredClone(previous.baselineEntities),
          zoneReadiness: cloneReadinessWithContext(previous.zoneReadiness),
          baselineZoneReadiness: cloneReadinessWithContext(previous.baselineZoneReadiness),
          decisions: cloneDecisionsWithContext(previous.decisions),
          baselineDecisions: cloneDecisionsWithContext(previous.baselineDecisions),
          stateContext: { ...previous.stateContext, stateLayer: 'baseline' },
          selectedEntityId: previous.selectedEntityId && previous.entities[previous.selectedEntityId]
            ? previous.selectedEntityId
            : Object.values(previous.entities).find((entity) => entity.type === 'zone')?.id ?? null,
          selectedDecisionId: previous.selectedDecisionId && previous.decisions.some((decision) => decision.decisionId === previous.selectedDecisionId)
            ? previous.selectedDecisionId
            : previous.decisions[0]?.decisionId ?? null,
          routeVisibility: normalizeRuntimeRouteVisibility(previous.routeVisibility, previous.runtime.routes),
          projectionSettings: { ...previous.projectionSettings },
          activationHistory: [entry, ...current.activationHistory].slice(0, 20),
          scenarioRuntime: createIdleScenarioRuntime(),
          isProjectionMode: false,
          projectionCleanMode: false,
          viewMode: 'operator',
          cameraResetNonce: current.cameraResetNonce + 1,
          errorMessage: null
        });
        return true;
      },
      deactivateTemporaryEventRuntime: () => {
        const current = get();
        if (current.activeProjectId) {
          set({ errorMessage: 'لا يمكن إزالة Runtime مستقلًا عن المشروع النشط؛ عد إلى محفظة المشاريع أو بدّل المشروع.' });
          return;
        }
        const snapshot = current.packageSessionSnapshot;
        if (!snapshot) {
          set({ activeProjectId: null, activeProjectEventId: null, activeProjectUsesLocalDemo: false, activeRuntime: null, previousRuntimeSession: null, scenarioRuntime: createIdleScenarioRuntime() });
          return;
        }
        const entry = activationEntry(current, current.activeRuntime, 'reset', 'أزيلت الحزمة المؤقتة وأعيدت جلسة العرض المحلية السابقة.');
        set({
          activeProjectId: null,
          activeProjectEventId: null,
          activeProjectUsesLocalDemo: false,
          entities: structuredClone(snapshot.entities),
          baselineEntities: structuredClone(snapshot.baselineEntities),
          zoneReadiness: cloneReadinessWithContext(snapshot.zoneReadiness),
          baselineZoneReadiness: cloneReadinessWithContext(snapshot.baselineZoneReadiness),
          decisions: cloneDecisionsWithContext(snapshot.decisions),
          baselineDecisions: cloneDecisionsWithContext(snapshot.baselineDecisions),
          stateContext: { ...snapshot.stateContext, stateLayer: 'baseline' },
          selectedEntityId: snapshot.selectedEntityId,
          selectedDecisionId: snapshot.selectedDecisionId,
          routeVisibility: { ...snapshot.routeVisibility },
          projectionSettings: { ...snapshot.projectionSettings },
          activeRuntime: null,
          previousRuntimeSession: null,
          packageSessionSnapshot: null,
          activationHistory: [entry, ...current.activationHistory].slice(0, 20),
          scenarioRuntime: createIdleScenarioRuntime(),
          isProjectionMode: false,
          projectionCleanMode: false,
          viewMode: 'operator',
          cameraResetNonce: current.cameraResetNonce + 1,
          errorMessage: null
        });
      },
      resetDemoData: () => {
        const current = get();
        if (current.activeProjectId) {
          const initial = createInitialEventStoreState();
          const sourceEntities = current.activeProjectUsesLocalDemo
            ? initial.entities
            : current.activeRuntime?.entities ?? current.baselineEntities;
          const sourceReadiness = current.activeProjectUsesLocalDemo
            ? initial.zoneReadiness
            : current.activeRuntime?.readinessRecords ?? current.baselineZoneReadiness;
          const sourceDecisions = current.activeProjectUsesLocalDemo
            ? initial.decisions
            : current.activeRuntime?.decisions ?? current.baselineDecisions;
          set({
            entities: structuredClone(sourceEntities),
            baselineEntities: structuredClone(sourceEntities),
            zoneReadiness: cloneReadinessWithContext(sourceReadiness),
            baselineZoneReadiness: cloneReadinessWithContext(sourceReadiness),
            decisions: cloneDecisionsWithContext(sourceDecisions),
            baselineDecisions: cloneDecisionsWithContext(sourceDecisions),
            stateContext: { ...current.stateContext, stateLayer: 'baseline' },
            selectedEntityId: Object.values(sourceEntities).find((entity) => entity.type === 'zone')?.id ?? null,
            selectedDecisionId: sourceDecisions[0]?.decisionId ?? null,
            routeVisibility: createRouteVisibility(selectRuntimeRoutes(current)),
            scenarioRuntime: createIdleScenarioRuntime(),
            isProjectionMode: false,
            projectionCleanMode: false,
            viewMode: 'operator',
            cameraResetNonce: current.cameraResetNonce + 1,
            lastSavedAt: markSaved(),
            errorMessage: null
          });
          return;
        }
        safeRemoveLocalStorageItem(localStorageKeys.eventStore);
        set({
          ...createInitialEventStoreState(),
          lastSavedAt: markSaved()
        });
      },
      clearError: () => set({ errorMessage: null })
    }),
    {
      name: localStorageKeys.eventStore,
      version: EVENT_STORE_PERSISTENCE_VERSION,
      storage: createJSONStorage(() => getSafeLocalStorage()),
      migrate: (persistedState, version) => markMigratedPersistence(
        normalizePersistedEventState(persistedState, createInitialEventStoreState(), version)
      ),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(isMarkedMigratedPersistence(persistedState)
          ? persistedState
          : normalizePersistedEventState(persistedState, currentState))
      }),
      partialize: (state) => ({
        // Scenario overlays are transient; only the baseline is restored after reload.
        entities: state.packageSessionSnapshot
          ? state.packageSessionSnapshot.entities
          : state.stateContext.stateLayer === 'scenario' ? state.baselineEntities : state.entities,
        baselineEntities: state.packageSessionSnapshot?.baselineEntities ?? state.baselineEntities,
        zoneReadiness:
          state.packageSessionSnapshot
            ? state.packageSessionSnapshot.zoneReadiness
            : state.stateContext.stateLayer === 'scenario'
            ? cloneReadinessWithContext(state.baselineZoneReadiness, 'baseline')
            : state.zoneReadiness,
        baselineZoneReadiness: state.packageSessionSnapshot?.baselineZoneReadiness ?? state.baselineZoneReadiness,
        decisions:
          state.packageSessionSnapshot
            ? state.packageSessionSnapshot.decisions
            : state.stateContext.stateLayer === 'scenario'
            ? cloneDecisionsWithContext(state.baselineDecisions)
            : state.decisions,
        baselineDecisions: state.packageSessionSnapshot?.baselineDecisions ?? state.baselineDecisions,
        stateContext: state.packageSessionSnapshot?.stateContext ?? { ...state.stateContext, stateLayer: 'baseline' },
        selectedEntityId: state.packageSessionSnapshot?.selectedEntityId ?? state.selectedEntityId,
        selectedDecisionId: state.packageSessionSnapshot?.selectedDecisionId ?? state.selectedDecisionId,
        routeVisibility: state.packageSessionSnapshot?.routeVisibility ?? state.routeVisibility,
        projectionSettings: state.packageSessionSnapshot?.projectionSettings ?? state.projectionSettings,
        lastSavedAt: state.lastSavedAt
      })
    }
  )
);
