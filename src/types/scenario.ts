import type { OperationalStatus, RiskLevel } from './status';
import type { RouteId, SpatialEntityId } from './spatial';

export type ScenarioId = string;

export interface ScenarioEntityChange {
  entityId: SpatialEntityId;
  status?: OperationalStatus;
  readiness?: number;
  riskLevel?: RiskLevel;
}

export interface ScenarioStep {
  id: string;
  titleAr: string;
  messageAr: string;
  durationMs: number;
  focusEntityId?: SpatialEntityId;
  highlightEntityIds?: SpatialEntityId[];
  showRoutes?: RouteId[];
  hideRoutes?: RouteId[];
  changes?: ScenarioEntityChange[];
}

export interface ScenarioDefinition {
  id: ScenarioId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  steps: ScenarioStep[];
}

export interface ScenarioPlayerPackConfiguration {
  schemaVersion: '1.0.0';
  stateContext: 'temporary-demo';
  defaultScenarioId: ScenarioId;
  scenarios: ScenarioDefinition[];
}

export type ScenarioPlaybackState = 'idle' | 'playing' | 'paused' | 'completed';

export interface ScenarioRuntime {
  scenarioId: ScenarioId | null;
  stepIndex: number;
  playback: ScenarioPlaybackState;
  messageAr: string;
  highlightedEntityIds: SpatialEntityId[];
  progress: number;
  lastAppliedStepId: string | null;
}
