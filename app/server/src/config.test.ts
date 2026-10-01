// @vitest-environment node
import { expect, test } from 'vitest';
import { loadServerConfiguration } from './config.js';

test('server configuration validates runtime settings and retains only safe references', () => {
  const configuration = loadServerConfiguration({
    NODE_ENV: 'test', AXEON_SERVER_PORT: '3210', AXEON_DATABASE_PROVIDER: 'db2', AXEON_DATABASE_ENABLED: 'true',
    AXEON_DATABASE_CONNECTION_REFERENCE: 'vault/axeon-db2', AXEON_MAXIMO_ENABLED: 'false', AXEON_AI_ENABLED: 'false',
    AXEON_DB_PASSWORD: 'must-not-appear',
  });
  expect(configuration).toMatchObject({ environment: 'test', port: 3210, database: { provider: 'db2', enabled: true, connectionReference: 'vault/axeon-db2' } });
  expect(JSON.stringify(configuration)).not.toContain('must-not-appear');
});

test('server configuration rejects invalid ports, environments, providers, and database enablement', () => {
  expect(() => loadServerConfiguration({ NODE_ENV: 'network' })).toThrow('NODE_ENV');
  expect(() => loadServerConfiguration({ AXEON_SERVER_PORT: '0' })).toThrow('AXEON_SERVER_PORT');
  expect(() => loadServerConfiguration({ AXEON_DATABASE_PROVIDER: 'oracle' })).toThrow('AXEON_DATABASE_PROVIDER');
  expect(() => loadServerConfiguration({ AXEON_DATABASE_ENABLED: 'true' })).toThrow('database provider');
});
