import { expect, test } from 'vitest';
import { createAxeonLogger, createCorrelationId, sanitizeLogMetadata } from './logger';

test('structured logging keeps only allowlisted metadata and never serializes sensitive-looking fields', () => {
  const events: unknown[] = [];
  const logger = createAxeonLogger((event) => events.push(event));
  logger.security({
    eventCode: 'AX-SEC-REPORT-SNAPSHOT-REJECTED', component: 'report', operation: 'snapshot-validation', result: 'rejected',
    correlationId: createCorrelationId(),
    ...( { token: 'should-not-log', records: [{ id: 'WO-1' }], error: new Error('secret') } as object ),
  } as never);
  const serialized = JSON.stringify(events[0]);
  expect(serialized).toContain('AX-SEC-REPORT-SNAPSHOT-REJECTED');
  expect(serialized).not.toMatch(/should-not-log|WO-1|secret|"records"|"token"/);
});

test('correlation IDs are opaque diagnostic identifiers and invalid optional metadata is discarded', () => {
  const id = createCorrelationId();
  expect(id).toMatch(/^axc-[a-f0-9]{16}$/);
  expect(id).not.toMatch(/SITE|WO|user|@/i);
  const safe = sanitizeLogMetadata({ eventCode: 'AX-TECH-REPORT-OPEN-FAILED', component: 'report', operation: 'x'.repeat(81), result: 'failed', correlationId: 'SITE-A' });
  expect(safe).toEqual({ eventCode: 'AX-TECH-REPORT-OPEN-FAILED', component: 'report', operation: 'unknown', result: 'failed' });
});
