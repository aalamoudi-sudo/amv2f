import type {
  EventPackageValidationIssue,
  OperationalPackConfiguration
} from '../types/eventPackage';
import type {
  ScenarioDefinition,
  ScenarioPlayerPackConfiguration
} from '../types/scenario';
import type { RouteDefinition } from '../types/routes';
import type { SpatialEntityId } from '../types/spatial';

function blocking(code: string, path: string, messageAr: string): EventPackageValidationIssue {
  return { code, path, messageAr, severity: 'blocking' };
}

export function getScenarioPlayerPackConfiguration(
  configuration: OperationalPackConfiguration
): ScenarioPlayerPackConfiguration | null {
  return configuration.configurationByPackId['scenario-player']?.scenarioPlayer ?? null;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => seen.has(value) ? duplicates.add(value) : seen.add(value));
  return [...duplicates];
}

function scenarioProducesObservableChange(scenario: ScenarioDefinition): boolean {
  return scenario.steps.some((step) =>
    Boolean(step.changes?.length || step.showRoutes?.length || step.hideRoutes?.length)
  );
}

export function validateScenarioPlayerConfiguration(
  operationalPacks: OperationalPackConfiguration,
  entityIds: Iterable<SpatialEntityId>,
  routes: RouteDefinition[]
): EventPackageValidationIssue[] {
  const issues: EventPackageValidationIssue[] = [];
  const enabled = operationalPacks.enabledPackIds.includes('scenario-player');
  const configuration = getScenarioPlayerPackConfiguration(operationalPacks);
  const path = '$.operationalPackConfiguration.configurationByPackId.scenario-player.scenarioPlayer';

  if (!enabled && configuration) {
    issues.push(blocking(
      'disabled-scenario-pack-configured',
      path,
      'تهيئة مشغل التمرين موجودة بينما الحزمة التشغيلية غير مفعلة.'
    ));
    return issues;
  }
  if (!enabled) return issues;
  if (!configuration || configuration.scenarios.length === 0) {
    issues.push(blocking(
      'missing-scenario-player-configuration',
      path,
      'الحزمة المفعلة لمشغل التمرين تحتاج إلى سيناريو صالح واحد على الأقل.'
    ));
    return issues;
  }
  if (configuration.stateContext !== 'temporary-demo') {
    issues.push(blocking(
      'scenario-context-mismatch',
      `${path}.stateContext`,
      'سيناريوهات الحزمة المحلية يجب أن تبقى في سياق البيانات التجريبية المؤقتة.'
    ));
  }

  const knownEntityIds = new Set(entityIds);
  const knownRouteIds = new Set(routes.map((route) => route.id));
  const scenarioIds = configuration.scenarios.map((scenario) => scenario.id);
  duplicateValues(scenarioIds).forEach((scenarioId) => issues.push(blocking(
    'duplicate-scenario-id',
    `${path}.scenarios.${scenarioId}`,
    `معرّف السيناريو ${scenarioId} مكرر داخل الحزمة.`
  )));
  if (!scenarioIds.includes(configuration.defaultScenarioId)) {
    issues.push(blocking(
      'unknown-default-scenario',
      `${path}.defaultScenarioId`,
      'السيناريو الافتراضي لا يشير إلى تعريف موجود في الحزمة.'
    ));
  }

  configuration.scenarios.forEach((scenario, scenarioIndex) => {
    const scenarioPath = `${path}.scenarios[${scenarioIndex}]`;
    if (!scenarioProducesObservableChange(scenario)) {
      issues.push(blocking(
        'scenario-without-observable-change',
        `${scenarioPath}.steps`,
        `السيناريو ${scenario.nameAr} لا يغيّر حالة عنصر أو ظهور مسار، لذلك لا يمكن تشغيله كتمرين قابل للملاحظة.`
      ));
    }
    duplicateValues(scenario.steps.map((step) => step.id)).forEach((stepId) => issues.push(blocking(
      'duplicate-scenario-step-id',
      `${scenarioPath}.steps.${stepId}`,
      `معرّف الخطوة ${stepId} مكرر في السيناريو ${scenario.nameAr}.`
    )));
    scenario.steps.forEach((step, stepIndex) => {
      const stepPath = `${scenarioPath}.steps[${stepIndex}]`;
      const references = [
        ...(step.focusEntityId ? [step.focusEntityId] : []),
        ...(step.highlightEntityIds ?? []),
        ...(step.changes ?? []).map((change) => change.entityId)
      ];
      references.forEach((entityId) => {
        if (!knownEntityIds.has(entityId)) issues.push(blocking(
          'scenario-unknown-entity',
          stepPath,
          `خطوة السيناريو تشير إلى العنصر المكاني غير المعروف ${entityId}.`
        ));
      });
      [...(step.showRoutes ?? []), ...(step.hideRoutes ?? [])].forEach((routeId) => {
        if (!knownRouteIds.has(routeId)) issues.push(blocking(
          'scenario-unknown-route',
          stepPath,
          `خطوة السيناريو تشير إلى المسار غير المعروف ${routeId}.`
        ));
      });
    });
  });
  return issues;
}
