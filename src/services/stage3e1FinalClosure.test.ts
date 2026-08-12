import { beforeEach, describe, expect, it } from 'vitest';
import { loadReferenceEventPackages } from '../data/referenceEventPackages';
import { createInitialEventStoreState, useEventStore } from '../store/useEventStore';
import type {
  EventPackage,
  EventRuntimeConfiguration,
  IntegrationProfileDefinition
} from '../types/eventPackage';
import { withEventPackageContentHash } from './eventPackageHash';
import { validateEventPackage, validateEventPackageCollection } from './eventPackageValidation';
import { createRuntimeIntegrationLabConfiguration } from './runtimeIntegrationLabConfiguration';
import { getScenarioPlayerPackConfiguration } from './scenarioPackValidation';

async function referencePackage(index = 0): Promise<EventPackage> {
  const packages = await loadReferenceEventPackages();
  return structuredClone(packages[index]!);
}

async function validRuntime(index = 0): Promise<EventRuntimeConfiguration> {
  const result = await validateEventPackage(await referencePackage(index));
  expect(result.valid, result.issues.map((currentIssue) => currentIssue.messageAr).join('\n')).toBe(true);
  return structuredClone(result.runtime!);
}

function additionalProfile(
  source: IntegrationProfileDefinition,
  patch: Partial<IntegrationProfileDefinition>
): IntegrationProfileDefinition {
  return {
    ...structuredClone(source),
    integrationProfileId: 'integration-final-closure-negative',
    titleAr: 'ملف تكامل اختباري غير قابل للتنفيذ',
    titleEn: 'Non-executable final closure profile',
    ...patch
  };
}

async function packageWithDependency(
  eventPackage: EventPackage,
  dependency: EventPackage,
  versionRange = '^1.0.0'
): Promise<EventPackage> {
  const candidate = structuredClone(eventPackage);
  candidate.dependencies = [{ packageId: dependency.packageId, versionRange }];
  return withEventPackageContentHash(candidate);
}

async function semanticInvalidPackage(eventPackage: EventPackage): Promise<EventPackage> {
  const candidate = structuredClone(eventPackage);
  candidate.eventInstance.venueId = 'VENUE-UNKNOWN-FINAL-CLOSURE';
  return withEventPackageContentHash(candidate);
}

async function expectActivationBlocked(
  mutate: (runtime: EventRuntimeConfiguration) => void,
  expectedArabic: string
) {
  const runtime = await validRuntime();
  mutate(runtime);
  expect(useEventStore.getState().activateTemporaryEventRuntime(runtime)).toBe(false);
  expect(useEventStore.getState().activeRuntime).toBeNull();
  expect(useEventStore.getState().errorMessage).toContain(expectedArabic);
}

describe('Stage 3E.1 final closure: enabled adapter executability', () => {
  it('rejects one valid enabled profile plus one unknown enabled profile', async () => {
    const candidate = await referencePackage();
    candidate.integrationProfileConfiguration.push(additionalProfile(candidate.integrationProfileConfiguration[0]!, {
      adapterId: 'adapter-unknown-enabled'
    }));
    const result = await validateEventPackage(await withEventPackageContentHash(candidate));
    expect(result.valid).toBe(false);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toContain('enabled-input-profile-not-executable');
  });

  it('rejects an enabled profile with the wrong adapter version', async () => {
    const candidate = await referencePackage();
    candidate.integrationProfileConfiguration[0]!.adapterVersion = '9.9.9-local';
    const result = await validateEventPackage(await withEventPackageContentHash(candidate));
    expect(result.valid).toBe(false);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toContain('enabled-input-profile-not-executable');
  });

  it('rejects an enabled bidirectional profile without executable input support', async () => {
    const candidate = await referencePackage();
    candidate.integrationProfileConfiguration.push(additionalProfile(candidate.integrationProfileConfiguration[0]!, {
      direction: 'bidirectional',
      adapterId: 'adapter-bidirectional-without-input'
    }));
    const result = await validateEventPackage(await withEventPackageContentHash(candidate));
    expect(result.valid).toBe(false);
    expect(result.issues.map((currentIssue) => currentIssue.code)).toContain('enabled-input-profile-not-executable');
  });

  it('allows an unknown disabled integration profile as inert metadata', async () => {
    const candidate = await referencePackage();
    candidate.integrationProfileConfiguration.push(additionalProfile(candidate.integrationProfileConfiguration[0]!, {
      enabled: false,
      adapterId: 'adapter-unknown-disabled'
    }));
    const result = await validateEventPackage(await withEventPackageContentHash(candidate));
    expect(result.valid, result.issues.map((currentIssue) => currentIssue.messageAr).join('\n')).toBe(true);
  });

  it('constructs the Integration Lab configuration from every accepted runtime without throwing', async () => {
    const packages = await loadReferenceEventPackages();
    for (const eventPackage of packages) {
      const result = await validateEventPackage(eventPackage);
      expect(result.valid).toBe(true);
      expect(() => createRuntimeIntegrationLabConfiguration(result.runtime!)).not.toThrow();
    }
  });

  it('blocks activation when an accepted runtime is later given a non-executable enabled profile', async () => {
    const runtime = await validRuntime();
    runtime.integrationProfiles.push(additionalProfile(runtime.integrationProfiles[0]!, {
      adapterId: 'adapter-runtime-mutation'
    }));
    expect(useEventStore.getState().activateTemporaryEventRuntime(runtime)).toBe(false);
    expect(useEventStore.getState().errorMessage).toContain('تهيئة ملفات التكامل');
  });
});

describe('Stage 3E.1 final closure: canonical scenario source', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useEventStore.setState(createInitialEventStoreState());
  });

  it('blocks a canonical scenario definition changed after validation', async () => {
    await expectActivationBlocked((runtime) => {
      getScenarioPlayerPackConfiguration(runtime.operationalPackConfiguration)!.scenarios[0]!.descriptionAr += ' تعديل غير متحقق.';
    }, 'لا تطابق التهيئة القانونية');
  });

  it('blocks an injected legacy derived scenario representation', async () => {
    await expectActivationBlocked((runtime) => {
      (runtime as EventRuntimeConfiguration & { scenarioPlayer?: unknown }).scenarioPlayer = structuredClone(
        getScenarioPlayerPackConfiguration(runtime.operationalPackConfiguration)
      );
    }, 'تمثيلاً قديماً مستقلاً');
  });

  it('blocks a changed default scenario ID', async () => {
    await expectActivationBlocked((runtime) => {
      getScenarioPlayerPackConfiguration(runtime.operationalPackConfiguration)!.defaultScenarioId = 'scenario-unknown-default';
    }, 'لا تطابق التهيئة القانونية');
  });

  it('blocks a dangling scenario entity reference', async () => {
    await expectActivationBlocked((runtime) => {
      getScenarioPlayerPackConfiguration(runtime.operationalPackConfiguration)!.scenarios[0]!.steps[0]!.focusEntityId = 'ZONE-UNKNOWN';
    }, 'لا تطابق التهيئة القانونية');
  });

  it('blocks a dangling scenario route reference', async () => {
    await expectActivationBlocked((runtime) => {
      getScenarioPlayerPackConfiguration(runtime.operationalPackConfiguration)!.scenarios[0]!.steps[0]!.showRoutes = ['ROUTE-UNKNOWN'];
    }, 'لا تطابق التهيئة القانونية');
  });

  it('blocks a scenario state-context change', async () => {
    await expectActivationBlocked((runtime) => {
      getScenarioPlayerPackConfiguration(runtime.operationalPackConfiguration)!.stateContext = 'baseline' as 'temporary-demo';
    }, 'لا تطابق التهيئة القانونية');
  });
});

describe('Stage 3E.1 final closure: dependency invalidity propagation', () => {
  it('keeps A and its valid dependency B valid', async () => {
    const [a, b] = await loadReferenceEventPackages();
    const results = await validateEventPackageCollection([await packageWithDependency(a!, b!), b!]);
    expect(results.get(0)?.valid).toBe(true);
    expect(results.get(1)?.valid).toBe(true);
  });

  it('invalidates A when schema-invalid B is present in the collection', async () => {
    const [a, b] = await loadReferenceEventPackages();
    const dependent = await packageWithDependency(a!, b!);
    const invalidDependency = structuredClone(b!) as unknown as Record<string, unknown>;
    delete invalidDependency.eventInstance;
    const results = await validateEventPackageCollection([dependent, invalidDependency]);
    expect(results.get(0)?.valid).toBe(false);
    expect(results.get(0)?.issues.map((currentIssue) => currentIssue.code)).toContain('invalid-required-package-dependency');
    expect(results.get(1)?.issues.map((currentIssue) => currentIssue.code)).toContain('event-package-schema-invalid');
  });

  it('invalidates A when schema-valid B is semantically invalid and preserves B root cause', async () => {
    const [a, b] = await loadReferenceEventPackages();
    const invalidDependency = await semanticInvalidPackage(b!);
    const results = await validateEventPackageCollection([await packageWithDependency(a!, invalidDependency), invalidDependency]);
    expect(results.get(0)?.issues.map((currentIssue) => currentIssue.code)).toContain('invalid-required-package-dependency');
    expect(results.get(1)?.issues.map((currentIssue) => currentIssue.code)).toContain('unknown-venue');
  });

  it('propagates invalid C through B to A', async () => {
    const [a, b, c] = await loadReferenceEventPackages();
    const invalidC = await semanticInvalidPackage(c!);
    const dependentB = await packageWithDependency(b!, invalidC);
    const dependentA = await packageWithDependency(a!, dependentB);
    const results = await validateEventPackageCollection([dependentA, dependentB, invalidC]);
    expect(results.get(0)?.issues.map((currentIssue) => currentIssue.code)).toContain('invalid-required-package-dependency');
    expect(results.get(1)?.issues.map((currentIssue) => currentIssue.code)).toContain('invalid-required-package-dependency');
    expect(results.get(2)?.issues.map((currentIssue) => currentIssue.code)).toContain('unknown-venue');
  });

  it('invalidates every package participating in a dependency cycle', async () => {
    const [aSource, bSource] = await loadReferenceEventPackages();
    const a = structuredClone(aSource!);
    const b = structuredClone(bSource!);
    a.dependencies = [{ packageId: b.packageId, versionRange: '^1.0.0' }];
    b.dependencies = [{ packageId: a.packageId, versionRange: '^1.0.0' }];
    const results = await validateEventPackageCollection([
      await withEventPackageContentHash(a),
      await withEventPackageContentHash(b)
    ]);
    expect(results.get(0)?.valid).toBe(false);
    expect(results.get(1)?.valid).toBe(false);
    expect(results.get(0)?.issues.map((currentIssue) => currentIssue.code)).toContain('package-dependency-cycle');
    expect(results.get(1)?.issues.map((currentIssue) => currentIssue.code)).toContain('package-dependency-cycle');
  });

  it('rejects a dependency version mismatch without invalidating the dependency', async () => {
    const [a, b] = await loadReferenceEventPackages();
    const results = await validateEventPackageCollection([await packageWithDependency(a!, b!, '^2.0.0'), b!]);
    expect(results.get(0)?.issues.map((currentIssue) => currentIssue.code)).toContain('package-dependency-version-mismatch');
    expect(results.get(1)?.valid).toBe(true);
  });

  it('keeps an independent valid package valid when another dependency graph fails', async () => {
    const [a, b, independent] = await loadReferenceEventPackages();
    const invalidDependency = await semanticInvalidPackage(b!);
    const results = await validateEventPackageCollection([
      await packageWithDependency(a!, invalidDependency),
      invalidDependency,
      independent!
    ]);
    expect(results.get(0)?.valid).toBe(false);
    expect(results.get(1)?.valid).toBe(false);
    expect(results.get(2)?.valid).toBe(true);
  });
});
