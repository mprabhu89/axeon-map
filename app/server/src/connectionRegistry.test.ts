// @vitest-environment node
import { expect, test } from 'vitest';
import { ConnectionConfigurationError, loadConnectionRegistry, resolveConnectionCredential } from './connectionRegistry.js';

const definitions = JSON.stringify([
  { id: 'approved-db2', provider: 'db2', mode: 'read-only-database', approval: 'approved', credentialEnvironmentVariable: 'AXEON_DB2_READONLY_CREDENTIAL', host: 'db2.internal.example', databaseName: 'MAXIMO' },
  { id: 'approved-sql-server', provider: 'sql-server', mode: 'read-only-database', approval: 'approved', credentialEnvironmentVariable: 'AXEON_SQLSERVER_READONLY_CREDENTIAL', host: 'sql.internal.example', port: 1444, databaseName: 'maximo-reporting', connectTimeoutMs: 2_000, operationTimeoutMs: 8_000, maxConcurrentOperations: 2 },
  { id: 'approved-maximo', provider: 'maximo-rest', mode: 'read-only-api', approval: 'approved', credentialEnvironmentVariable: 'AXEON_MAXIMO_API_CREDENTIAL', baseUrl: 'https://maximo.internal.example/maximo' },
]);

test('approved Db2, SQL Server, and Maximo REST definitions load with bounded read-only policies and without credentials', () => {
  const environment = {
    AXEON_CONNECTION_DEFINITIONS: definitions,
    AXEON_DB2_READONLY_CREDENTIAL: 'db2-test-secret',
    AXEON_SQLSERVER_READONLY_CREDENTIAL: 'sql-test-secret',
    AXEON_MAXIMO_API_CREDENTIAL: 'maximo-test-secret',
  };
  const registry = loadConnectionRegistry(environment);
  expect(registry.list()).toHaveLength(3);
  expect(registry.get('approved-db2')).toMatchObject({ provider: 'db2', mode: 'read-only-database', port: 50_000, policy: { connectTimeoutMs: 5_000, operationTimeoutMs: 10_000, maxConcurrentOperations: 4 } });
  expect(registry.get('approved-sql-server')).toMatchObject({ provider: 'sql-server', port: 1444, policy: { connectTimeoutMs: 2_000, operationTimeoutMs: 8_000, maxConcurrentOperations: 2 } });
  expect(registry.get('approved-maximo')).toMatchObject({ provider: 'maximo-rest', mode: 'read-only-api', baseUrl: 'https://maximo.internal.example/maximo' });
  expect(JSON.stringify(registry.list())).not.toMatch(/db2-test-secret|sql-test-secret|maximo-test-secret/);
  expect(resolveConnectionCredential(registry.get('approved-db2')!, environment)).toBe('db2-test-secret');
});

test('missing credentials, unsupported providers, unapproved definitions, unsafe modes, and unsafe Maximo URLs fail closed without leaking values', () => {
  expect(() => loadConnectionRegistry({ AXEON_CONNECTION_DEFINITIONS: definitions })).toThrow(ConnectionConfigurationError);
  const invalid = (definition: unknown, extra: NodeJS.ProcessEnv = {}) => () => loadConnectionRegistry({ AXEON_CONNECTION_DEFINITIONS: JSON.stringify([definition]), ...extra });
  expect(invalid({ id: 'oracle', provider: 'oracle', mode: 'read-only-database', approval: 'approved', credentialEnvironmentVariable: 'AXEON_ORACLE_CREDENTIAL' }, { AXEON_ORACLE_CREDENTIAL: 'secret-value' })).toThrow('Connection configuration is invalid');
  expect(invalid({ id: 'unapproved-db2', provider: 'db2', mode: 'read-only-database', approval: 'draft', credentialEnvironmentVariable: 'AXEON_DB2_CREDENTIAL', host: 'db2.example', databaseName: 'maximo' }, { AXEON_DB2_CREDENTIAL: 'secret-value' })).toThrow('Connection configuration is invalid');
  expect(invalid({ id: 'write-db2', provider: 'db2', mode: 'write', approval: 'approved', credentialEnvironmentVariable: 'AXEON_DB2_CREDENTIAL', host: 'db2.example', databaseName: 'maximo' }, { AXEON_DB2_CREDENTIAL: 'secret-value' })).toThrow('Connection configuration is invalid');
  expect(invalid({ id: 'insecure-maximo', provider: 'maximo-rest', mode: 'read-only-api', approval: 'approved', credentialEnvironmentVariable: 'AXEON_MAXIMO_CREDENTIAL', baseUrl: 'http://maximo.example' }, { AXEON_MAXIMO_CREDENTIAL: 'secret-value' })).toThrow('Connection configuration is invalid');
  try { loadConnectionRegistry({ AXEON_CONNECTION_DEFINITIONS: definitions }); } catch (error) {
    expect(String(error)).not.toContain('db2-test-secret');
    expect(String(error)).not.toContain('sql-test-secret');
  }
});

test('definitions reject unknown implementation and secret-bearing fields and resolve no connections by default', () => {
  expect(loadConnectionRegistry({}).list()).toEqual([]);
  expect(() => loadConnectionRegistry({
    AXEON_CONNECTION_DEFINITIONS: JSON.stringify([{ id: 'unsafe-db2', provider: 'db2', mode: 'read-only-database', approval: 'approved', credentialEnvironmentVariable: 'AXEON_DB2_CREDENTIAL', host: 'db2.example', databaseName: 'maximo', password: 'must-not-be-configured-here' }]),
    AXEON_DB2_CREDENTIAL: 'secret-value',
  })).toThrow('Connection configuration is invalid');
});
