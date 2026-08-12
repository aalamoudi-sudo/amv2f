import { beforeEach, describe, expect, it } from 'vitest';
import { projectRegistry, referenceExhibitionProjectId } from '../data/projectRegistry';
import { loadReferenceEventPackage } from '../data/referenceEventPackages';
import { createEventRuntimeConfiguration } from './eventRuntimeConfiguration';
import { decisionBelongsToProject, entityBelongsToRuntime, iotSourceBelongsToProject, routeBelongsToRuntime } from './projectIsolation';
import { createInitialEventStoreState, useEventStore } from '../store/useEventStore';

describe('project context isolation', () => {
  beforeEach(() => useEventStore.setState(createInitialEventStoreState()));

  it('clears project-scoped selections and filters before activation', () => {
    expect(useEventStore.getState().selectedEntityId).not.toBeNull();
    expect(useEventStore.getState().selectedDecisionId).not.toBeNull();
    useEventStore.getState().clearProjectScopedState('PROJECT-KAP-OPENING-2026', 'EVENT-KAP-OPENING-2026');
    const state = useEventStore.getState();
    expect(state.selectedEntityId).toBeNull();
    expect(state.selectedDecisionId).toBeNull();
    expect(state.routeVisibility).toEqual({});
    expect(state.entities).toEqual({});
    expect(state.activeRuntime).toBeNull();
  });

  it('rejects cross-project decisions, routes, zones, and IoT source records', async () => {
    const eventPackage = await loadReferenceEventPackage('EVENT-PACKAGE-EXHIBITION-DEMO');
    const runtime = createEventRuntimeConfiguration(eventPackage!);
    const decision = runtime.decisions[0]!;
    const entityId = Object.keys(runtime.entities)[0]!;
    const routeId = runtime.routes[0]!.id;
    expect(decisionBelongsToProject(projectRegistry, referenceExhibitionProjectId, decision)).toBe(true);
    expect(decisionBelongsToProject(projectRegistry, 'PROJECT-KAP-OPENING-2026', decision)).toBe(false);
    expect(entityBelongsToRuntime(runtime, entityId)).toBe(true);
    expect(entityBelongsToRuntime(runtime, 'ZONE-KAP-FOREIGN')).toBe(false);
    expect(routeBelongsToRuntime(runtime, routeId)).toBe(true);
    expect(routeBelongsToRuntime(runtime, 'ROUTE-KAP-FOREIGN')).toBe(false);
    expect(iotSourceBelongsToProject(projectRegistry, referenceExhibitionProjectId, { eventRef: runtime.identity.eventInstanceId, venueId: runtime.identity.venueId })).toBe(true);
    expect(iotSourceBelongsToProject(projectRegistry, 'PROJECT-KAP-OPENING-2026', { eventRef: runtime.identity.eventInstanceId, venueId: runtime.identity.venueId })).toBe(false);
  });

  it('blocks runtime activation when the event differs from the selected project event', async () => {
    const eventPackage = await loadReferenceEventPackage('EVENT-PACKAGE-EXHIBITION-DEMO');
    const runtime = createEventRuntimeConfiguration(eventPackage!);
    useEventStore.getState().clearProjectScopedState('PROJECT-KAP-OPENING-2026', 'EVENT-KAP-OPENING-2026');
    expect(useEventStore.getState().activateTemporaryEventRuntime(runtime)).toBe(false);
    expect(useEventStore.getState().activeRuntime).toBeNull();
    expect(useEventStore.getState().errorMessage).toContain('لا تطابق سياق المشروع');
  });

  it('does not deactivate the runtime independently from an active project', async () => {
    const eventPackage = await loadReferenceEventPackage('EVENT-PACKAGE-EXHIBITION-DEMO');
    const runtime = createEventRuntimeConfiguration(eventPackage!);
    expect(useEventStore.getState().activateTemporaryEventRuntime(runtime, undefined, {
      projectId: referenceExhibitionProjectId,
      eventId: 'EVENT-EXHIBITION-DEMO-001'
    })).toBe(true);

    useEventStore.getState().deactivateTemporaryEventRuntime();

    expect(useEventStore.getState().activeProjectId).toBe(referenceExhibitionProjectId);
    expect(useEventStore.getState().activeRuntime?.identity.eventInstanceId).toBe('EVENT-EXHIBITION-DEMO-001');
    expect(useEventStore.getState().errorMessage).toContain('لا يمكن إزالة Runtime');
  });

  it('resets only the active project baseline without falling back to global demo data', async () => {
    const eventPackage = await loadReferenceEventPackage('EVENT-PACKAGE-EXHIBITION-DEMO');
    const runtime = createEventRuntimeConfiguration(eventPackage!);
    useEventStore.getState().activateTemporaryEventRuntime(runtime, undefined, {
      projectId: referenceExhibitionProjectId,
      eventId: 'EVENT-EXHIBITION-DEMO-001'
    });

    useEventStore.getState().resetDemoData();

    expect(useEventStore.getState().activeProjectId).toBe(referenceExhibitionProjectId);
    expect(useEventStore.getState().activeRuntime?.identity.eventInstanceId).toBe('EVENT-EXHIBITION-DEMO-001');
    expect(useEventStore.getState().entities['ZONE-EXH-001']).toBeDefined();
    expect(useEventStore.getState().entities['ZONE-001']).toBeUndefined();
  });
});
