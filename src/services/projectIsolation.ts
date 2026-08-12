import type { IoTDeviceRegistryRecord } from '../types/iot';
import type { DecisionRecord } from '../types/decision';
import type { EventRuntimeConfiguration } from '../types/eventPackage';
import type { ProjectEventRecord, ProjectWorkspace } from '../types/projectWorkspace';
import type { SpatialEntityId } from '../types/spatial';
import type { ProjectRegistry } from './projectRegistry';

export function projectScopeError(projectId: string, recordKindAr: string): string {
  return `حُجب ${recordKindAr} لأنه لا ينتمي إلى سياق المشروع النشط ${projectId}.`;
}

export function assertRuntimeProjectScope(project: ProjectWorkspace, event: ProjectEventRecord, runtime: EventRuntimeConfiguration): void {
  if (event.projectId !== project.projectId || !project.eventIds.includes(event.eventId)
    || runtime.identity.eventInstanceId !== event.eventId || !event.venueIds.includes(runtime.identity.venueId)) {
    throw new Error(projectScopeError(project.projectId, 'Runtime الفعالية'));
  }
}

export function decisionBelongsToProject(registry: ProjectRegistry, projectId: string, decision: Pick<DecisionRecord, 'eventId' | 'venueId'>): boolean {
  return registry.assertEventInProject(projectId, decision.eventId) && registry.assertVenueInProject(projectId, decision.venueId);
}

export function entityBelongsToRuntime(runtime: EventRuntimeConfiguration | null, entityId: string): boolean {
  return Boolean(runtime?.entities[entityId as SpatialEntityId]);
}

export function routeBelongsToRuntime(runtime: EventRuntimeConfiguration | null, routeId: string): boolean {
  return Boolean(runtime?.routes.some((route) => route.id === routeId));
}

export function iotSourceBelongsToProject(
  registry: ProjectRegistry,
  projectId: string,
  device: Pick<IoTDeviceRegistryRecord, 'eventRef' | 'venueId'>
): boolean {
  return Boolean(device.eventRef && registry.assertEventInProject(projectId, device.eventRef) && registry.assertVenueInProject(projectId, device.venueId));
}
