import { buildGateway } from './gateway';

export { buildGateway, gatewayConfigurationFromEnvironment } from './gateway';
export type {
  DurableEventStore,
  GatewayConfiguration,
  GatewayIngestionOutcome,
  GatewayIngestionResult,
  GatewayObservationInput,
  SourceAuthenticator
} from './types';

async function start(): Promise<void> {
  const application = await buildGateway();
  const port = Number(process.env.MAYADEEN_IOT_GATEWAY_PORT ?? 8787);
  await application.gateway.listen({ host: '127.0.0.1', port });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void start();
}
