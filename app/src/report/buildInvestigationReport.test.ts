import { expect, test, vi } from 'vitest';
import { analyzeContextWithMetadata } from '../analytics/analyzeContext';
import { MOCK_SECURITY_CONTEXT, type MaximoAdapter } from '../data/maximoAdapter';
import { mockMaximoAdapter } from '../data/mockMaximoAdapter';
import type { Dimension, PathSegment } from '../model/exploration';
import { buildInvestigationReport, REPORT_MAX_AGGREGATE_GROUPS } from './buildInvestigationReport';
import type { ReportAISnapshot } from './contracts';
import { AXEON_RELEASE } from '../product/releaseMetadata';

const scope = MOCK_SECURITY_CONTEXT;
const generatedAt = '2026-09-19T12:00:00.000Z';

async function contextPopulation(path: readonly PathSegment[]) {
  return (await mockMaximoAdapter.explore({ path, nextDimension: null, maxGroups: 1, securityScope: scope })).totalCount;
}

async function reportFor(path: readonly PathSegment[], nodeType: Dimension | 'Work Orders', label: string, aiSnapshot?: ReportAISnapshot) {
  const population = await contextPopulation(path);
  const analysis = path.length ? await analyzeContextWithMetadata(mockMaximoAdapter, path) : { findings: [], referenceTime: undefined };
  return buildInvestigationReport(mockMaximoAdapter, {
    context: { path, nodeType, nodeLabel: label, population }, findings: analysis.findings,
    referenceTime: analysis.referenceTime ?? null, generatedAt, ...(aiSnapshot ? { aiSnapshot } : {}),
  });
}

test('root report uses bounded contextual aggregates without analytical or raw-record retrieval', async () => {
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: vi.fn((request) => mockMaximoAdapter.explore(request)),
    previewRecords: vi.fn((request) => mockMaximoAdapter.previewRecords(request)),
    exportRecords: vi.fn((request) => mockMaximoAdapter.exportRecords(request)),
  };
  const report = await buildInvestigationReport(adapter, {
    context: { path: [], nodeType: 'Work Orders', nodeLabel: 'Work Orders', population: 2000 },
    findings: [], generatedAt,
  });
  expect(report.context.pathLabels).toEqual(['Work Orders']);
  expect(report.release).toBe(AXEON_RELEASE);
  expect(report.kpis).toEqual([expect.objectContaining({ id: 'total-work-orders', value: 2000 })]);
  expect(report.charts.map((chart) => chart.id)).toEqual(['distribution-site', 'distribution-status', 'distribution-priority']);
  expect(adapter.explore).toHaveBeenCalledTimes(3);
  expect(vi.mocked(adapter.explore).mock.calls.every(([request]) => request.maxGroups === REPORT_MAX_AGGREGATE_GROUPS)).toBe(true);
  expect(adapter.previewRecords).not.toHaveBeenCalled();
  expect(adapter.exportRecords).not.toHaveBeenCalled();
  expect(JSON.stringify(report)).not.toMatch(/SYN-WO-/);
});

test('SITE-D report preserves known KPI metrics and evidence-backed charts', async () => {
  const report = await reportFor([{ dimension: 'Site', value: 'SITE-D' }], 'Site', 'SITE-D');
  expect(report.context.population).toBe(280);
  expect(report.kpis).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'reactive-share', value: expect.closeTo(85.36, 1), displayValue: '85.4%' }),
    expect.objectContaining({ id: 'asset-concentration', value: expect.closeTo(30.54, 1), displayValue: '30.5%' }),
  ]));
  const mix = report.charts.find((chart) => chart.id === 'work-mix-composition');
  expect(mix?.values).toEqual([{ label: 'Reactive (CM + EM)', value: 239 }, { label: 'Planned (PM)', value: 41 }]);
  expect(report.charts.find((chart) => chart.id === 'work-mix-baseline')?.values).toEqual([
    { label: 'Current context', value: expect.closeTo(85.36, 1) },
    { label: 'Authorized baseline', value: expect.closeTo(71.8, 1) },
  ]);
  expect(report.charts.find((chart) => chart.id.startsWith('finding-AX-ANA-OPT'))?.values[0]).toEqual({ label: 'Leading asset subset', value: 73 });
});

test('asset, data-quality, risk, and backlog reports derive only supported contextual evidence', async () => {
  const asset = await reportFor([{ dimension: 'Asset', value: 'A-PUMP-01' }], 'Asset', 'A-PUMP-01');
  expect(asset.kpis).toContainEqual(expect.objectContaining({ id: 'repeat-reactive', value: 15 }));
  expect(asset.charts.find((chart) => chart.id === 'reactive-work-type')?.values.reduce((sum, item) => sum + item.value, 0)).toBe(15);
  expect(asset.findings.map((finding) => finding.lens)).toEqual(expect.arrayContaining(['Repeat Work', 'Reliability']));

  const quality = await reportFor([{ dimension: 'Site', value: 'SITE-E' }], 'Site', 'SITE-E');
  expect(quality.kpis).toContainEqual(expect.objectContaining({ id: 'missing-reference', value: expect.closeTo(8.97, 1), displayValue: '9.0%' }));
  expect(quality.charts.find((chart) => chart.id === 'asset-reference-completeness')?.values).toEqual([
    { label: 'Missing asset', value: 13 }, { label: 'Populated asset', value: 132 },
  ]);

  const risk = await reportFor([{ dimension: 'Site', value: 'SITE-F' }], 'Site', 'SITE-F');
  expect(risk.kpis).toContainEqual(expect.objectContaining({ id: 'unresolved-exposure', value: 9 }));
  expect(risk.charts.find((chart) => chart.title === 'High-priority unresolved exposure')?.values).toEqual([
    { label: 'Qualifying exposure', value: 9 }, { label: 'Other evaluated high-priority work', value: 7 },
  ]);

  const backlogPath = [{ dimension: 'Site', value: 'SITE-A' }, { dimension: 'Status', value: 'WAPPR' }] as const;
  const backlog = await reportFor(backlogPath, 'Status', 'WAPPR');
  expect(backlog.kpis).toContainEqual(expect.objectContaining({ id: 'aged-backlog', value: 29 }));
  expect(backlog.charts.find((chart) => chart.title === 'Aged approval backlog')?.values[0]).toEqual({ label: 'Aged approvals', value: 29 });
});

test('nonqualifying SITE-B omits unsupported KPIs and finding charts', async () => {
  const report = await reportFor([{ dimension: 'Site', value: 'SITE-B' }], 'Site', 'SITE-B');
  expect(report.findings).toEqual([]);
  expect(report.kpis.map((kpi) => kpi.id)).toEqual(['total-work-orders']);
  expect(report.charts.every((chart) => chart.source === 'contextual-aggregate')).toBe(true);
  expect(report.limitations).toContain('No exact-context Axeon AI interpretation was included.');
});

test('AI interpretation is included only when its path exactly matches the represented context', async () => {
  const path = [{ dimension: 'Site', value: 'SITE-D' }] as const;
  const response = {
    answer: 'Measured SITE-D patterns support further investigation.', evidenceReferences: [], nextChecks: ['Explore by Asset'],
    limitations: ['Uses supplied findings only.'], groundingStatus: 'grounded' as const,
    metadata: { providerId: 'mock', mode: 'deterministic-mock' as const },
  };
  const exact = await reportFor(path, 'Site', 'SITE-D', { contextPath: path, question: 'Why investigate?', response });
  expect(exact.aiInterpretation).toMatchObject({ question: 'Why investigate?', groundingStatus: 'grounded', answer: response.answer });
  const stale = await reportFor(path, 'Site', 'SITE-D', {
    contextPath: [{ dimension: 'Site', value: 'SITE-A' }], question: 'Old question', response,
  });
  expect(stale.aiInterpretation).toBeUndefined();
  expect(stale.limitations).toContain('No exact-context Axeon AI interpretation was included.');
});

test('untrusted labels remain inert report data and control characters are normalized', async () => {
  const report = await buildInvestigationReport(mockMaximoAdapter, {
    context: { path: [], nodeType: 'Work Orders', nodeLabel: '<img src=x onerror=alert(1)>\nWork Orders', population: 2000 },
    findings: [], generatedAt,
  });
  expect(report.context.nodeLabel).toBe('<img src=x onerror=alert(1)> Work Orders');
  expect(JSON.stringify(report)).not.toContain('\nWork Orders');
});

test('filtered report carries filters, uses filtered aggregates, and excludes stale AI from another filter context', async () => {
  const path = [{ dimension: 'Site', value: 'SITE-D' }] as const;
  const filters = [{ dimension: 'Work Type', values: ['PM'] }] as const;
  const population = (await mockMaximoAdapter.explore({ path, filters, nextDimension: null, maxGroups: 1, securityScope: scope })).totalCount;
  const analysis = await analyzeContextWithMetadata(mockMaximoAdapter, path, filters);
  const report = await buildInvestigationReport(mockMaximoAdapter, {
    context: { path, filters, nodeType: 'Site', nodeLabel: 'SITE-D', population }, findings: analysis.findings,
    referenceTime: analysis.referenceTime, generatedAt,
    aiSnapshot: {
      contextPath: path, contextFilters: [{ dimension: 'Work Type', values: ['CM', 'EM'] }], question: 'Old filtered question',
      response: { answer: 'Stale', evidenceReferences: [], nextChecks: [], limitations: [], groundingStatus: 'grounded', metadata: { providerId: 'mock', mode: 'deterministic-mock' } },
    },
  });
  expect(report.context.filters).toEqual(filters);
  expect(report.context.population).toBe(population);
  expect(report.kpis[0]).toMatchObject({ id: 'total-work-orders', value: population });
  expect(report.charts.every((chart) => chart.source === 'contextual-aggregate')).toBe(true);
  expect(report.aiInterpretation).toBeUndefined();
});



