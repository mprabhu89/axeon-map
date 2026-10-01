import { expect, test } from 'vitest';
import { AXEON_RELEASE } from '../product/releaseMetadata';
import type { InvestigationReport } from './contracts';
import {
  REPORT_SNAPSHOT_INDEX_KEY,
  REPORT_SNAPSHOT_LIMIT,
  REPORT_SNAPSHOT_MAX_BYTES,
  REPORT_SNAPSHOT_NAMESPACE,
  REPORT_SNAPSHOT_SCHEMA_VERSION,
  REPORT_SNAPSHOT_TTL_MS,
  cleanupReportSnapshots,
  readReportSnapshot,
  writeReportSnapshot,
} from './reportSnapshot';
import { parseReportRoute, reportWindowUrl } from './reportWindow';
import { memoryStorage } from '../test/reportWindowTestUtils';

const report = (label = 'SITE-A'): InvestigationReport => ({
  schemaVersion: 1,
  release: AXEON_RELEASE,
  title: 'Operational Investigation Report',
  context: {
    path: [{ dimension: 'Site', value: label }],
    pathLabels: ['Work Orders', `Site: ${label}`],
    nodeType: 'Site',
    nodeLabel: label,
    population: 560,
    filters: [{ dimension: 'Work Type', values: ['CM', 'EM'] }],
  },
  securityScope: { kind: 'current-user', enforcement: 'development-marker', source: 'mock-adapter', label: 'Current permitted data' },
  generatedAt: '2026-09-20T10:00:00.000Z',
  referenceTime: '2026-06-30T12:00:00.000Z',
  provenance: { mode: 'synthetic-local', label: 'Synthetic local evidence', authorizedRealMaximoData: false },
  kpis: [{ id: 'total-work-orders', label: 'Total Work Orders', value: 560, displayValue: '560', detail: 'Exact represented population.' }],
  charts: [],
  findings: [],
  suggestedNextAreas: ['Inspect status distribution'],
  limitations: ['Synthetic local evidence only.'],
});

test('snapshot round trip is namespaced, versioned, bounded, exact, and excludes raw records', () => {
  const storage = memoryStorage();
  writeReportSnapshot(storage, 'report-A123', report(), 1_000);
  const serialized = storage.getItem(`${REPORT_SNAPSHOT_NAMESPACE}report-A123`)!;
  expect(serialized.length).toBeLessThan(REPORT_SNAPSHOT_MAX_BYTES);
  expect(serialized).not.toContain('"records"');
  expect(serialized).not.toMatch(/SYN-WO-/);
  expect(JSON.parse(serialized).schemaVersion).toBe(REPORT_SNAPSHOT_SCHEMA_VERSION);
  expect(readReportSnapshot(storage, 'report-A123', 1_001)).toEqual({ status: 'ready', report: report() });
  const unsafe = { ...report(), provenance: { ...report().provenance, records: [{ id: 'WO-1' }] } } as unknown as InvestigationReport;
  expect(() => writeReportSnapshot(storage, 'unsafe-123', unsafe, 1_000)).toThrow('Invalid report snapshot');
});

test('missing, malformed, unknown-schema, expired, and oversized snapshots fail closed', () => {
  const storage = memoryStorage();
  expect(readReportSnapshot(storage, 'missing-123')).toEqual({ status: 'missing' });
  storage.setItem(`${REPORT_SNAPSHOT_NAMESPACE}malformed-1`, '{');
  expect(readReportSnapshot(storage, 'malformed-1')).toEqual({ status: 'invalid' });
  storage.setItem(`${REPORT_SNAPSHOT_NAMESPACE}unknown-12`, JSON.stringify({ schemaVersion: 99 }));
  expect(readReportSnapshot(storage, 'unknown-12')).toEqual({ status: 'invalid' });
  storage.setItem(`${REPORT_SNAPSHOT_NAMESPACE}oversized1`, 'x'.repeat(REPORT_SNAPSHOT_MAX_BYTES + 1));
  expect(readReportSnapshot(storage, 'oversized1')).toEqual({ status: 'invalid' });
  writeReportSnapshot(storage, 'expired-12', report(), 2_000);
  expect(readReportSnapshot(storage, 'expired-12', 2_000 + REPORT_SNAPSHOT_TTL_MS)).toEqual({ status: 'expired' });
});

test('multiple unique reports remain immutable and cleanup enforces the snapshot limit', () => {
  const storage = memoryStorage();
  for (let index = 0; index < REPORT_SNAPSHOT_LIMIT + 2; index += 1) {
    writeReportSnapshot(storage, `report-${String(index).padStart(3, '0')}`, report(`SITE-${index}`), 10_000 + index);
  }
  cleanupReportSnapshots(storage, 20_000);
  const index = JSON.parse(storage.getItem(REPORT_SNAPSHOT_INDEX_KEY) ?? '[]') as { reportId: string }[];
  expect(index).toHaveLength(REPORT_SNAPSHOT_LIMIT);
  expect(readReportSnapshot(storage, 'report-000', 20_000).status).toBe('missing');
  expect(readReportSnapshot(storage, 'report-002', 20_000)).toEqual({ status: 'ready', report: report('SITE-2') });
  expect(readReportSnapshot(storage, 'report-007', 20_000)).toEqual({ status: 'ready', report: report('SITE-7') });
});

test('report URL carries only an opaque key and route parsing rejects malformed context', () => {
  const url = reportWindowUrl('https://axeon.example/app?tenant=safe', 'ready', 'report-A123');
  expect(url).toBe('https://axeon.example/app#/report/ready/report-A123');
  expect(url).not.toContain('tenant');
  expect(url).not.toContain('SITE-A');
  expect(url).not.toContain('Work%20Type');
  expect(parseReportRoute(new URL(url).hash)).toEqual({ mode: 'ready', reportId: 'report-A123' });
  expect(parseReportRoute('#/report/ready/../root')).toBeNull();
});
