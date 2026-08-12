import { scenarioDefinitions } from '../data/scenarios';
import type { ScenarioDefinition, ScenarioId, ScenarioPlaybackState, ScenarioRuntime, ScenarioStep } from '../types/scenario';
import type { SpatialEntityId } from '../types/spatial';

const spatialEntityPrefixes = ['SITE-', 'ZONE-', 'HALL-', 'GATE-', 'ROUTE-', 'STAGE-', 'PARK-', 'SERVICE-', 'ASSEMBLY-', 'ASSET-'];

export function isScenarioId(value: unknown, scenarios: ScenarioDefinition[] = scenarioDefinitions): value is ScenarioId {
  return typeof value === 'string' && scenarios.some((scenario) => scenario.id === value);
}

export function isScenarioPlaybackState(value: unknown): value is ScenarioPlaybackState {
  return value === 'idle' || value === 'playing' || value === 'paused' || value === 'completed';
}

export function getScenarioById(
  id: ScenarioDefinition['id'],
  scenarios: ScenarioDefinition[] = scenarioDefinitions
): ScenarioDefinition {
  const scenario = scenarios.find((candidate) => candidate.id === id) ?? scenarios[0];
  if (!scenario) throw new Error('لا توجد سيناريوهات مهيأة في سياق التشغيل الحالي.');
  return scenario;
}

export function findScenarioById(
  id: unknown,
  scenarios: ScenarioDefinition[] = scenarioDefinitions
): ScenarioDefinition | undefined {
  return isScenarioId(id, scenarios) ? getScenarioById(id, scenarios) : undefined;
}

export function normalizeScenarioStepIndex(scenario: ScenarioDefinition, stepIndex: number): number {
  if (scenario.steps.length === 0 || !Number.isFinite(stepIndex)) {
    return 0;
  }

  return Math.min(scenario.steps.length - 1, Math.max(0, Math.trunc(stepIndex)));
}

export function getScenarioStep(scenario: ScenarioDefinition, stepIndex: number): ScenarioStep | undefined {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= scenario.steps.length) {
    return undefined;
  }

  return scenario.steps[stepIndex];
}

export function getScenarioProgress(scenario: ScenarioDefinition, stepIndex: number): number {
  if (scenario.steps.length === 0) {
    return 0;
  }

  const normalizedStepIndex = normalizeScenarioStepIndex(scenario, stepIndex);
  return Math.min(100, Math.max(0, Math.round(((normalizedStepIndex + 1) / scenario.steps.length) * 100)));
}

export function createIdleScenarioRuntime(): ScenarioRuntime {
  return {
    scenarioId: null,
    stepIndex: 0,
    playback: 'idle',
    messageAr: 'لا يوجد سيناريو نشط حالياً.',
    highlightedEntityIds: [],
    progress: 0,
    lastAppliedStepId: null
  };
}

export function createScenarioRuntime(scenario: ScenarioDefinition): ScenarioRuntime {
  const firstStep = scenario.steps[0];

  if (!firstStep) {
    return {
      scenarioId: scenario.id,
      stepIndex: 0,
      playback: 'completed',
      messageAr: scenario.descriptionAr,
      highlightedEntityIds: [],
      progress: 0,
      lastAppliedStepId: null
    };
  }

  return {
    scenarioId: scenario.id,
    stepIndex: 0,
    playback: 'playing',
    messageAr: firstStep?.messageAr ?? scenario.descriptionAr,
    highlightedEntityIds: firstStep?.highlightEntityIds ?? [],
    progress: getScenarioProgress(scenario, 0),
    lastAppliedStepId: firstStep?.id ?? null
  };
}

export function getNextScenarioIndex(scenario: ScenarioDefinition, currentIndex: number): number | null {
  if (scenario.steps.length === 0) {
    return null;
  }

  const nextIndex = normalizeScenarioStepIndex(scenario, currentIndex) + 1;
  return nextIndex < scenario.steps.length ? nextIndex : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSpatialEntityId(value: unknown): value is SpatialEntityId {
  return typeof value === 'string' && spatialEntityPrefixes.some((prefix) => value.startsWith(prefix) && value.length > prefix.length);
}

export function normalizeScenarioRuntime(
  value: unknown,
  scenarios: ScenarioDefinition[] = scenarioDefinitions
): ScenarioRuntime {
  if (!isRecord(value)) {
    return createIdleScenarioRuntime();
  }

  const scenario = findScenarioById(value.scenarioId, scenarios);
  if (!scenario) {
    return createIdleScenarioRuntime();
  }

  const stepIndex = normalizeScenarioStepIndex(scenario, typeof value.stepIndex === 'number' ? value.stepIndex : 0);
  const step = getScenarioStep(scenario, stepIndex);
  const playback = isScenarioPlaybackState(value.playback) ? value.playback : 'idle';

  return {
    scenarioId: scenario.id,
    stepIndex,
    playback,
    messageAr: typeof value.messageAr === 'string' ? value.messageAr : step?.messageAr ?? scenario.descriptionAr,
    highlightedEntityIds: Array.isArray(value.highlightedEntityIds)
      ? value.highlightedEntityIds.filter(isSpatialEntityId)
      : step?.highlightEntityIds ?? [],
    progress: playback === 'completed' ? 100 : playback === 'idle' ? 0 : getScenarioProgress(scenario, stepIndex),
    lastAppliedStepId: typeof value.lastAppliedStepId === 'string' ? value.lastAppliedStepId : step?.id ?? null
  };
}
