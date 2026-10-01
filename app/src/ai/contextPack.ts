import type { AnalyticalFinding } from '../analytics/finding';
import { availableDimensions, pathLabels, type Dimension, type PathSegment } from '../model/exploration';
import type { AIContextFinding, AIContextPack } from './contracts';
import { copyFilters, normalizeFilters, type InvestigationFilter } from '../model/investigationContext';
import type { AdapterSecurityContext } from '../data/maximoAdapter';

export const AI_QUESTION_MAX_LENGTH = 500;

const evidenceKeys: Readonly<Record<AnalyticalFinding['lens'], readonly string[]>> = {
  'Backlog & Aging': ['status', 'overdueTargetCount', 'percentageOfApprovalPopulation', 'oldestCurrentStatusDays'],
  'Repeat Work': ['asset', 'cmCount', 'emCount', 'earliestReportDate', 'latestReportDate'],
  'Process Bottleneck': ['status', 'workType', 'longestCurrentStatusDays'],
  'Work Mix': ['reactiveCount', 'plannedCount', 'plannedPercent', 'differencePercentagePoints'],
  Reliability: ['asset', 'activePeriods', 'periodDays', 'cmCount', 'emCount', 'classificationCount', 'earliestReportDate', 'latestReportDate'],
  Risk: ['priority', 'unresolvedCount', 'overdueTargetCount', 'percentageOfHighPriorityUnresolved', 'oldestReportAgeDays'],
  'Data Quality': ['fieldCategory', 'workPopulation', 'missingAssetCount', 'evaluatedReactiveCount', 'missingAssetPercent'],
  Optimization: ['topAssetCount', 'topAssets', 'concentratedReactiveCount', 'reactiveCount', 'plannedCount', 'reactivePercent', 'concentrationPercent'],
};

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeAIQuestion(value: string): string {
  const question = cleanText(value);
  if (!question) throw new Error('Enter a question before asking Axeon.');
  if (question.length > AI_QUESTION_MAX_LENGTH) throw new Error(`Question must be ${AI_QUESTION_MAX_LENGTH} characters or fewer.`);
  return question;
}

function cleanPath(path: readonly PathSegment[]): PathSegment[] {
  return path.map((segment) => ({ dimension: segment.dimension, value: cleanText(segment.value) }));
}

function conciseFinding(finding: AnalyticalFinding): AIContextFinding {
  const allowed = new Set(evidenceKeys[finding.lens]);
  const evidence = Object.fromEntries(Object.entries(finding.evidence)
    .filter(([key, value]) => allowed.has(key) && (typeof value === 'number' || typeof value === 'string'))
    .map(([key, value]) => [key, typeof value === 'string' ? cleanText(value) : value]));
  return {
    id: finding.id, ruleId: finding.ruleId, lens: finding.lens, title: cleanText(finding.title),
    severity: finding.severity, metric: { ...finding.metric }, affectedCount: finding.affectedCount,
    populationCount: finding.populationCount,
    ...(finding.comparison ? { comparison: { ...finding.comparison } } : {}),
    thresholds: finding.thresholds.map((threshold) => ({ ...threshold })), evidence,
  };
}

export interface BuildAIContextPackInput {
  path: readonly PathSegment[];
  contextType: Dimension | 'Work Orders';
  contextLabel: string;
  population: number;
  findings: readonly AnalyticalFinding[];
  question: string;
  securityScope: AdapterSecurityContext;
  referenceTime: string | null;
  filters?: readonly InvestigationFilter[];
}

export function buildAIContextPack(input: BuildAIContextPackInput): AIContextPack {
  if (!Number.isFinite(input.population) || input.population < 0) throw new Error('Invalid context population.');
  const path = cleanPath(input.path);
  const referenceTime = input.referenceTime && Number.isFinite(Date.parse(input.referenceTime)) ? input.referenceTime : null;
  return {
    schemaVersion: 1,
    context: {
      path, labels: pathLabels(path).map(cleanText), type: input.contextType,
      label: cleanText(input.contextLabel), workOrderPopulation: input.population,
      availableDimensions: availableDimensions(path),
      filters: copyFilters(normalizeFilters(input.filters ?? [])),
    },
    findings: input.findings.map(conciseFinding),
    securityScope: { ...input.securityScope },
    question: normalizeAIQuestion(input.question),
    referenceTime,
    provenance: {
      evidenceSource: 'deterministic-operational-findings',
      authorizationMode: input.securityScope.enforcement === 'maximo-authorized' ? 'maximo-authorized' : 'development-scope-marker',
      underlyingRecordsIncluded: false,
      untrustedTextIsData: true,
    },
  };
}
