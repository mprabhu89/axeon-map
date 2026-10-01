import { loadServerConfiguration } from './config.js';
import { createAxeonHttpServer, closeAxeonHttpServer, createDefaultAuthenticationRuntime, listenAxeonHttpServer } from './httpServer.js';
import { DEFAULT_OBJECT_PROFILE_REGISTRY } from './objectProfileRegistry.js';

const configuration = loadServerConfiguration();
const server = createAxeonHttpServer({ configuration, objectProfiles: DEFAULT_OBJECT_PROFILE_REGISTRY, authentication: createDefaultAuthenticationRuntime(configuration) });

await listenAxeonHttpServer(server, configuration);
console.info(`Axeon Map server listening on ${configuration.host}:${configuration.port}`);

let shuttingDown = false;
const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await closeAxeonHttpServer(server);
};

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
