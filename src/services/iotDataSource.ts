import { IoTIntegrationLabEngine } from './iotIntegrationLabEngine';
import { GatewayHttpClient } from './iotGatewayClient';
import type { IoTLabConfiguration } from '../types/iotLab';

export type IoTDataSourceId = 'local-simulator' | 'local-gateway';

/** Shared source boundary. The workspace mounts exactly one implementation at a time. */
export interface IoTDataSource {
  readonly id: IoTDataSourceId;
  readonly labelAr: string;
  readonly networkMode: 'none' | 'http-sse';
}

export class LocalSimulatorIoTDataSource implements IoTDataSource {
  readonly id = 'local-simulator' as const;
  readonly labelAr = 'المحاكاة المحلية';
  readonly networkMode = 'none' as const;

  createEngine(configuration: IoTLabConfiguration): Promise<IoTIntegrationLabEngine> {
    return IoTIntegrationLabEngine.create(configuration);
  }
}

export class LocalGatewayIoTDataSource implements IoTDataSource {
  readonly id = 'local-gateway' as const;
  readonly labelAr = 'البوابة المحلية الدائمة';
  readonly networkMode = 'http-sse' as const;
  readonly client: GatewayHttpClient;

  public constructor(baseUrl: string) {
    this.client = new GatewayHttpClient(baseUrl);
  }
}
