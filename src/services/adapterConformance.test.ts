import { describe, expect, it } from 'vitest';
import { defaultIntegrationLabConfiguration } from '../data/integrationLabConfigurations';
import { EvidenceResolver } from './evidenceResolver';
import { manifestConformanceSummary, runInputAdapterConformance, runReferenceAdapterConformanceMatrix } from './adapterConformance';
import { buildCanonicalStateProjection, createProjectionOutputs } from './canonicalStateProjection';

async function emptyOutputs() {
  const configuration = defaultIntegrationLabConfiguration;
  const projection = await buildCanonicalStateProjection([], 'temporary-demo', {
    ...configuration.projectionProfile,
    entityLabels: configuration.labels,
    requirements: configuration.requirements
  });
  return createProjectionOutputs(projection, 1, {
    ...configuration.physicalOutputProfile,
    routeIdsByEntity: configuration.routeMappings
  });
}

describe('vendor-neutral adapter conformance harness', () => {
  it('runs all ten reference adapters through their applicable end-to-end suites', async () => {
    const configuration = defaultIntegrationLabConfiguration;
    const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    const evidenceResolver = new EvidenceResolver(configuration.evidenceFixtures, knownEntityIds);
    const reports = await runReferenceAdapterConformanceMatrix(configuration, await emptyOutputs(), evidenceResolver);
    expect(reports).toHaveLength(10);
    expect(reports.every((report) => report.passed)).toBe(true);
    expect(reports.map((report) => report.adapterId)).toEqual(expect.arrayContaining([
      'adapter-system-work-order',
      'adapter-schedule-status',
      'adapter-sensor-observation',
      'adapter-reality-capture',
      'adapter-governed-human-action',
      'adapter-workflow-result',
      'adapter-spatial-2d-output',
      'adapter-spatial-3d-output',
      'adapter-geospatial-preview',
      'adapter-physical-output-preview'
    ]));
  });

  it('requires each input adapter to create resolvable provenance instead of host injection', async () => {
    const configuration = defaultIntegrationLabConfiguration;
    const adapter = configuration.inputAdapters[0]!;
    const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    const evidenceResolver = new EvidenceResolver(configuration.evidenceFixtures, knownEntityIds);
    const report = await runInputAdapterConformance(adapter, await configuration.createConformanceEnvelope(adapter.manifest.adapterId), knownEntityIds, evidenceResolver);
    expect(report.passed).toBe(true);
    expect(report.checks.find((currentCheck) => currentCheck.checkId === 'provenance-produced')?.passed).toBe(true);
    expect(report.checks.find((currentCheck) => currentCheck.checkId === 'provenance-resolved')?.passed).toBe(true);
  });

  it('fails conformance when an emitted evidence reference cannot be resolved', async () => {
    const configuration = defaultIntegrationLabConfiguration;
    const adapter = configuration.inputAdapters.find((candidate) => candidate.manifest.adapterId === 'adapter-system-work-order')!;
    const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    const report = await runInputAdapterConformance(adapter, await configuration.createConformanceEnvelope(adapter.manifest.adapterId), knownEntityIds, new EvidenceResolver([], knownEntityIds));
    expect(report.passed).toBe(false);
    expect(report.checks.find((currentCheck) => currentCheck.checkId === 'evidence-reference-integrity')?.passed).toBe(false);
  });

  it('keeps manifests valid without treating manifest count as full conformance', () => {
    expect(manifestConformanceSummary(defaultIntegrationLabConfiguration.inputAdapters.concat([]).map((adapter) => adapter.manifest))).toEqual({ passed: 6, failed: 0 });
  });
});
