import type { AuthorizedWorkMixBaseline } from '../data/maximoAdapter';
import type { WorkOrderAnalyticalEvidence } from '../data/workOrderEvidence';
import type { PathSegment } from '../model/exploration';
import { findingId, type AnalyticalFinding } from './finding';

const dayMilliseconds = 86_400_000;

function ageDays(referenceTime: number, date: string | null): number | null {
  if (!date) return null;
  const time = Date.parse(date);
  if (!Number.isFinite(time) || time > referenceTime) return null;
  return (referenceTime - time) / dayMilliseconds;
}

function contextCopy(path: readonly PathSegment[]): PathSegment[] {
  return path.map(({ dimension, value }) => ({ dimension, value }));
}

export function detectAgedApprovalBacklog(
  evidence: readonly WorkOrderAnalyticalEvidence[], path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const reference = Date.parse(referenceTime);
  const population = evidence.filter((record) => record.status === 'WAPPR' && !record.actualStart && !record.actualFinish);
  const aged = population.filter((record) => {
    const reportAge = ageDays(reference, record.reportDate);
    const statusAge = ageDays(reference, record.statusDate);
    const targetAge = ageDays(reference, record.targetFinish);
    return reportAge !== null && reportAge >= 90 && statusAge !== null && statusAge >= 90
      && targetAge !== null && targetAge > 0;
  });
  if (aged.length < 3) return [];
  return [{
    id: findingId('AX-ANA-AGE-001', path), ruleId: 'AX-ANA-AGE-001', lens: 'Backlog & Aging',
    title: 'Aged approval backlog', context: contextCopy(path),
    severity: aged.length >= 20 ? 'elevated' : 'attention', referenceTime,
    metric: { key: 'agedApprovalCount', value: aged.length, unit: 'orders' },
    affectedCount: aged.length, populationCount: population.length,
    thresholds: [
      { key: 'reportAgeDays', operator: '>=', value: 90, unit: 'days' },
      { key: 'currentStatusDays', operator: '>=', value: 90, unit: 'days' },
      { key: 'affectedCount', operator: '>=', value: 3, unit: 'orders' },
    ],
    evidence: {
      status: 'WAPPR', overdueTargetCount: aged.length,
      percentageOfApprovalPopulation: population.length ? aged.length / population.length * 100 : 0,
      oldestCurrentStatusDays: Math.max(...aged.map((record) => ageDays(reference, record.statusDate)!)),
    },
  }];
}

export function detectRepeatReactiveWork(
  evidence: readonly WorkOrderAnalyticalEvidence[], path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const reference = Date.parse(referenceTime);
  const recent = evidence.filter((record) => (record.workType === 'CM' || record.workType === 'EM')
    && typeof record.asset === 'string' && record.asset.trim().length > 0
    && (ageDays(reference, record.reportDate) ?? Infinity) <= 31);
  const byAsset = new Map<string, WorkOrderAnalyticalEvidence[]>();
  for (const record of recent) {
    const asset = record.asset!.trim();
    const group = byAsset.get(asset) ?? [];
    group.push(record);
    byAsset.set(asset, group);
  }
  return [...byAsset].filter(([, group]) => group.length >= 12)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([asset, group]) => {
      const dates = group.map((record) => record.reportDate).sort();
      return {
        id: findingId('AX-ANA-REPEAT-001', path, asset), ruleId: 'AX-ANA-REPEAT-001', lens: 'Repeat Work' as const,
        title: 'Repeated reactive asset work', context: contextCopy(path),
        severity: group.length >= 15 ? 'elevated' as const : 'attention' as const, referenceTime,
        metric: { key: 'repeatReactiveCount', value: group.length, unit: 'orders' as const },
        affectedCount: group.length, populationCount: recent.length,
        thresholds: [
          { key: 'lookbackDays', operator: '<=' as const, value: 31, unit: 'days' as const },
          { key: 'repeatCount', operator: '>=' as const, value: 12, unit: 'orders' as const },
        ],
        evidence: {
          asset, cmCount: group.filter((record) => record.workType === 'CM').length,
          emCount: group.filter((record) => record.workType === 'EM').length,
          earliestReportDate: dates[0]!, latestReportDate: dates[dates.length - 1]!,
        },
      };
    });
}

export function detectScheduledPmBottleneck(
  evidence: readonly WorkOrderAnalyticalEvidence[], path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const reference = Date.parse(referenceTime);
  const population = evidence.filter((record) => record.status === 'WSCH' && record.workType === 'PM' && !record.actualStart);
  const delayed = population.filter((record) => (ageDays(reference, record.statusDate) ?? -1) >= 75);
  if (delayed.length < 3) return [];
  return [{
    id: findingId('AX-ANA-STAGE-001', path), ruleId: 'AX-ANA-STAGE-001', lens: 'Process Bottleneck',
    title: 'Long scheduled PM stage', context: contextCopy(path),
    severity: delayed.length >= 8 ? 'elevated' : 'attention', referenceTime,
    metric: { key: 'longScheduledPmCount', value: delayed.length, unit: 'orders' },
    affectedCount: delayed.length, populationCount: population.length,
    thresholds: [
      { key: 'currentStatusDays', operator: '>=', value: 75, unit: 'days' },
      { key: 'affectedCount', operator: '>=', value: 3, unit: 'orders' },
    ],
    evidence: {
      status: 'WSCH', workType: 'PM',
      longestCurrentStatusDays: Math.max(...delayed.map((record) => ageDays(reference, record.statusDate)!)),
    },
  }];
}

export function workMixCounts(evidence: readonly WorkOrderAnalyticalEvidence[]): AuthorizedWorkMixBaseline {
  let reactiveCount = 0;
  let plannedCount = 0;
  for (const record of evidence) {
    if (record.workType === 'CM' || record.workType === 'EM') reactiveCount += 1;
    else if (record.workType === 'PM') plannedCount += 1;
  }
  return { eligibleCount: reactiveCount + plannedCount, reactiveCount, plannedCount };
}

export function detectWorkMix(
  evidence: readonly WorkOrderAnalyticalEvidence[], baseline: AuthorizedWorkMixBaseline,
  path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const current = workMixCounts(evidence);
  if (current.eligibleCount < 30 || baseline.eligibleCount < 30) return [];
  const reactivePercent = current.reactiveCount / current.eligibleCount * 100;
  const baselineReactivePercent = baseline.reactiveCount / baseline.eligibleCount * 100;
  const difference = reactivePercent - baselineReactivePercent;
  if (difference < 10) return [];
  return [{
    id: findingId('AX-ANA-MIX-001', path), ruleId: 'AX-ANA-MIX-001', lens: 'Work Mix',
    title: 'Higher reactive work share', context: contextCopy(path),
    severity: difference >= 15 ? 'elevated' : 'attention', referenceTime,
    metric: { key: 'reactivePercent', value: reactivePercent, unit: 'percent' },
    affectedCount: current.reactiveCount, populationCount: current.eligibleCount,
    comparison: { key: 'authorizedBaselineReactivePercent', value: baselineReactivePercent, unit: 'percent' },
    thresholds: [
      { key: 'eligibleCount', operator: '>=', value: 30, unit: 'orders' },
      { key: 'reactiveShareDifference', operator: '>=', value: 10, unit: 'percentage-points' },
    ],
    evidence: {
      reactiveCount: current.reactiveCount, plannedCount: current.plannedCount,
      plannedPercent: current.plannedCount / current.eligibleCount * 100,
      baselineReactiveCount: baseline.reactiveCount, baselinePlannedCount: baseline.plannedCount,
      baselineEligibleCount: baseline.eligibleCount, differencePercentagePoints: difference,
    },
  }];
}

export function detectReliabilityPattern(
  evidence: readonly WorkOrderAnalyticalEvidence[], path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const reference = Date.parse(referenceTime);
  const population = evidence.filter((record) => (record.workType === 'CM' || record.workType === 'EM')
    && typeof record.asset === 'string' && record.asset.trim().length > 0
    && (ageDays(reference, record.reportDate) ?? Infinity) <= 180);
  const byAsset = new Map<string, WorkOrderAnalyticalEvidence[]>();
  for (const record of population) {
    const asset = record.asset!.trim();
    const group = byAsset.get(asset) ?? [];
    group.push(record);
    byAsset.set(asset, group);
  }
  return [...byAsset].map(([asset, group]) => {
    const periods = new Set(group.map((record) => Math.min(2, Math.floor(ageDays(reference, record.reportDate)! / 60))));
    return { asset, group, periods: periods.size };
  }).filter(({ group, periods }) => group.length >= 35 && periods >= 3)
    .sort((first, second) => first.asset.localeCompare(second.asset))
    .map(({ asset, group, periods }) => {
      const dates = group.map((record) => record.reportDate).sort();
      return {
        id: findingId('AX-ANA-REL-001', path, asset), ruleId: 'AX-ANA-REL-001', lens: 'Reliability' as const,
        title: 'Sustained reactive maintenance pattern', context: contextCopy(path),
        severity: group.length >= 45 ? 'elevated' as const : 'attention' as const, referenceTime,
        metric: { key: 'historicalReactiveCount', value: group.length, unit: 'orders' as const },
        affectedCount: group.length, populationCount: population.length,
        thresholds: [
          { key: 'lookbackDays', operator: '<=' as const, value: 180, unit: 'days' as const },
          { key: 'reactiveCount', operator: '>=' as const, value: 35, unit: 'orders' as const },
          { key: 'activePeriods', operator: '>=' as const, value: 3, unit: 'periods' as const },
        ],
        evidence: {
          asset, activePeriods: periods, periodDays: 60,
          cmCount: group.filter((record) => record.workType === 'CM').length,
          emCount: group.filter((record) => record.workType === 'EM').length,
          classificationCount: new Set(group.map((record) => record.classification)).size,
          earliestReportDate: dates[0]!, latestReportDate: dates[dates.length - 1]!,
        },
      };
    });
}

export function detectOperationalExposure(
  evidence: readonly WorkOrderAnalyticalEvidence[], path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const reference = Date.parse(referenceTime);
  const population = evidence.filter((record) => record.priority === 1
    && record.status !== 'COMP' && record.actualFinish === null);
  const exposed = population.filter((record) => (ageDays(reference, record.reportDate) ?? -1) >= 60
    && (ageDays(reference, record.targetFinish) ?? -1) > 0);
  if (exposed.length < 8) return [];
  return [{
    id: findingId('AX-ANA-RISK-001', path), ruleId: 'AX-ANA-RISK-001', lens: 'Risk',
    title: 'High-priority unresolved work exposure', context: contextCopy(path),
    severity: exposed.length >= 15 ? 'elevated' : 'attention', referenceTime,
    metric: { key: 'highPriorityAgedOverdueCount', value: exposed.length, unit: 'orders' },
    affectedCount: exposed.length, populationCount: population.length,
    thresholds: [
      { key: 'priorityMaximum', operator: '<=', value: 1, unit: 'priority' },
      { key: 'reportAgeDays', operator: '>=', value: 60, unit: 'days' },
      { key: 'affectedCount', operator: '>=', value: 8, unit: 'orders' },
    ],
    evidence: {
      priority: 1, unresolvedCount: population.length, overdueTargetCount: exposed.length,
      percentageOfHighPriorityUnresolved: population.length ? exposed.length / population.length * 100 : 0,
      oldestReportAgeDays: Math.max(...exposed.map((record) => ageDays(reference, record.reportDate)!)),
    },
  }];
}

export function detectOperationalDataQuality(
  evidence: readonly WorkOrderAnalyticalEvidence[], path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const population = evidence.filter((record) => record.workType === 'CM' || record.workType === 'EM');
  const incomplete = population.filter((record) => typeof record.asset !== 'string' || record.asset.trim().length === 0);
  const percentage = population.length ? incomplete.length / population.length * 100 : 0;
  if (incomplete.length < 8 || percentage < 5) return [];
  return [{
    id: findingId('AX-ANA-DQ-001', path, 'asset'), ruleId: 'AX-ANA-DQ-001', lens: 'Data Quality',
    title: 'Incomplete reactive asset references', context: contextCopy(path),
    severity: percentage >= 10 ? 'elevated' : 'attention', referenceTime,
    metric: { key: 'missingAssetPercent', value: percentage, unit: 'percent' },
    affectedCount: incomplete.length, populationCount: population.length,
    thresholds: [
      { key: 'affectedCount', operator: '>=', value: 8, unit: 'orders' },
      { key: 'missingAssetPercent', operator: '>=', value: 5, unit: 'percent' },
    ],
    evidence: {
      fieldCategory: 'asset', workPopulation: 'CM + EM', missingAssetCount: incomplete.length,
      evaluatedReactiveCount: population.length, missingAssetPercent: percentage,
    },
  }];
}

export function detectOptimizationOpportunity(
  evidence: readonly WorkOrderAnalyticalEvidence[], path: readonly PathSegment[], referenceTime: string,
): AnalyticalFinding[] {
  const mix = workMixCounts(evidence);
  if (mix.eligibleCount === 0) return [];
  const reactive = evidence.filter((record) => record.workType === 'CM' || record.workType === 'EM');
  const byAsset = new Map<string, number>();
  for (const record of reactive) {
    if (typeof record.asset !== 'string' || !record.asset.trim()) continue;
    const asset = record.asset.trim();
    byAsset.set(asset, (byAsset.get(asset) ?? 0) + 1);
  }
  const topAssets = [...byAsset].sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0])).slice(0, 3);
  const concentratedCount = topAssets.reduce((sum, [, count]) => sum + count, 0);
  const reactivePercent = mix.reactiveCount / mix.eligibleCount * 100;
  const concentrationPercent = mix.reactiveCount ? concentratedCount / mix.reactiveCount * 100 : 0;
  if (mix.reactiveCount < 100 || reactivePercent < 80 || concentrationPercent < 28) return [];
  return [{
    id: findingId('AX-ANA-OPT-001', path), ruleId: 'AX-ANA-OPT-001', lens: 'Optimization',
    title: 'Reactive workload concentration opportunity', context: contextCopy(path),
    severity: concentrationPercent >= 35 ? 'elevated' : 'attention', referenceTime,
    metric: { key: 'topAssetReactiveConcentrationPercent', value: concentrationPercent, unit: 'percent' },
    affectedCount: concentratedCount, populationCount: mix.reactiveCount,
    comparison: { key: 'contextReactivePercent', value: reactivePercent, unit: 'percent' },
    thresholds: [
      { key: 'reactiveCount', operator: '>=', value: 100, unit: 'orders' },
      { key: 'reactivePercent', operator: '>=', value: 80, unit: 'percent' },
      { key: 'topAssetConcentrationPercent', operator: '>=', value: 28, unit: 'percent' },
    ],
    evidence: {
      topAssetCount: topAssets.length, topAssets: topAssets.map(([asset]) => asset).join(', '),
      concentratedReactiveCount: concentratedCount, reactiveCount: mix.reactiveCount,
      plannedCount: mix.plannedCount, reactivePercent, concentrationPercent,
    },
  }];
}
