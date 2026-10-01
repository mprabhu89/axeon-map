import { expect, test, vi } from 'vitest';
import { MOCK_SECURITY_CONTEXT, type AnalyticalEvidenceAdapter, type AnalyticalEvidenceResponse } from '../data/maximoAdapter';
import { createMockMaximoAdapter } from '../data/mockMaximoAdapter';
import type { WorkOrderAnalyticalEvidence } from '../data/workOrderEvidence';
import type { PathSegment } from '../model/exploration';
import { analyzeContext } from './analyzeContext';
import { detectAgedApprovalBacklog, detectRepeatReactiveWork, detectScheduledPmBottleneck, detectWorkMix, workMixCounts } from './detectors';

const referenceTime = '2026-09-01T00:00:00.000Z';
const scope = MOCK_SECURITY_CONTEXT;
const sample: WorkOrderAnalyticalEvidence = {
  id: 'TEST-001', site: 'TEST-SITE', status: 'WAPPR', priority: 2,
  classification: 'Mechanical', location: 'TEST-LOC', asset: 'TEST-ASSET', workType: 'CM',
  reportDate: '2026-08-01T00:00:00.000Z', statusDate: '2026-08-02T00:00:00.000Z',
  targetStart: null, targetFinish: null, actualStart: null, actualFinish: null,
};

function withEvidence(evidence: readonly WorkOrderAnalyticalEvidence[], time = referenceTime): AnalyticalEvidenceAdapter {
  const mock = createMockMaximoAdapter([]);
  const response: AnalyticalEvidenceResponse = {
    evidence, baseline: workMixCounts(evidence), referenceTime: time,
  };
  return { ...mock, analyticalEvidence: vi.fn(async () => response) };
}

test('service requests exact context through the analytical adapter and returns structured traceable findings', async () => {
  const adapter = createMockMaximoAdapter();
  const path: PathSegment[] = [{ dimension: 'Site', value: 'SITE-A' }];
  const evidence = await adapter.analyticalEvidence({ path, securityScope: scope });
  expect(evidence.evidence).toHaveLength(560);
  expect(evidence.evidence.every((record) => record.site === 'SITE-A')).toBe(true);
  expect(evidence.baseline).toEqual({ eligibleCount: 2000, reactiveCount: 1436, plannedCount: 564 });
  const spy = vi.spyOn(adapter, 'analyticalEvidence');
  const explore = vi.spyOn(adapter, 'explore');
  const preview = vi.spyOn(adapter, 'previewRecords');
  const exported = vi.spyOn(adapter, 'exportRecords');
  const findings = await analyzeContext(adapter, path);
  expect(spy).toHaveBeenCalledWith({ path, securityScope: scope });
  expect(explore).not.toHaveBeenCalled();
  expect(preview).not.toHaveBeenCalled();
  expect(exported).not.toHaveBeenCalled();
  expect(findings.length).toBeGreaterThan(0);
  expect(findings.every((finding) => finding.context[0]?.value === 'SITE-A'
    && finding.ruleId.startsWith('AX-ANA-') && finding.referenceTime === referenceTime)).toBe(true);
  expect(findings.every((finding) => !('records' in finding) && !('rawWorkOrders' in finding))).toBe(true);
  expect(await analyzeContext(adapter, path)).toEqual(findings);
});

test('empty or ordinary evidence produces no synthetic reassurance finding', async () => {
  expect(await analyzeContext(withEvidence([]), [])).toEqual([]);
  expect(await analyzeContext(withEvidence([sample]), [])).toEqual([]);
});

test('aged approval rule derives the SITE-A signal and does not flag ordinary open work', async () => {
  const adapter = createMockMaximoAdapter();
  const path: PathSegment[] = [{ dimension: 'Site', value: 'SITE-A' }];
  const aged = (await analyzeContext(adapter, path)).find((finding) => finding.lens === 'Backlog & Aging');
  expect(aged?.ruleId).toBe('AX-ANA-AGE-001');
  expect(aged?.metric).toEqual({ key: 'agedApprovalCount', value: 29, unit: 'orders' });
  expect(aged?.thresholds).toContainEqual({ key: 'currentStatusDays', operator: '>=', value: 90, unit: 'days' });
  expect(aged!.populationCount).toBeGreaterThan(aged!.affectedCount);
  expect(aged?.evidence.overdueTargetCount).toBe(29);
  const ordinary = await adapter.analyticalEvidence({ path: [{ dimension: 'Site', value: 'SITE-B' }], securityScope: scope });
  expect(detectAgedApprovalBacklog(ordinary.evidence, [], ordinary.referenceTime)).toEqual([]);
});

test('repeat rule derives A-PUMP-01 reactive history without hardcoded asset handling', async () => {
  const adapter = createMockMaximoAdapter();
  const path: PathSegment[] = [{ dimension: 'Asset', value: 'A-PUMP-01' }];
  const response = await adapter.analyticalEvidence({ path, securityScope: scope });
  const finding = (await analyzeContext(adapter, path)).find((item) => item.lens === 'Repeat Work');
  expect(finding?.evidence.asset).toBe('A-PUMP-01');
  expect(finding?.affectedCount).toBe(15);
  expect(Number(finding?.evidence.cmCount) + Number(finding?.evidence.emCount)).toBe(15);
  expect(finding?.thresholds).toContainEqual({ key: 'repeatCount', operator: '>=', value: 12, unit: 'orders' });
  expect(response.evidence).toHaveLength(51);
  expect(finding?.context).toEqual(path);
});

test('repeat work excludes PM and blank assets, and requires the repetition threshold', () => {
  const recentReactive = Array.from({ length: 11 }, (_, index) => ({ ...sample, id: `R-${index}`, asset: 'R-PUMP' }));
  const planned = Array.from({ length: 8 }, (_, index) => ({ ...sample, id: `P-${index}`, asset: 'R-PUMP', workType: 'PM' }));
  const blank = Array.from({ length: 12 }, (_, index) => ({ ...sample, id: `B-${index}`, asset: index % 2 ? ' ' : null }));
  expect(detectRepeatReactiveWork([...recentReactive, ...planned, ...blank], [], referenceTime)).toEqual([]);
  const qualifying = detectRepeatReactiveWork([...recentReactive, ...planned, { ...sample, id: 'R-12', asset: 'R-PUMP' }], [], referenceTime);
  expect(qualifying).toHaveLength(1);
  expect(qualifying[0]?.affectedCount).toBe(12);
  expect(qualifying[0]?.evidence.cmCount).toBe(12);
});

test('scheduled PM stage rule detects SITE-C while ordinary durations and generic aging stay separate', async () => {
  const path: PathSegment[] = [{ dimension: 'Site', value: 'SITE-C' }];
  const adapter = createMockMaximoAdapter();
  const response = await adapter.analyticalEvidence({ path, securityScope: scope });
  const stage = detectScheduledPmBottleneck(response.evidence, path, referenceTime)[0];
  expect(stage?.affectedCount).toBe(9);
  expect(stage?.evidence).toMatchObject({ status: 'WSCH', workType: 'PM' });
  expect(stage?.thresholds).toContainEqual({ key: 'currentStatusDays', operator: '>=', value: 75, unit: 'days' });
  expect(detectAgedApprovalBacklog(response.evidence, path, referenceTime)).toEqual([]);
  expect(detectScheduledPmBottleneck([{ ...sample, status: 'WSCH', workType: 'PM' }], [], referenceTime)).toEqual([]);
});

test('work mix compares SITE-D to only the adapter-supplied authorized baseline', async () => {
  const adapter = createMockMaximoAdapter();
  const path: PathSegment[] = [{ dimension: 'Site', value: 'SITE-D' }];
  const response = await adapter.analyticalEvidence({ path, securityScope: scope });
  const current = workMixCounts(response.evidence);
  expect(current).toEqual({ eligibleCount: 280, reactiveCount: 239, plannedCount: 41 });
  const finding = detectWorkMix(response.evidence, response.baseline, path, referenceTime)[0];
  expect(finding?.metric.value).toBeCloseTo(239 / 280 * 100);
  expect(finding?.comparison?.value).toBeCloseTo(1436 / 2000 * 100);
  expect(finding?.evidence.differencePercentagePoints).toBeCloseTo((239 / 280 - 1436 / 2000) * 100);
  expect(finding?.thresholds).toContainEqual({ key: 'reactiveShareDifference', operator: '>=', value: 10, unit: 'percentage-points' });
  expect(detectWorkMix(response.evidence, current, path, referenceTime)).toEqual([]);
  expect(detectWorkMix(response.evidence.slice(0, 5), response.baseline, path, referenceTime)).toEqual([]);
});

test('adapter reference time is replaceable and changes rule results deterministically', async () => {
  const records = Array.from({ length: 3 }, (_, index) => ({ ...sample, id: `AGE-${index}`,
    reportDate: '2026-06-25T00:00:00.000Z', statusDate: '2026-07-01T00:00:00.000Z',
    targetFinish: '2026-07-10T00:00:00.000Z' }));
  expect(await analyzeContext(withEvidence(records, referenceTime), [])).toEqual([]);
  const later = await analyzeContext(withEvidence(records, '2026-10-01T00:00:00.000Z'), []);
  expect(later.find((finding) => finding.lens === 'Backlog & Aging')?.affectedCount).toBe(3);
  expect(later[0]?.referenceTime).toBe('2026-10-01T00:00:00.000Z');
});


