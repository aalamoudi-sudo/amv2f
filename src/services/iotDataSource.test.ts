import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalGatewayIoTDataSource, LocalSimulatorIoTDataSource } from './iotDataSource';
import { GatewayHttpClient, localGatewayUrlFromSearch } from './iotGatewayClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IoTDataSource boundary', () => {
  it('keeps the simulator and durable gateway as distinct explicit source implementations', () => {
    const simulator = new LocalSimulatorIoTDataSource();
    const gateway = new LocalGatewayIoTDataSource('http://127.0.0.1:8787');
    expect(simulator).toMatchObject({ id: 'local-simulator', labelAr: 'المحاكاة المحلية', networkMode: 'none' });
    expect(gateway).toMatchObject({ id: 'local-gateway', labelAr: 'البوابة المحلية الدائمة', networkMode: 'http-sse' });
    expect(simulator.id).not.toBe(gateway.id);
  });

  it('allows only loopback gateway URLs and falls back to the fixed local endpoint, never an external host', () => {
    expect(localGatewayUrlFromSearch('?gatewayUrl=http://localhost:8787')).toBe('http://localhost:8787');
    expect(localGatewayUrlFromSearch('?gatewayUrl=https://external.example')).toBe('http://127.0.0.1:8787');
  });

  it('shows a closed SSE transport as disconnected and keeps source credentials and SQLite out of browser code', () => {
    class ClosedEventSource {
      static CLOSED = 2;
      static latest: ClosedEventSource | null = null;
      readyState = ClosedEventSource.CLOSED;
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;

      public constructor(_url: string) {
        void _url;
        ClosedEventSource.latest = this;
      }

      addEventListener(): void {}
      close(): void {}
    }
    vi.stubGlobal('EventSource', ClosedEventSource);
    const states: string[] = [];
    const close = new GatewayHttpClient('http://127.0.0.1:8787').events(
      () => undefined,
      (state) => states.push(state)
    );
    ClosedEventSource.latest?.onerror?.();
    close();
    expect(states).toEqual(['connecting', 'disconnected', 'disconnected']);

    const browserBoundary = [
      'src/services/iotGatewayClient.ts',
      'src/services/iotDataSource.ts',
      'src/components/integration/LocalGatewayIoTWorkspace.tsx'
    ].map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(browserBoundary).not.toContain('MAYADEEN_IOT_GATEWAY_SECRET');
    expect(browserBoundary).not.toContain('node:sqlite');
    expect(browserBoundary).not.toContain('sqliteDurableEventStore');
  });
});
