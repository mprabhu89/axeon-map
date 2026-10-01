import { requestContext, requireAdapterCapability, type AnalyticalEvidenceAdapter } from '../data/maximoAdapter';
import type { PathSegment } from '../model/exploration';
import { copyFilters, type InvestigationFilter } from '../model/investigationContext';
import {
  detectAgedApprovalBacklog, detectOperationalDataQuality, detectOperationalExposure,
  detectOptimizationOpportunity, detectReliabilityPattern, detectRepeatReactiveWork,
  detectScheduledPmBottleneck, detectWorkMix,
} from './detectors';
import type { AnalyticalFinding, AnalyticalLens, FindingSeverity } from './finding';

const severityOrder: Record<FindingSeverity, number> = { elevated: 0, attention: 1, info: 2 };
const lensOrder: Record<AnalyticalLens, number> = {
  Risk: 0, 'Backlog & Aging': 1, 'Repeat Work': 2, 'Process Bottleneck': 3,
  Reliability: 4, 'Work Mix': 5, 'Data Quality': 6, Optimization: 7,
};

export function orderFindings(findings: readonly AnalyticalFinding[]): AnalyticalFinding[] {
  return [...findings].sort((first, second) => severityOrder[first.severity] - severityOrder[second.severity]
    || lensOrder[first.lens] - lensOrder[second.lens] || first.ruleId.localeCompare(second.ruleId)
    || first.id.localeCompare(second.id));
}

export interface ContextAnalysisResult {
  findings: AnalyticalFinding[];
  referenceTime: string;
}

export async function analyzeContextWithMetadata(
  adapter: AnalyticalEvidenceAdapter, path: readonly PathSegment[], filters: readonly InvestigationFilter[] = [],
): Promise<ContextAnalysisResult> {
  requireAdapterCapability(adapter, 'analytics');
  const { evidence, baseline, referenceTime } = await adapter.analyticalEvidence({
    ...requestContext(adapter, path, filters),
  });
  if (!Number.isFinite(Date.parse(referenceTime))) throw new Error('Invalid analytical reference time');
  const findings = orderFindings([
    ...detectAgedApprovalBacklog(evidence, path, referenceTime),
    ...detectRepeatReactiveWork(evidence, path, referenceTime),
    ...detectScheduledPmBottleneck(evidence, path, referenceTime),
    ...detectWorkMix(evidence, baseline, path, referenceTime),
    ...detectReliabilityPattern(evidence, path, referenceTime),
    ...detectOperationalExposure(evidence, path, referenceTime),
    ...detectOperationalDataQuality(evidence, path, referenceTime),
    ...detectOptimizationOpportunity(evidence, path, referenceTime),
  ]);
  return { referenceTime, findings: filters.length ? findings.map((finding) => ({
    ...finding,
    id: `${finding.id}:filters:${encodeURIComponent(JSON.stringify(copyFilters(filters)))}`,
    filters: copyFilters(filters),
  })) : findings };
}

// Presentation calls this service through the active-context hook; detector logic stays outside React.
export async function analyzeContext(
  adapter: AnalyticalEvidenceAdapter, path: readonly PathSegment[], filters: readonly InvestigationFilter[] = [],
): Promise<AnalyticalFinding[]> {
  return (await analyzeContextWithMetadata(adapter, path, filters)).findings;
}
