import { describe, expect, it } from 'vitest';
import { demoSpatialEntities } from '../data/entities';
import { createIoTLabConfiguration } from '../data/iotFixtures';
import { IoTIntegrationLabEngine } from './iotIntegrationLabEngine';

function configuration(suffix = 'A') {
  return createIoTLabConfiguration({
    configurationId: `IOT-LAB-TEST-${suffix}`,
    eventRef: `EVENT-IOT-${suffix}`,
    venueId: `VENUE-IOT-${suffix}`,
    mappingVersion: `iot-mapping-${suffix}`,
    entities: demoSpatialEntities.slice(0, 4).map((entity) => ({ entityId: entity.id, labelAr: entity.nameAr }))
  });
}

describe('Stage 3F vendor-neutral IoT integration foundation', () => {
  it('loads an event-agnostic local registry and executable schemas without claiming live connectivity', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    const snapshot = engine.snapshot();
    expect(snapshot.stateContext).toBe('temporary-demo');
    expect(snapshot.devices).toHaveLength(3);
    expect(snapshot.schemaStatus).toEqual({ validator: 'Ajv 8 Draft 2020-12', schemas: 2, valid: true });
    expect(snapshot.operationalEvents).toEqual([]);
    expect(snapshot.projection.entityStates).toEqual([]);
  });

  it('converts a fresh reading through the existing Stage 3D path as reported only', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    const snapshot = await engine.run('fresh');
    expect(snapshot.observations).toHaveLength(1);
    expect(snapshot.operationalEvents).toHaveLength(1);
    expect(snapshot.operationalEvents[0]?.eventType).toBe('sensor.observed');
    expect(snapshot.operationalEvents[0]?.trust.assertionState).toBe('reported');
    expect(snapshot.operationalEvents[0]?.observationRefs).toEqual(['IOT-OBS-FRESH-001']);
    expect(snapshot.projection.entityStates).toEqual([]);
    expect(snapshot.results.at(-1)?.outcome).toBe('accepted-reported');
  });

  it('rejects unknown, disabled, invalid-unit, invalid-value and cross-event readings before append', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    for (const action of ['unknown-device', 'disabled-device', 'invalid-unit', 'invalid-value', 'cross-event'] as const) {
      const snapshot = await engine.run(action);
      expect(snapshot.results.at(-1)?.outcome).toBe('rejected');
    }
    expect(engine.snapshot().observations).toEqual([]);
    expect(engine.snapshot().operationalEvents).toEqual([]);
  });

  it('accepts a configured threshold as a reported observation but never as an approved alarm', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    const snapshot = await engine.run('threshold');
    expect(snapshot.results.at(-1)?.outcome).toBe('accepted-reported');
    expect(snapshot.results.at(-1)?.messageAr).toContain('ليس إنذارًا');
    expect(snapshot.operationalEvents[0]?.operationalContext.proposedDisposition).toBe('threshold-observed');
    expect(snapshot.projection.entityStates).toEqual([]);
  });

  it('distinguishes a duplicate from the same idempotency key with different content', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    let snapshot = await engine.run('duplicate');
    expect(snapshot.observations).toHaveLength(1);
    expect(snapshot.operationalEvents).toHaveLength(1);
    expect(snapshot.results.at(-1)?.outcome).toBe('duplicate-ignored');

    snapshot = await engine.run('key-conflict');
    expect(snapshot.results.at(-1)?.outcome).toBe('conflict-requires-review');
    expect(snapshot.observations).toHaveLength(1);
    expect(snapshot.operationalEvents).toHaveLength(1);
  });

  it('quarantines stale telemetry without replacing the latest accepted reading', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    await engine.run('fresh');
    const snapshot = await engine.run('stale');
    expect(snapshot.quarantinedObservations).toHaveLength(1);
    expect(snapshot.observations).toHaveLength(1);
    expect(snapshot.observations[0]?.observationId).toBe('IOT-OBS-FRESH-001');
    expect(snapshot.results.at(-1)?.outcome).toBe('stale-quarantined');
  });

  it('queues offline telemetry, replays it once, then blocks the next replay as duplicate', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    let snapshot = await engine.run('offline');
    expect(snapshot.offlineQueue[0]?.status).toBe('queued');
    expect(snapshot.observations).toEqual([]);

    snapshot = await engine.run('replay-offline');
    expect(snapshot.offlineQueue[0]?.status).toBe('replayed');
    expect(snapshot.results.at(-1)?.outcome).toBe('offline-replayed');
    expect(snapshot.observations).toHaveLength(1);

    snapshot = await engine.run('replay-offline');
    expect(snapshot.results.at(-1)?.outcome).toBe('duplicate-ignored');
    expect(snapshot.observations).toHaveLength(1);
  });

  it('marks a simulated timeout without changing the spatial or verified operational state', async () => {
    const engine = await IoTIntegrationLabEngine.create(configuration());
    await engine.run('fresh');
    const snapshot = await engine.run('timeout');
    expect(snapshot.health.find((health) => health.deviceId === 'DEVICE-IOT-COUNT-001')?.status).toBe('simulated-offline');
    expect(snapshot.results.at(-1)?.outcome).toBe('device-timeout');
    expect(snapshot.projection.entityStates).toEqual([]);
  });

  it('uses the same core for a second event, venue and mapping without leaking identities', async () => {
    const first = await IoTIntegrationLabEngine.create(configuration('A'));
    const second = await IoTIntegrationLabEngine.create(configuration('B'));
    const firstSnapshot = await first.run('fresh');
    const secondSnapshot = await second.run('fresh');
    expect(firstSnapshot.operationalEvents[0]?.subjects.eventRef).toBe('EVENT-IOT-A');
    expect(secondSnapshot.operationalEvents[0]?.subjects.eventRef).toBe('EVENT-IOT-B');
    expect(firstSnapshot.operationalEvents[0]?.subjects.venueId).toBe('VENUE-IOT-A');
    expect(secondSnapshot.operationalEvents[0]?.subjects.venueId).toBe('VENUE-IOT-B');
    expect(firstSnapshot.projection.spatialMappingVersion).toBe('iot-mapping-A');
    expect(secondSnapshot.projection.spatialMappingVersion).toBe('iot-mapping-B');
  });
});

