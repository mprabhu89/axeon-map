import { expect, test } from 'vitest';
import { createMockMaximoAdapter } from '../data/mockMaximoAdapter';
import { MOCK_SECURITY_CONTEXT, type ExplorationRequest, type MaximoAdapter } from '../data/maximoAdapter';
import { generateSyntheticWorkOrders } from '../data/syntheticWorkOrders';
import { availableDimensions } from './exploration';

const baseRequest: ExplorationRequest = {
  path: [], nextDimension: null, maxGroups: 16, securityScope: MOCK_SECURITY_CONTEXT,
};

test('Mock Adapter satisfies the read-only contract and returns bounded Site aggregates', async () => {
  const adapter: MaximoAdapter = createMockMaximoAdapter();
  const response = await adapter.explore({ ...baseRequest, nextDimension: 'Site' });
  expect(response).toEqual({
    totalCount: 2000,
    groups: [
      { value: 'SITE-A', count: 560 }, { value: 'SITE-B', count: 430 },
      { value: 'SITE-C', count: 360 }, { value: 'SITE-D', count: 280 },
      { value: 'SITE-E', count: 220 }, { value: 'SITE-F', count: 150 },
    ],
    totalGroups: 6,
  });
  expect(Object.keys(response).sort()).toEqual(['groups', 'totalCount', 'totalGroups']);
});

test('larger dataset has varied status distribution and repeatable records', async () => {
  const first = generateSyntheticWorkOrders();
  const second = generateSyntheticWorkOrders();
  expect(first).toEqual(second);
  expect(first).toHaveLength(2000);
  expect(new Set(first.map((record) => record.id)).size).toBe(2000);
  expect(new Set(first.map((record) => record.asset)).size).toBeLessThan(100);
  expect(first.filter((record) => record.site === 'SITE-A' && record.classification === 'Electrical').length)
    .toBeGreaterThan(first.filter((record) => record.site === 'SITE-A' && record.classification === 'Mechanical').length);
  expect(first.filter((record) => record.site === 'SITE-B' && record.classification === 'Mechanical').length)
    .toBeGreaterThan(first.filter((record) => record.site === 'SITE-B' && record.classification === 'Electrical').length);
  const response = await createMockMaximoAdapter().explore({ ...baseRequest, nextDimension: 'Status' });
  expect(response.groups.reduce((total, group) => total + group.count, 0)).toBe(2000);
  expect(new Set(response.groups.map((group) => group.count)).size).toBeGreaterThan(1);
});

test('path filters apply before a second-level aggregate', async () => {
  const response = await createMockMaximoAdapter().explore({
    ...baseRequest, path: [{ dimension: 'Site', value: 'SITE-A' }], nextDimension: 'Priority',
  });
  expect(response.totalCount).toBe(560);
  expect(response.groups.reduce((total, group) => total + group.count, 0)).toBe(560);
  expect(response.groups.length).toBeGreaterThan(1);
});

test('different dimension orders produce the same filtered-path aggregate', async () => {
  const adapter = createMockMaximoAdapter();
  const first = await adapter.explore({ ...baseRequest, path: [
    { dimension: 'Site', value: 'SITE-A' }, { dimension: 'Status', value: 'WAPPR' },
  ], nextDimension: 'Classification' });
  const second = await adapter.explore({ ...baseRequest, path: [
    { dimension: 'Status', value: 'WAPPR' }, { dimension: 'Site', value: 'SITE-A' },
  ], nextDimension: 'Classification' });
  expect(first).toEqual(second);
  expect(first.totalCount).toBeGreaterThan(0);
  expect(availableDimensions([{ dimension: 'Site', value: 'SITE-A' }])).not.toContain('Site');
});

test('adapter limits visible groups without sending all records', async () => {
  const response = await createMockMaximoAdapter().explore({ ...baseRequest, nextDimension: 'Asset' });
  expect(response.groups).toHaveLength(16);
  expect(response.totalGroups).toBeGreaterThan(16);
  expect(response).not.toHaveProperty('records');
});

