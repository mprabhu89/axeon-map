import { AXEON_RELEASE } from '../product/releaseMetadata';

export type AxeonLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
export type AxeonLogEventCode = 'AX-SEC-ADAPTER-REJECTED' | 'AX-SEC-REPORT-SNAPSHOT-REJECTED' | 'AX-SEC-PERSISTED-STATE-REJECTED' | 'AX-SEC-PROVIDER-REJECTED' | 'AX-SEC-CSV-FORMULA-SANITIZED' | 'AX-TECH-REPORT-OPEN-FAILED';
export interface AxeonLogMetadata {
  readonly eventCode: AxeonLogEventCode;
  readonly component: 'adapter' | 'report' | 'persistence' | 'ai' | 'export';
  readonly operation: string;
  readonly result: 'rejected' | 'failed' | 'sanitized';
  readonly correlationId?: string;
  readonly errorCode?: 'unavailable' | 'unauthorized' | 'invalid-context' | 'unsupported-capability' | 'transient' | 'unknown';
  readonly adapterId?: 'mock' | 'real-maximo';
  readonly adapterMode?: 'development' | 'production';
  readonly aiProviderId?: string;
  readonly securityScope?: 'development-marker' | 'maximo-authorized' | 'not-configured';
}
export interface AxeonLogEvent { readonly timestamp: string; readonly level: AxeonLogLevel; readonly version: string; readonly metadata: AxeonLogMetadata }
export type AxeonLogSink = (event: AxeonLogEvent) => void;
type MutableAxeonLogMetadata = { -readonly [Key in keyof AxeonLogMetadata]: AxeonLogMetadata[Key] };
const primitive = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 80;

export function createCorrelationId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return `axc-${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** Allowlisted metadata prevents logging of arbitrary operational values or exception objects. */
export function sanitizeLogMetadata(input: AxeonLogMetadata): AxeonLogMetadata {
  const safe: MutableAxeonLogMetadata = { eventCode: input.eventCode, component: input.component, operation: primitive(input.operation) ? input.operation : 'unknown', result: input.result };
  if (primitive(input.correlationId) && /^axc-[a-f0-9]{16}$/.test(input.correlationId)) safe.correlationId = input.correlationId;
  if (input.errorCode) safe.errorCode = input.errorCode;
  if (input.adapterId) safe.adapterId = input.adapterId;
  if (input.adapterMode) safe.adapterMode = input.adapterMode;
  if (primitive(input.aiProviderId)) safe.aiProviderId = input.aiProviderId;
  if (input.securityScope) safe.securityScope = input.securityScope;
  return safe;
}

function browserSink(event: AxeonLogEvent): void {
  // Tests exercise rejected and tampered inputs deliberately; their injected sinks
  // assert events without making the test runner output operational metadata.
  if (import.meta.env.MODE === 'test') return;
  if (import.meta.env.PROD && event.level === 'DEBUG') return;
  (event.level === 'ERROR' || event.level === 'SECURITY' || event.level === 'WARN' ? console.warn : console.info)('[Axeon]', event);
}

export function createAxeonLogger(sink: AxeonLogSink = browserSink) {
  const emit = (level: AxeonLogLevel, metadata: AxeonLogMetadata) => sink(Object.freeze({ timestamp: new Date().toISOString(), level, version: AXEON_RELEASE.version, metadata: sanitizeLogMetadata(metadata) }));
  return Object.freeze({ debug: (metadata: AxeonLogMetadata) => emit('DEBUG', metadata), info: (metadata: AxeonLogMetadata) => emit('INFO', metadata), warn: (metadata: AxeonLogMetadata) => emit('WARN', metadata), error: (metadata: AxeonLogMetadata) => emit('ERROR', metadata), security: (metadata: AxeonLogMetadata) => emit('SECURITY', metadata) });
}

export const axeonLogger = createAxeonLogger();
