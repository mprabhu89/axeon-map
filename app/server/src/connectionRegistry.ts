/**
 * Server-only connection configuration. Definitions are deployment supplied,
 * while credential values remain in the server environment and are never
 * included in a registry entry or browser response.
 */
export type ConnectionProviderId = 'db2' | 'sql-server' | 'maximo-rest';
export type ConnectionMode = 'read-only-database' | 'read-only-api';

export interface ReadOnlyConnectionPolicy {
  readonly connectTimeoutMs: number;
  readonly operationTimeoutMs: number;
  readonly maxConcurrentOperations: number;
}

interface ConnectionBase {
  readonly id: string;
  readonly provider: ConnectionProviderId;
  readonly credentialEnvironmentVariable: string;
  readonly policy: ReadOnlyConnectionPolicy;
}

export interface DatabaseConnectionDefinition extends ConnectionBase {
  readonly provider: 'db2' | 'sql-server';
  readonly mode: 'read-only-database';
  readonly host: string;
  readonly port: number;
  readonly databaseName: string;
}

export interface MaximoRestConnectionDefinition extends ConnectionBase {
  readonly provider: 'maximo-rest';
  readonly mode: 'read-only-api';
  readonly baseUrl: string;
}

export type ApprovedConnectionDefinition = DatabaseConnectionDefinition | MaximoRestConnectionDefinition;

/** Future providers receive a server-only secret and can only open read-only leases. */
export interface ReadOnlyConnectionLease {
  readonly connectionId: string;
  close(): Promise<void>;
}

export interface ServerConnectionProvider {
  openReadOnlyConnection(definition: ApprovedConnectionDefinition, credential: string): Promise<ReadOnlyConnectionLease>;
}

export interface ConnectionRegistry {
  list(): readonly ApprovedConnectionDefinition[];
  get(id: string): ApprovedConnectionDefinition | undefined;
}

export class ConnectionConfigurationError extends Error {
  constructor(readonly code: 'invalid-definition' | 'missing-credential') {
    super(code === 'missing-credential' ? 'A configured server connection is unavailable.' : 'Connection configuration is invalid.');
  }
}

const connectionId = /^[a-z][a-z0-9-]{1,63}$/;
const credentialVariable = /^AXEON_[A-Z0-9_]{3,120}$/;
const databaseName = /^[A-Za-z0-9_.-]{1,128}$/;
const host = /^(?=.{1,253}$)[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$/;
const defaults: ReadOnlyConnectionPolicy = Object.freeze({ connectTimeoutMs: 5_000, operationTimeoutMs: 10_000, maxConcurrentOperations: 4 });
const databaseKeys = new Set(['id', 'provider', 'mode', 'approval', 'credentialEnvironmentVariable', 'host', 'port', 'databaseName', 'connectTimeoutMs', 'operationTimeoutMs', 'maxConcurrentOperations']);
const maximoKeys = new Set(['id', 'provider', 'mode', 'approval', 'credentialEnvironmentVariable', 'baseUrl', 'connectTimeoutMs', 'operationTimeoutMs', 'maxConcurrentOperations']);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectionConfigurationError('invalid-definition');
  return value as Record<string, unknown>;
}
function stringProperty(record: Record<string, unknown>, property: string): string {
  const value = record[property];
  if (typeof value !== 'string' || value.length === 0) throw new ConnectionConfigurationError('invalid-definition');
  return value;
}
function integerProperty(record: Record<string, unknown>, property: string, fallback: number, minimum: number, maximum: number): number {
  const value = record[property] ?? fallback;
  if (!Number.isInteger(value) || typeof value !== 'number' || value < minimum || value > maximum) throw new ConnectionConfigurationError('invalid-definition');
  return value;
}
function policyFrom(record: Record<string, unknown>): ReadOnlyConnectionPolicy {
  return Object.freeze({
    connectTimeoutMs: integerProperty(record, 'connectTimeoutMs', defaults.connectTimeoutMs, 100, 30_000),
    operationTimeoutMs: integerProperty(record, 'operationTimeoutMs', defaults.operationTimeoutMs, 100, 30_000),
    maxConcurrentOperations: integerProperty(record, 'maxConcurrentOperations', defaults.maxConcurrentOperations, 1, 16),
  });
}
function validateKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  if (Object.keys(record).some((key) => !allowed.has(key))) throw new ConnectionConfigurationError('invalid-definition');
}
function base(record: Record<string, unknown>): Omit<ConnectionBase, 'provider'> {
  if (record.approval !== 'approved') throw new ConnectionConfigurationError('invalid-definition');
  const id = stringProperty(record, 'id');
  const credentialEnvironmentVariable = stringProperty(record, 'credentialEnvironmentVariable');
  if (!connectionId.test(id) || !credentialVariable.test(credentialEnvironmentVariable)) throw new ConnectionConfigurationError('invalid-definition');
  return Object.freeze({ id, credentialEnvironmentVariable, policy: policyFrom(record) });
}
function databaseDefinition(record: Record<string, unknown>, provider: 'db2' | 'sql-server'): DatabaseConnectionDefinition {
  validateKeys(record, databaseKeys);
  if (record.mode !== 'read-only-database') throw new ConnectionConfigurationError('invalid-definition');
  const shared = base(record);
  const databaseHost = stringProperty(record, 'host');
  const database = stringProperty(record, 'databaseName');
  if (!host.test(databaseHost) || !databaseName.test(database)) throw new ConnectionConfigurationError('invalid-definition');
  const defaultPort = provider === 'db2' ? 50_000 : 1_433;
  return Object.freeze({ ...shared, provider, mode: 'read-only-database', host: databaseHost, port: integerProperty(record, 'port', defaultPort, 1, 65_535), databaseName: database });
}
function maximoDefinition(record: Record<string, unknown>): MaximoRestConnectionDefinition {
  validateKeys(record, maximoKeys);
  if (record.mode !== 'read-only-api') throw new ConnectionConfigurationError('invalid-definition');
  const shared = base(record);
  const baseUrl = stringProperty(record, 'baseUrl');
  let parsed: URL;
  try { parsed = new URL(baseUrl); } catch { throw new ConnectionConfigurationError('invalid-definition'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) throw new ConnectionConfigurationError('invalid-definition');
  return Object.freeze({ ...shared, provider: 'maximo-rest', mode: 'read-only-api', baseUrl: parsed.toString().replace(/\/$/, '') });
}

function parseDefinition(value: unknown): ApprovedConnectionDefinition {
  const record = asRecord(value);
  const provider = record.provider;
  if (provider === 'db2' || provider === 'sql-server') return databaseDefinition(record, provider);
  if (provider === 'maximo-rest') return maximoDefinition(record);
  throw new ConnectionConfigurationError('invalid-definition');
}

/** Validates server configuration at startup without retaining credential values. */
export function loadConnectionRegistry(environment: NodeJS.ProcessEnv = process.env): ConnectionRegistry {
  const raw = environment.AXEON_CONNECTION_DEFINITIONS;
  if (!raw) return createConnectionRegistry([]);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new ConnectionConfigurationError('invalid-definition'); }
  if (!Array.isArray(parsed)) throw new ConnectionConfigurationError('invalid-definition');
  const definitions = parsed.map(parseDefinition);
  for (const definition of definitions) {
    if (!environment[definition.credentialEnvironmentVariable]) throw new ConnectionConfigurationError('missing-credential');
  }
  return createConnectionRegistry(definitions);
}

export function createConnectionRegistry(definitions: readonly ApprovedConnectionDefinition[]): ConnectionRegistry {
  const entries = new Map<string, ApprovedConnectionDefinition>();
  for (const definition of definitions) {
    if (entries.has(definition.id)) throw new ConnectionConfigurationError('invalid-definition');
    entries.set(definition.id, definition);
  }
  const values = Object.freeze([...entries.values()]);
  return Object.freeze({ list: () => values, get: (id: string) => entries.get(id) });
}

/** Server provider implementations call this immediately before opening a lease; it is never sent to the browser. */
export function resolveConnectionCredential(definition: ApprovedConnectionDefinition, environment: NodeJS.ProcessEnv = process.env): string {
  const credential = environment[definition.credentialEnvironmentVariable];
  if (!credential) throw new ConnectionConfigurationError('missing-credential');
  return credential;
}
