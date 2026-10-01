import { expect, test } from 'vitest';
import { createMockMaximoAdapter } from './mockMaximoAdapter';
import { MOCK_SECURITY_CONTEXT } from './maximoAdapter';
import { generateSyntheticWorkOrders } from './syntheticWorkOrders';

const scope = MOCK_SECURITY_CONTEXT;

test('Mock Adapter returns a bounded root preview and an independent total', async () => {
  const adapter = createMockMaximoAdapter();
  const result = await adapter.previewRecords({ path: [], maxRecords: 2000, offset: 0, securityScope: scope });
  expect(result.totalCount).toBe(2000);
  expect(result.records).toHaveLength(20);
  expect(Object.keys(result).sort()).toEqual(['records', 'totalCount']);
  expect(Object.keys(result.records[0]!).sort()).toEqual([
    'asset', 'classification', 'id', 'location', 'priority', 'site', 'status',
  ]);
});

test('Mock Adapter filters before retrieval and keeps only the requested subset', async () => {
  const adapter = createMockMaximoAdapter();
  const path = [
    { dimension: 'Site', value: 'SITE-A' },
    { dimension: 'Status', value: 'WAPPR' },
  ] as const;
  const result = await adapter.previewRecords({ path, maxRecords: 7, offset: 0, securityScope: scope });
  const expected = generateSyntheticWorkOrders().filter((record) => record.site === 'SITE-A' && record.status === 'WAPPR');
  expect(result.totalCount).toBe(expected.length);
  expect(result.records).toHaveLength(7);
  expect(result.records.every((record) => record.site === 'SITE-A' && record.status === 'WAPPR')).toBe(true);
  expect(result.records.map(({ id }) => id)).toEqual(expected.slice(0, 7).map(({ id }) => id));
});

test('Mock Adapter returns first, second, and final Site pages without widening each response', async () => {
  const adapter = createMockMaximoAdapter();
  const path = [{ dimension: 'Site', value: 'SITE-A' }] as const;
  const expected = generateSyntheticWorkOrders().filter((record) => record.site === 'SITE-A');
  for (const offset of [0, 20, 540]) {
    const result = await adapter.previewRecords({ path, maxRecords: 20, offset, securityScope: scope });
    expect(result.totalCount).toBe(560);
    expect(result.records).toHaveLength(20);
    expect(result.records.map(({ id }) => id)).toEqual(expected.slice(offset, offset + 20).map(({ id }) => id));
  }
  const pastEnd = await adapter.previewRecords({ path, maxRecords: 20, offset: 560, securityScope: scope });
  expect(pastEnd.totalCount).toBe(560);
  expect(pastEnd.records).toHaveLength(0);
});

test('explicit export contains every matching Site record and no other Site', async () => {
  const adapter = createMockMaximoAdapter();
  const path = [{ dimension: 'Site', value: 'SITE-A' }] as const;
  const exported = await adapter.exportRecords({ path, securityScope: scope });
  expect(exported.fileName).toBe('axeon-work-orders-site-site-a.csv');
  expect(exported.contentType).toBe('text/csv');
  expect(exported.recordCount).toBe(560);
  expect(exported.content.charCodeAt(0)).toBe(0xfeff);
  const lines = exported.content.slice(1).trimEnd().split('\r\n');
  expect(lines).toHaveLength(561);
  expect(lines[0]).toBe('"Work Order","Site","Status","Priority","Classification","Location","Asset"');
  expect(lines.slice(1).every((line) => line.includes('"SITE-A"') && !line.includes('"SITE-B"'))).toBe(true);
});


