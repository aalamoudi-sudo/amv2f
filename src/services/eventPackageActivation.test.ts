import { beforeEach, describe, expect, it } from 'vitest';
import { defaultReferenceEventPackageId, loadReferenceEventPackages } from '../data/referenceEventPackages';
import { createInitialEventStoreState, useEventStore } from '../store/useEventStore';
import type { EventRuntimeConfiguration } from '../types/eventPackage';
import { EventPackageActivationController } from './eventPackageActivation';
import { withEventPackageContentHash } from './eventPackageHash';

describe('atomic temporary-demo event package activation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useEventStore.setState(createInitialEventStoreState());
  });

  it('activates atomically, rolls back, resets, and never reuses state objects across events', async () => {
    const packages = await loadReferenceEventPackages();
    const applied: EventRuntimeConfiguration[] = [];
    const controller = new EventPackageActivationController((runtime) => applied.push(structuredClone(runtime)), defaultReferenceEventPackageId, () => '2026-07-12T12:00:00.000Z');
    await controller.activatePackage(packages[0]!);
    const exhibitionEntities = applied.at(-1)!.entities;
    await controller.activatePackage(packages[1]!);
    expect(applied.at(-1)!.identity.eventType).toBe('conference');
    expect(Object.keys(applied.at(-1)!.entities)).not.toEqual(Object.keys(exhibitionEntities));
    expect(applied.at(-1)!.entities).not.toBe(exhibitionEntities);
    controller.rollback();
    expect(applied.at(-1)!.identity.eventType).toBe('exhibition');
    await controller.reset(packages);
    expect(applied.at(-1)!.identity.packageId).toBe(defaultReferenceEventPackageId);
  });

  it('preserves the current runtime when validation or runtime application fails', async () => {
    const packages = await loadReferenceEventPackages();
    let activeId = '';
    const controller = new EventPackageActivationController((runtime) => {
      if (runtime.identity.eventType === 'festival') throw new Error('health failure');
      activeId = runtime.identity.packageId;
    }, defaultReferenceEventPackageId);
    await controller.activatePackage(packages[0]!);
    const firstId = activeId;
    const invalid = structuredClone(packages[1]!);
    invalid.eventInstance.venueId = 'VENUE-UNKNOWN';
    await controller.activatePackage(await withEventPackageContentHash(invalid));
    expect(activeId).toBe(firstId);
    await controller.activatePackage(packages[2]!);
    expect(activeId).toBe(firstId);
    expect(controller.snapshot().activeRuntime?.identity.packageId).toBe(firstId);
  });

  it('keeps imported package data out of persisted baseline state', async () => {
    const original = createInitialEventStoreState();
    const originalBaseline = structuredClone(original.baselineEntities);
    const [eventPackage] = await loadReferenceEventPackages();
    const controller = new EventPackageActivationController((runtime) => useEventStore.getState().activateTemporaryEventRuntime(runtime), defaultReferenceEventPackageId);
    await controller.activatePackage(eventPackage!);
    const state = useEventStore.getState();
    expect(state.activeRuntime?.identity.stateContext).toBe('temporary-demo');
    expect(state.packageSessionSnapshot?.baselineEntities).toEqual(originalBaseline);
    expect(state.zoneReadiness.every((record) => record.stateContext === 'temporary-demo')).toBe(true);
    expect(state.decisions.every((record) => record.stateContext === 'temporary-demo')).toBe(true);
    expect(state.entities).not.toEqual(originalBaseline);
    const persisted = JSON.parse(window.localStorage.getItem('mayadeen-event-intelligence-twin:v1') ?? '{}') as { state?: { baselineEntities?: unknown } };
    expect(persisted.state?.baselineEntities).toEqual(originalBaseline);
  });

  it('resets selection, routes, decisions, and scenarios between package scopes', async () => {
    const packages = await loadReferenceEventPackages();
    const controller = new EventPackageActivationController((runtime) => useEventStore.getState().activateTemporaryEventRuntime(runtime), defaultReferenceEventPackageId);
    await controller.activatePackage(packages[0]!);
    const firstState = useEventStore.getState();
    firstState.selectEntity(Object.values(firstState.entities).find((entity) => entity.type === 'hall')!.id);
    firstState.startScenario('visitorJourney');
    await controller.activatePackage(packages[2]!);
    const nextState = useEventStore.getState();
    expect(nextState.activeRuntime?.identity.eventType).toBe('festival');
    expect(nextState.scenarioRuntime.playback).toBe('idle');
    expect(nextState.stateContext.stateLayer).toBe('baseline');
    expect(nextState.selectedEntityId?.includes('FEST')).toBe(true);
    expect(nextState.decisions.every((decision) => decision.eventId === packages[2]!.eventInstance.eventInstanceId)).toBe(true);
    expect(Object.keys(nextState.routeVisibility)).toEqual(packages[2]!.routeConfiguration.routes.map((route) => route.id));
  });
});
