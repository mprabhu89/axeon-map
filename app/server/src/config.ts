import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export type ServerEnvironment = 'development' | 'test' | 'production';
export type FutureDatabaseProvider = 'none' | 'db2' | 'sql-server';

export interface SyntheticDatabaseConfiguration {
  readonly enabled: boolean;
  /** Local fictitious fixture path only; never a customer database path or credential. */
  readonly filePath: string;
}

export interface FutureDatabaseConfiguration {
  readonly provider: FutureDatabaseProvider;
  readonly enabled: boolean;
  /** Server-side secret/configuration reference only; never a credential value. */
  readonly connectionReference?: string;
}

export interface FutureMaximoConfiguration {
  readonly enabled: boolean;
  readonly integrationReference?: string;
}

export interface FutureAIConfiguration {
  readonly enabled: boolean;
  readonly providerReference?: string;
}

export interface AxeonServerConfiguration {
  readonly environment: ServerEnvironment;
  readonly host: string;
  readonly port: number;
  readonly staticDirectory: string;
  readonly maxRequestBodyBytes: number;
  /** Local development account storage. This is a path, never a credential. */
  readonly accountStorePath: string;
  readonly session: Readonly<{
    readonly maxLifetimeMs: number;
    readonly inactivityTimeoutMs: number;
    readonly secureCookies: boolean;
  }>;
  readonly syntheticDatabase: SyntheticDatabaseConfiguration;
  readonly database: FutureDatabaseConfiguration;
  readonly maximo: FutureMaximoConfiguration;
  readonly ai: FutureAIConfiguration;
}

const validEnvironments = new Set<ServerEnvironment>(['development', 'test', 'production']);
const moduleDirectory = dirname(fileURLToPath(import.meta.url));

/**
 * Server state must have one stable default regardless of the directory from
 * which a built server command is launched. Source tests execute from
 * `app/server/src`; built server commands execute from `app/server/dist/server/src`.
 */
export function resolveAxeonApplicationRoot(): string {
  return resolve(moduleDirectory, moduleDirectory.includes(`${sep}dist${sep}`) ? '../../../..' : '../..');
}

const applicationRoot = resolveAxeonApplicationRoot();
const parsePort = (value: string | undefined): number => {
  const parsed = Number(value ?? '3000');
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error('AXEON_SERVER_PORT must be an integer from 1 to 65535.');
  return parsed;
};
const parseEnvironment = (value: string | undefined): ServerEnvironment => {
  const environment = value ?? 'development';
  if (!validEnvironments.has(environment as ServerEnvironment)) throw new Error('NODE_ENV must be development, test, or production.');
  return environment as ServerEnvironment;
};
const parseBoolean = (value: string | undefined, name: string): boolean => {
  if (value === undefined) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false.`);
};
const safeReference = (value: string | undefined, name: string): string | undefined => {
  if (value === undefined || value === '') return undefined;
  if (!/^[A-Za-z0-9._/-]{1,120}$/.test(value)) throw new Error(`${name} must be a safe server-side reference.`);
  return value;
};

/** Loads non-secret server configuration. Credentials are intentionally absent from this contract. */
export function loadServerConfiguration(environment: NodeJS.ProcessEnv = process.env): AxeonServerConfiguration {
  const runtimeEnvironment = parseEnvironment(environment.NODE_ENV);
  const databaseProvider = (environment.AXEON_DATABASE_PROVIDER ?? 'none') as FutureDatabaseProvider;
  if (!['none', 'db2', 'sql-server'].includes(databaseProvider)) throw new Error('AXEON_DATABASE_PROVIDER is unsupported.');
  const databaseEnabled = parseBoolean(environment.AXEON_DATABASE_ENABLED, 'AXEON_DATABASE_ENABLED');
  if (databaseEnabled && databaseProvider === 'none') throw new Error('A database provider is required when database access is enabled.');
  const host = environment.AXEON_SERVER_HOST ?? '127.0.0.1';
  const syntheticDatabaseEnabled = parseBoolean(environment.AXEON_SYNTHETIC_DATABASE_ENABLED, 'AXEON_SYNTHETIC_DATABASE_ENABLED');
  if (syntheticDatabaseEnabled && runtimeEnvironment === 'production') throw new Error('Synthetic SQLite mode is not available in production.');
  if (!/^[A-Za-z0-9.:-]{1,255}$/.test(host)) throw new Error('AXEON_SERVER_HOST is invalid.');
  return Object.freeze({
    environment: runtimeEnvironment,
    host,
    port: parsePort(environment.AXEON_SERVER_PORT),
    staticDirectory: resolve(environment.AXEON_STATIC_DIRECTORY ?? resolve(applicationRoot, 'dist')),
    maxRequestBodyBytes: 16 * 1024,
    accountStorePath: resolve(environment.AXEON_ACCOUNT_STORE_PATH ?? resolve(applicationRoot, '.axeon-local-accounts.json')),
    session: Object.freeze({
      maxLifetimeMs: 8 * 60 * 60 * 1000,
      inactivityTimeoutMs: 30 * 60 * 1000,
      secureCookies: environment.AXEON_COOKIE_SECURE === undefined ? runtimeEnvironment === 'production' : parseBoolean(environment.AXEON_COOKIE_SECURE, 'AXEON_COOKIE_SECURE'),
    }),
    syntheticDatabase: Object.freeze({
      enabled: syntheticDatabaseEnabled,
      filePath: resolve(environment.AXEON_SYNTHETIC_DATABASE_PATH ?? resolve(applicationRoot, '.axeon-synthetic-work-orders.sqlite')),
    }),
    database: Object.freeze({ provider: databaseProvider, enabled: databaseEnabled, connectionReference: safeReference(environment.AXEON_DATABASE_CONNECTION_REFERENCE, 'AXEON_DATABASE_CONNECTION_REFERENCE') }),
    maximo: Object.freeze({ enabled: parseBoolean(environment.AXEON_MAXIMO_ENABLED, 'AXEON_MAXIMO_ENABLED'), integrationReference: safeReference(environment.AXEON_MAXIMO_INTEGRATION_REFERENCE, 'AXEON_MAXIMO_INTEGRATION_REFERENCE') }),
    ai: Object.freeze({ enabled: parseBoolean(environment.AXEON_AI_ENABLED, 'AXEON_AI_ENABLED'), providerReference: safeReference(environment.AXEON_AI_PROVIDER_REFERENCE, 'AXEON_AI_PROVIDER_REFERENCE') }),
  });
}
