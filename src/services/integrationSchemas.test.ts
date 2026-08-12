import { describe, expect, it } from 'vitest';
import { defaultIntegrationLabConfiguration } from '../data/integrationLabConfigurations';
import captureSchema from '../../schemas/integration/v1/capture-envelope.schema.json';
import eventSchema from '../../schemas/integration/v1/operational-event.schema.json';
import evidenceSchema from '../../schemas/integration/v1/evidence-reference.schema.json';
import adapterSchema from '../../schemas/integration/v1/adapter-manifest.schema.json';
import projectionSchema from '../../schemas/integration/v1/state-projection.schema.json';
import physicalSchema from '../../schemas/integration/v1/physical-scene-command.schema.json';
import spatialSchema from '../../schemas/integration/v1/spatial-output-command.schema.json';
import validCapture from '../../fixtures/integration/valid/capture-envelope.json';
import invalidCapture from '../../fixtures/integration/invalid/capture-envelope-missing-source.json';
import { buildCanonicalStateProjection, createProjectionOutputs } from './canonicalStateProjection';
import { runIntegrationSchemaAlignment, validateWithIntegrationSchema } from './integrationJsonSchema';

describe('executable Draft 2020-12 integration schemas and runtime alignment', () => {
  it('pins every executable schema to Draft 2020-12 and a versioned identifier', () => {
    for (const schema of [captureSchema, eventSchema, evidenceSchema, adapterSchema, projectionSchema, physicalSchema, spatialSchema]) {
      expect(schema.$schema).toContain('2020-12');
      expect(schema.$id).toContain('/integration/v1/');
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
    }
  });

  it('executes Ajv validation instead of inspecting schema metadata only', () => {
    expect(validateWithIntegrationSchema('capture-envelope', validCapture).valid).toBe(true);
    const invalid = validateWithIntegrationSchema('capture-envelope', invalidCapture);
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('keeps valid, invalid, and runtime-generated contracts aligned', async () => {
    const configuration = defaultIntegrationLabConfiguration;
    const knownEntityIds = new Set(configuration.entities.map((entity) => entity.entityId));
    const projection = await buildCanonicalStateProjection([], 'temporary-demo', {
      ...configuration.projectionProfile,
      entityLabels: configuration.labels,
      requirements: configuration.requirements
    });
    const bundle = await createProjectionOutputs(projection, 1, { ...configuration.physicalOutputProfile, routeIdsByEntity: configuration.routeMappings });
    const summary = runIntegrationSchemaAlignment(knownEntityIds, bundle);
    expect(summary.validator).toBe('Ajv 8 Draft 2020-12');
    expect(summary.metaSchemasValid).toBe(7);
    expect(summary.validFixturesPassed).toBe(7);
    expect(summary.invalidFixturesRejected).toBe(7);
    expect(summary.runtimeObjectsPassed).toBe(5);
    expect(summary.driftIssues).toEqual([]);
  });

  it('rejects nested unknown fields in trust-sensitive contracts', () => {
    const candidate = structuredClone(validCapture) as Record<string, unknown>;
    const transport = candidate.transportMetadata as Record<string, unknown>;
    transport.unexpectedTrustFlag = true;
    expect(validateWithIntegrationSchema('capture-envelope', candidate).valid).toBe(false);
  });
});
