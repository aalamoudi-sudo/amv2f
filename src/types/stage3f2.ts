import type { SpatialEntityId } from './spatial';

export const stage3f2StatusValues = ['READY_FOR_REAL_SOURCE'] as const;
export type Stage3F2Status = (typeof stage3f2StatusValues)[number];

export const stage3f2SourceProtocolValues = ['http-json-polling', 'http-webhook', 'camera-analytics-api', 'edge-video-analytics-boundary'] as const;
export type Stage3F2SourceProtocol = (typeof stage3f2SourceProtocolValues)[number];

export interface Stage3F2SourceManifest {
  pilotId: string | null;
  eventId: string | null;
  venueId: string | null;
  entityId: SpatialEntityId | null;
  zoneId: SpatialEntityId | null;
  sourceId: string | null;
  deviceId: string | null;
  datastreamId: string | null;
  sourceOwner: string | null;
  technicalOwner: string | null;
  approvedBy: string | null;
  approvalDate: string | null;
  approvedScope: string | null;
  protocol: Stage3F2SourceProtocol | null;
  authenticationMethod: string | null;
  environmentVariableNames: string[];
  observationFields: string[];
  units: string[];
  expectedFrequencySeconds: number | null;
  timePolicy: string | null;
  retentionPolicy: string | null;
  privacyClassification: 'internal' | 'restricted' | 'confidential' | null;
  networkBoundary: string | null;
  rollbackOwner: string | null;
  pilotStart: string | null;
  pilotEnd: string | null;
  successThresholds: string[];
  status: Stage3F2Status;
  accessAvailable: boolean;
  realSourceApproved: boolean;
}
