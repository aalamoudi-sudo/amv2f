import type { GatewayObservationInput } from './types';

function localGatewayUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) {
    throw new Error('MAYADEEN_IOT_GATEWAY_URL must target a local loopback HTTP gateway.');
  }
  return parsed.toString().replace(/\/$/, '');
}

const gatewayUrl = localGatewayUrl(process.env.MAYADEEN_IOT_GATEWAY_URL ?? 'http://127.0.0.1:8787');
const secret = process.env.MAYADEEN_IOT_GATEWAY_SECRET ?? '';

if (!secret) {
  throw new Error('MAYADEEN_IOT_GATEWAY_SECRET must be set for the local source simulator.');
}

const timestamp = new Date().toISOString();
const capture: GatewayObservationInput = {
  deviceId: 'DEVICE-IOT-COUNT-001',
  streamId: 'occupancy-count',
  sourceRecordId: `SIMULATOR-${timestamp}`,
  idempotencyKey: `SIMULATOR-IDEMPOTENCY-${timestamp}`,
  eventRef: 'EVENT-GATEWAY-LOCAL',
  venueId: 'VENUE-GATEWAY-LOCAL',
  value: 42,
  valueType: 'number',
  unit: 'person',
  sourceTimestamp: timestamp,
  sequence: Number(process.env.MAYADEEN_IOT_GATEWAY_SEQUENCE ?? 1),
  offlineSequence: null,
  stateContext: 'temporary-demo'
};

const response = await fetch(`${gatewayUrl}/api/iot/v1/observations`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${secret}`
  },
  body: JSON.stringify(capture)
});

const body: unknown = await response.json();
console.log(JSON.stringify({ status: response.status, body }));
