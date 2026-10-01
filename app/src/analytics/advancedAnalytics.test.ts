import { expect, test } from 'vitest';
import type { WorkOrderAnalyticalEvidence } from '../data/workOrderEvidence';
import { MOCK_SECURITY_CONTEXT } from '../data/maximoAdapter';
import { createMockMaximoAdapter } from '../data/mockMaximoAdapter';
import type { PathSegment } from '../model/exploration';
import { analyzeContext, orderFindings } from './analyzeContext';
import {
  detectOperationalDataQuality, detectOperationalExposure, detectOptimizationOpportunity,
  detectReliabilityPattern, workMixCounts,
} from './detectors';

const adapter = createMockMaximoAdapter();
const referenceTime = '2026-09-01T00:00:00.000Z';
const scope = MOCK_SECURITY_CONTEXT;
const path = (dimension: PathSegment['dimension'], value: string): PathSegment[] => [{ dimension, value }];
const base: WorkOrderAnalyticalEvidence = {
  id: 'TEST-001', site: 'TEST-SITE', status: 'INPRG', priority: 2,
  classification: 'Mechanical', location: 'TEST-LOC', asset: 'GENERIC-ASSET', workType: 'CM',
  reportDate: '2026-08-15T00:00:00.000Z', statusDate: '2026-08-20T00:00:00.000Z',
  targetStart: '2026-08-16T00:00:00.000Z', targetFinish: '2026-08-25T00:00:00.000Z',
  actualStart: '2026-08-18T00:00:00.000Z', actualFinish: null,
};

test('Task 010 ground truths and authorized baseline remain unchanged', async () => {
  const siteA = await analyzeContext(adapter, path('Site', 'SITE-A'));
  const asset = await analyzeContext(adapter, path('Asset', 'A-PUMP-01'));
  const siteC = await analyzeContext(adapter, path('Site', 'SITE-C'));
  const siteD = await analyzeContext(adapter, path('Site', 'SITE-D'));
  expect(siteA.find((finding) => finding.lens === 'Backlog & Aging')?.affectedCount).toBe(29);
  expect(siteA.find((finding) => finding.lens === 'Backlog & Aging')?.populationCount).toBe(225);
  expect(asset.find((finding) => finding.lens === 'Repeat Work')?.affectedCount).toBe(15);
  expect(siteC.find((finding) => finding.lens === 'Process Bottleneck')?.affectedCount).toBe(9);
  expect(siteC.find((finding) => finding.lens === 'Process Bottleneck')?.populationCount).toBe(13);
  expect(siteD.find((finding) => finding.lens === 'Work Mix')?.metric.value).toBeCloseTo(85.3571428571);
  const root = await adapter.analyticalEvidence({ path: [], securityScope: scope });
  expect(root.baseline.reactiveCount / root.baseline.eligibleCount * 100).toBeCloseTo(71.8);
});

test('Reliability detects a generic sustained pattern and returns structured history', async () => {
  const finding = (await analyzeContext(adapter, path('Asset', 'A-PUMP-01')))
    .find((item) => item.lens === 'Reliability');
  expect(finding).toMatchObject({
    ruleId: 'AX-ANA-REL-001', affectedCount: 37, populationCount: 37,
    metric: { key: 'historicalReactiveCount', value: 37, unit: 'orders' },
  });
  expect(finding?.evidence).toMatchObject({ asset: 'A-PUMP-01', activePeriods: 3, periodDays: 60 });
  expect(finding?.thresholds).toContainEqual({ key: 'lookbackDays', operator: '<=', value: 180, unit: 'days' });

  const generic = Array.from({ length: 35 }, (_, index) => ({ ...base, id: `GEN-${index}`,
    asset: 'UNPLANTED-ASSET', reportDate: index % 3 === 0 ? '2026-08-15T00:00:00.000Z'
      : index % 3 === 1 ? '2026-06-15T00:00:00.000Z' : '2026-04-15T00:00:00.000Z' }));
  expect(detectReliabilityPattern(generic, [], referenceTime)[0]?.evidence.asset).toBe('UNPLANTED-ASSET');
});

test('short-term repetition and PM-only history do not qualify as Reliability', () => {
  const shortTerm = Array.from({ length: 35 }, (_, index) => ({ ...base, id: `SHORT-${index}` }));
  const planned = shortTerm.map((record) => ({ ...record, workType: 'PM' }));
  expect(detectReliabilityPattern(shortTerm, [], referenceTime)).toEqual([]);
  expect(detectReliabilityPattern(planned, [], referenceTime)).toEqual([]);
});

test('Risk derives SITE-F high-priority unresolved aged exposure without unsupported claims', async () => {
  const finding = (await analyzeContext(adapter, path('Site', 'SITE-F'))).find((item) => item.lens === 'Risk');
  expect(finding).toMatchObject({
    ruleId: 'AX-ANA-RISK-001', title: 'High-priority unresolved work exposure',
    affectedCount: 9, populationCount: 16,
  });
  expect(finding?.thresholds).toEqual(expect.arrayContaining([
    { key: 'priorityMaximum', operator: '<=', value: 1, unit: 'priority' },
    { key: 'reportAgeDays', operator: '>=', value: 60, unit: 'days' },
    { key: 'affectedCount', operator: '>=', value: 8, unit: 'orders' },
  ]));
  expect(JSON.stringify(finding)).not.toMatch(/safety|financial|regulatory|failure probability|critical/i);
});

test('one high-priority order and completed high-priority work do not qualify as Risk', () => {
  const exposed = { ...base, priority: 1, status: 'WAPPR', reportDate: '2026-06-01T00:00:00.000Z',
    targetFinish: '2026-06-15T00:00:00.000Z', actualStart: null, actualFinish: null };
  const completed = { ...exposed, id: 'DONE', status: 'COMP', actualStart: '2026-06-05T00:00:00.000Z',
    actualFinish: '2026-06-10T00:00:00.000Z' };
  expect(detectOperationalExposure([exposed, completed], [], referenceTime)).toEqual([]);
});

test('Data Quality quantifies missing reactive asset references and ignores valid lifecycle nulls', async () => {
  const response = await adapter.analyticalEvidence({ path: path('Site', 'SITE-E'), securityScope: scope });
  const finding = detectOperationalDataQuality(response.evidence, path('Site', 'SITE-E'), referenceTime)[0];
  expect(finding).toMatchObject({
    ruleId: 'AX-ANA-DQ-001', affectedCount: 13, populationCount: 145,
    metric: { key: 'missingAssetPercent', unit: 'percent' },
  });
  expect(finding?.metric.value).toBeCloseTo(8.9655172414);
  expect(finding?.evidence).toMatchObject({ fieldCategory: 'asset', missingAssetCount: 13, evaluatedReactiveCount: 145 });
  const validLifecycleNulls = Array.from({ length: 12 }, (_, index) => ({ ...base, id: `VALID-${index}`,
    asset: 'VALID-ASSET', status: 'WAPPR', targetStart: null, targetFinish: null, actualStart: null, actualFinish: null }));
  expect(detectOperationalDataQuality(validLifecycleNulls, [], referenceTime)).toEqual([]);
  expect(JSON.stringify(finding)).not.toContain('SYN-WO-');
});

test('missing assets aggregate safely without blank or null graph nodes', async () => {
  const aggregate = await adapter.explore({ path: path('Site', 'SITE-E'), nextDimension: 'Asset', maxGroups: 16, securityScope: scope });
  expect(aggregate.groups.find((group) => group.value === '(Unspecified)')?.count).toBe(13);
  expect(aggregate.groups.some((group) => !group.value.trim() || group.value === 'null')).toBe(false);
});

test('Optimization derives SITE-D concentration without a composite score or prescription', async () => {
  const response = await adapter.analyticalEvidence({ path: path('Site', 'SITE-D'), securityScope: scope });
  const finding = detectOptimizationOpportunity(response.evidence, path('Site', 'SITE-D'), referenceTime)[0];
  expect(finding).toMatchObject({
    ruleId: 'AX-ANA-OPT-001', title: 'Reactive workload concentration opportunity',
    affectedCount: 73, populationCount: 239,
  });
  expect(finding?.metric.value).toBeCloseTo(30.5439330544);
  expect(finding?.comparison?.value).toBeCloseTo(85.3571428571);
  expect(finding?.evidence).toMatchObject({ topAssetCount: 3, concentratedReactiveCount: 73, reactiveCount: 239 });
  expect(JSON.stringify(finding)).not.toMatch(/score|replace|frequency|headcount|inventory|spend/i);
  const siteB = await adapter.analyticalEvidence({ path: path('Site', 'SITE-B'), securityScope: scope });
  expect(detectOptimizationOpportunity(siteB.evidence, path('Site', 'SITE-B'), referenceTime)).toEqual([]);
});

test('all eight lenses share one finding model and ordering is reproducible', async () => {
  const findings = [
    ...await analyzeContext(adapter, path('Site', 'SITE-A')),
    ...await analyzeContext(adapter, path('Site', 'SITE-C')),
    ...await analyzeContext(adapter, path('Site', 'SITE-D')),
    ...await analyzeContext(adapter, path('Site', 'SITE-E')),
    ...await analyzeContext(adapter, path('Site', 'SITE-F')),
  ];
  expect(new Set(findings.map((finding) => finding.lens))).toEqual(new Set([
    'Backlog & Aging', 'Repeat Work', 'Process Bottleneck', 'Work Mix',
    'Reliability', 'Risk', 'Data Quality', 'Optimization',
  ]));
  expect(findings.every((finding) => finding.id && finding.ruleId && finding.context
    && finding.metric && finding.thresholds.length && finding.referenceTime === referenceTime)).toBe(true);
  expect(orderFindings(findings)).toEqual(orderFindings([...findings].reverse()));
  expect((await analyzeContext(adapter, path('Site', 'SITE-B')))).toEqual([]);
});

test('authorized analytical evidence is requested once for all applicable detectors', async () => {
  let requests = 0;
  const singleRequestAdapter = { ...adapter, analyticalEvidence: async (request: Parameters<typeof adapter.analyticalEvidence>[0]) => {
    requests += 1;
    return adapter.analyticalEvidence(request);
  } };
  await analyzeContext(singleRequestAdapter, path('Site', 'SITE-D'));
  expect(requests).toBe(1);
  expect(workMixCounts((await adapter.analyticalEvidence({ path: path('Site', 'SITE-D'), securityScope: scope })).evidence))
    .toEqual({ eligibleCount: 280, reactiveCount: 239, plannedCount: 41 });
});


