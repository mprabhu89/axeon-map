import { expect, test } from 'vitest';
import { analyzeContextWithMetadata } from '../analytics/analyzeContext';
import { MOCK_SECURITY_CONTEXT } from './maximoAdapter';
import { mockMaximoAdapter } from './mockMaximoAdapter';

const scope = MOCK_SECURITY_CONTEXT;

test('Work Type discovery returns the deterministic adapter-side PM, CM, and EM values', async () => {
  const response = await mockMaximoAdapter.filterValues!({ path: [], dimension: 'Work Type', maxValues: 50, securityScope: scope });
  expect(response.values).toEqual([
    { value: 'CM', count: 1215 },
    { value: 'PM', count: 564 },
    { value: 'EM', count: 221 },
  ]);
  expect(response.totalValues).toBe(3);
});

test('filter aggregation uses OR within a dimension and AND across dimensions', async () => {
  const [cm, em, reactive, reactivePriority] = await Promise.all([
    mockMaximoAdapter.explore({ path: [], filters: [{ dimension: 'Work Type', values: ['CM'] }], nextDimension: null, maxGroups: 16, securityScope: scope }),
    mockMaximoAdapter.explore({ path: [], filters: [{ dimension: 'Work Type', values: ['EM'] }], nextDimension: null, maxGroups: 16, securityScope: scope }),
    mockMaximoAdapter.explore({ path: [], filters: [{ dimension: 'Work Type', values: ['CM', 'EM'] }], nextDimension: null, maxGroups: 16, securityScope: scope }),
    mockMaximoAdapter.explore({ path: [], filters: [{ dimension: 'Work Type', values: ['CM', 'EM'] }, { dimension: 'Priority', values: ['1'] }], nextDimension: null, maxGroups: 16, securityScope: scope }),
  ]);
  expect(reactive.totalCount).toBe(cm.totalCount + em.totalCount);
  expect(reactivePriority.totalCount).toBeGreaterThan(0);
  expect(reactivePriority.totalCount).toBeLessThan(reactive.totalCount);
});

test('filter discovery is bounded and adapter-side while preview, export, and analytics share the exact context', async () => {
  const filters = [{ dimension: 'Work Type', values: ['CM', 'EM'] }, { dimension: 'Priority', values: ['1'] }] as const;
  const path = [{ dimension: 'Site', value: 'SITE-A' }] as const;
  const discovered = await mockMaximoAdapter.filterValues!({ path, filters, dimension: 'Status', maxValues: 3, securityScope: scope });
  expect(discovered.values.length).toBeLessThanOrEqual(3);
  const aggregate = await mockMaximoAdapter.explore({ path, filters, nextDimension: null, maxGroups: 16, securityScope: scope });
  const preview = await mockMaximoAdapter.previewRecords({ path, filters, maxRecords: 20, offset: 0, securityScope: scope });
  const exported = await mockMaximoAdapter.exportRecords({ path, filters, securityScope: scope });
  const analysis = await analyzeContextWithMetadata(mockMaximoAdapter, path, filters);
  expect(preview.totalCount).toBe(aggregate.totalCount);
  expect(preview.records).toHaveLength(Math.min(20, aggregate.totalCount));
  expect(preview.records.every((record) => record.site === 'SITE-A' && record.priority === 1)).toBe(true);
  expect(exported.recordCount).toBe(aggregate.totalCount);
  expect(exported.content.trimEnd().split('\r\n')).toHaveLength(aggregate.totalCount + 1);
  expect(analysis.findings.every((finding) => finding.filters?.length === 2)).toBe(true);
});

test('filtering can remove a deterministic finding without changing detector thresholds', async () => {
  const path = [{ dimension: 'Site', value: 'SITE-D' }] as const;
  const unfiltered = await analyzeContextWithMetadata(mockMaximoAdapter, path);
  const plannedOnly = await analyzeContextWithMetadata(mockMaximoAdapter, path, [{ dimension: 'Work Type', values: ['PM'] }]);
  expect(unfiltered.findings.some((finding) => finding.lens === 'Work Mix')).toBe(true);
  expect(plannedOnly.findings.some((finding) => finding.lens === 'Work Mix')).toBe(false);
});


