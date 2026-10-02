import { loadServerConfiguration } from './config.js';
import { createAxeonHttpServer, closeAxeonHttpServer, createConfiguredWorkOrderData, createDefaultAuthenticationRuntime, listenAxeonHttpServer } from './httpServer.js';
import { DEFAULT_OBJECT_PROFILE_REGISTRY } from './objectProfileRegistry.js';

const configuration = loadServerConfiguration();
const workOrderData = createConfiguredWorkOrderData(configuration);
const server = createAxeonHttpServer({ configuration, objectProfiles: DEFAULT_OBJECT_PROFILE_REGISTRY, authentication: createDefaultAuthenticationRuntime(configuration), workOrderData });

await listenAxeonHttpServer(server, configuration);
console.info(`Axeon Map server listening on ${configuration.host}:${configuration.port}`);

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await closeAxeonHttpServer(server);
  workOrderData?.close();
};

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
