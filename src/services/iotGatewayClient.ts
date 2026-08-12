import type { IoTDeviceRegistryRecord, IoTObservation, IoTScalarValue } from '../types/iot';

export type GatewayConnectionState = 'connecting' | 'ready' | 'reconnecting' | 'disconnected';

export interface GatewayHealth {
  ready: boolean;
  gateway: { status: 'running' | 'ready' };
  durableStore: { status: 'ready' | 'unavailable'; migrationVersion: number | null };
  deviceRegistry: { status: 'ready' | 'unavailable'; records: number };
  transactionalOutbox: { status: 'ready' | 'unavailable'; pending: number };
  sourceAuthentication: { mode: 'local-laboratory'; configured: boolean };
  externalDeviceConnection: { status: 'absent'; messageAr: string };
  restartRecovered: boolean;
  messageAr: string;
}

export interface GatewayQuarantineRecord {
  quarantineId: string;
  attemptId: string;
  reason: 'conflict-quarantined' | 'stale-quarantined';
  createdAt: string;
  observation: IoTObservation;
}

export interface GatewaySseEvent {
  notificationId: string;
  kind: 'accepted-observation' | 'ingestion-outcome' | 'gateway-ready';
  outcome: string;
  messageAr: string;
  observationId: string | null;
  operationalEventId: string | null;
  deviceId: string | null;
  streamId: string | null;
  entityId: string | null;
  value: IoTScalarValue | null;
  unit: string | null;
  recordedAt: string;
}

export class GatewayHttpError extends Error {
  public constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'GatewayHttpError';
  }
}

function localGatewayBaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('Local gateway URLs must use loopback HTTP.');
  }
  return parsed.toString().replace(/\/$/, '');
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new GatewayHttpError(response.status, 'Local gateway request was rejected.');
  return response.json() as Promise<T>;
}

/** Browser-only HTTP/SSE client. It holds neither a source credential nor a database dependency. */
export class GatewayHttpClient {
  private readonly baseUrl: string;

  public constructor(baseUrl: string) {
    this.baseUrl = localGatewayBaseUrl(baseUrl);
  }

  health(): Promise<GatewayHealth> {
    return fetch(`${this.baseUrl}/health/ready`).then(readJson<GatewayHealth>);
  }

  devices(): Promise<IoTDeviceRegistryRecord[]> {
    return fetch(`${this.baseUrl}/api/iot/v1/devices`)
      .then(readJson<{ items: IoTDeviceRegistryRecord[] }>)
      .then((body) => body.items);
  }

  observations(): Promise<IoTObservation[]> {
    return fetch(`${this.baseUrl}/api/iot/v1/observations`)
      .then(readJson<{ items: IoTObservation[] }>)
      .then((body) => body.items);
  }

  quarantine(): Promise<GatewayQuarantineRecord[]> {
    return fetch(`${this.baseUrl}/api/iot/v1/quarantine`)
      .then(readJson<{ items: GatewayQuarantineRecord[] }>)
      .then((body) => body.items);
  }

  events(
    onMessage: (message: GatewaySseEvent) => void,
    onState: (state: GatewayConnectionState) => void
  ): () => void {
    onState('connecting');
    const source = new EventSource(`${this.baseUrl}/api/iot/v1/events/stream`);
    const receive = (event: MessageEvent<string>) => {
      try {
        const value: unknown = JSON.parse(event.data);
        if (isGatewaySseEvent(value)) onMessage(value);
      } catch {
        // A malformed local stream frame is ignored; it never changes the selected source.
      }
    };
    source.addEventListener('gateway-event', receive as EventListener);
    source.addEventListener('gateway-outcome', receive as EventListener);
    source.addEventListener('gateway-ready', receive as EventListener);
    source.onopen = () => onState('ready');
    source.onerror = () => onState(source.readyState === EventSource.CLOSED ? 'disconnected' : 'reconnecting');
    return () => {
      source.close();
      onState('disconnected');
    };
  }
}

function isGatewaySseEvent(value: unknown): value is GatewaySseEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.notificationId === 'string'
    && typeof record.kind === 'string'
    && typeof record.outcome === 'string'
    && typeof record.messageAr === 'string';
}

export function localGatewayUrlFromSearch(search: string): string {
  const candidate = new URLSearchParams(search).get('gatewayUrl') ?? 'http://127.0.0.1:8787';
  try {
    return localGatewayBaseUrl(candidate);
  } catch {
    return 'http://127.0.0.1:8787';
  }
}
