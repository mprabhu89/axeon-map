import type { AnalyticalFinding } from '../analytics/finding';
import { MAXIMO_ADAPTER_LIMITS, requestContext, requireAdapterCapability, type MaximoAdapter } from '../data/maximoAdapter';
import { AXEON_RELEASE } from '../product/releaseMetadata';
import { availableDimensions, pathLabels, type Dimension, type PathSegment } from '../model/exploration';
import { copyFilters, filtersEqual, normalizeFilters, type InvestigationFilter } from '../model/investigationContext';
import type {
  InvestigationReport, ReportAISnapshot, ReportChart, ReportContext, ReportFinding, ReportKPI,
} from './contracts';

export const REPORT_MAX_AGGREGATE_GROUPS = MAXIMO_ADAPTER_LIMITS.reportGroupsPerDimension;
export const REPORT_MAX_DISTRIBUTIONS = MAXIMO_ADAPTER_LIMITS.reportAggregateDimensions;

export interface BuildInvestigationReportInput {
  context: {
    path: readonly PathSegment[];
    nodeType: Dimension | 'Work Orders';
    nodeLabel: string;
    population: number;
    filters?: readonly InvestigationFilter[];
  };
  findings: readonly AnalyticalFinding[];
  aiSnapshot?: ReportAISnapshot;
  generatedAt?: string;
  referenceTime?: string | null;
}

const cleanText = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const percent = (value: number) => `${value.toFixed(1)}%`;
const count = (value: number) => value.toLocaleString('en-US');
const pathsEqual = (left: readonly PathSegment[], right: readonly PathSegment[]) => JSON.stringify(left) === JSON.stringify(right);

function reportDimensions(path: readonly PathSegment[]): Dimension[] {
  const available = availableDimensions(path);
  const used = new Set(path.map((segment) => segment.dimension));
  const preferred: readonly Dimension[] = used.has('Asset')
    ? ['Status', 'Classification', 'Site', 'Priority', 'Location']
    : path.length === 0
      ? ['Site', 'Status', 'Priority']
      : ['Status', 'Priority', 'Classification', 'Asset', 'Site', 'Location'];
  return preferred.filter((dimension) => available.includes(dimension)).slice(0, REPORT_MAX_DISTRIBUTIONS);
}

function copyFinding(finding: AnalyticalFinding): ReportFinding {
  return {
    id: finding.id,
    ruleId: finding.ruleId,
    lens: finding.lens,
    title: cleanText(finding.title),
    severity: finding.severity,
    metric: { ...finding.metric },
    affectedCount: finding.affectedCount,
    populationCount: finding.populationCount,
    ...(finding.comparison ? { comparison: { ...finding.comparison } } : {}),
    thresholds: finding.thresholds.map((item) => ({ ...item })),
    evidence: Object.fromEntries(Object.entries(finding.evidence).map(([key, value]) => [key, typeof value === 'string' ? cleanText(value) : value])),
    referenceTime: finding.referenceTime,
  };
}

function createKPIs(population: number, findings: readonly AnalyticalFinding[]): ReportKPI[] {
  const result: ReportKPI[] = [{
    id: 'total-work-orders', label: 'Total Work Orders', value: population,
    displayValue: count(population), detail: 'Represented context population',
  }];
  const add = (finding: AnalyticalFinding | undefined, id: string, label: string, value: number | undefined, display: string | undefined, detail: string) => {
    if (!finding || value === undefined || !Number.isFinite(value) || value <= 0 || !display) return;
    result.push({ id, label, value, displayValue: display, detail, sourceFindingId: finding.id });
  };
  const find = (lens: AnalyticalFinding['lens']) => findings.find((finding) => finding.lens === lens);
  const workMix = find('Work Mix');
  add(workMix, 'reactive-share', 'Reactive Share', workMix?.metric.value, workMix ? percent(workMix.metric.value) : undefined, 'CM + EM within eligible work');
  const backlog = find('Backlog & Aging');
  add(backlog, 'aged-backlog', 'Aged Backlog', backlog?.affectedCount, backlog ? count(backlog.affectedCount) : undefined, 'Work Orders qualifying under the aged-backlog rule');
  const risk = find('Risk');
  add(risk, 'unresolved-exposure', 'High-Priority Unresolved', risk?.affectedCount, risk ? count(risk.affectedCount) : undefined, 'Aged and overdue qualifying work');
  const repeat = find('Repeat Work') ?? find('Reliability');
  add(repeat, 'repeat-reactive', 'Repeat Reactive Work', repeat?.affectedCount, repeat ? count(repeat.affectedCount) : undefined, 'Reactive asset history in the defined window');
  const quality = find('Data Quality');
  add(quality, 'missing-reference', 'Missing Asset Reference', quality?.metric.value, quality ? percent(quality.metric.value) : undefined, 'Qualifying reactive Work Orders');
  const optimization = find('Optimization');
  add(optimization, 'asset-concentration', 'Top Asset Concentration', optimization?.metric.value, optimization ? percent(optimization.metric.value) : undefined, 'Reactive workload on the leading asset subset');
  const bottleneck = find('Process Bottleneck');
  add(bottleneck, 'long-stage', 'Long-Stage Work', bottleneck?.affectedCount, bottleneck ? count(bottleneck.affectedCount) : undefined, 'Work Orders qualifying under the stage-duration rule');
  return result;
}

function compositionChart(
  id: string, title: string, description: string, values: readonly { label: string; value: number }[], finding: AnalyticalFinding,
): ReportChart | null {
  const valid = values.filter((item) => Number.isFinite(item.value) && item.value >= 0);
  const total = valid.reduce((sum, item) => sum + item.value, 0);
  if (valid.length < 2 || total <= 0) return null;
  return {
    id, kind: 'composition', title, description,
    ariaLabel: `${title}: ${valid.map((item) => `${item.label} ${item.value}`).join(', ')}`,
    values: valid, total, source: 'deterministic-finding', sourceFindingId: finding.id,
  };
}

function findingCharts(findings: readonly AnalyticalFinding[]): ReportChart[] {
  const charts: ReportChart[] = [];
  const first = (lens: AnalyticalFinding['lens']) => findings.find((finding) => finding.lens === lens);
  const workMix = first('Work Mix');
  if (workMix) {
    const reactive = Number(workMix.evidence.reactiveCount ?? workMix.affectedCount);
    const planned = Number(workMix.evidence.plannedCount ?? Math.max(0, workMix.populationCount - reactive));
    const composition = compositionChart('work-mix-composition', 'Reactive and planned work mix', 'CM and EM compared with PM in this context.', [
      { label: 'Reactive (CM + EM)', value: reactive }, { label: 'Planned (PM)', value: planned },
    ], workMix);
    if (composition) charts.push(composition);
    if (workMix.comparison) charts.push({
      id: 'work-mix-baseline', kind: 'comparison', title: 'Reactive share against authorized baseline',
      description: 'Context percentage compared with the adapter-supplied authorized baseline.',
      ariaLabel: `Context reactive share ${workMix.metric.value.toFixed(2)} percent; authorized baseline ${workMix.comparison.value.toFixed(2)} percent`,
      values: [{ label: 'Current context', value: workMix.metric.value }, { label: 'Authorized baseline', value: workMix.comparison.value }],
      source: 'deterministic-finding', sourceFindingId: workMix.id,
    });
  }

  const repeat = first('Repeat Work') ?? first('Reliability');
  if (repeat) {
    const chart = compositionChart('reactive-work-type', 'Reactive work-type composition', 'Reactive history represented by the repeat/reliability evidence.', [
      { label: 'CM', value: Number(repeat.evidence.cmCount ?? 0) }, { label: 'EM', value: Number(repeat.evidence.emCount ?? 0) },
    ], repeat);
    if (chart) charts.push(chart);
  }

  const dataQuality = first('Data Quality');
  if (dataQuality) {
    const chart = compositionChart('asset-reference-completeness', 'Asset-reference completeness', 'Missing and populated asset references in the evaluated reactive population.', [
      { label: 'Missing asset', value: dataQuality.affectedCount },
      { label: 'Populated asset', value: Math.max(0, dataQuality.populationCount - dataQuality.affectedCount) },
    ], dataQuality);
    if (chart) charts.push(chart);
  }

  for (const lens of ['Backlog & Aging', 'Process Bottleneck', 'Risk', 'Optimization'] as const) {
    const finding = first(lens);
    if (!finding) continue;
    const titles = {
      'Backlog & Aging': ['Aged approval backlog', 'Aged approvals', 'Other evaluated approvals'],
      'Process Bottleneck': ['Current-stage duration', 'Long-stage work', 'Other evaluated work'],
      Risk: ['High-priority unresolved exposure', 'Qualifying exposure', 'Other evaluated high-priority work'],
      Optimization: ['Reactive workload concentration', 'Leading asset subset', 'Other reactive work'],
    } as const;
    const [title, affectedLabel, remainderLabel] = titles[lens];
    const chart = compositionChart(`finding-${finding.ruleId}`, title, 'Measured qualifying population compared with the remainder of the evaluated population.', [
      { label: affectedLabel, value: finding.affectedCount },
      { label: remainderLabel, value: Math.max(0, finding.populationCount - finding.affectedCount) },
    ], finding);
    if (chart) charts.push(chart);
  }
  return charts;
}

function validTimestamp(value: string | undefined | null): string | null {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

export async function buildInvestigationReport(
  adapter: MaximoAdapter, input: BuildInvestigationReportInput,
): Promise<InvestigationReport> {
  requireAdapterCapability(adapter, 'reporting-aggregates');
  if (!Number.isFinite(input.context.population) || input.context.population < 0) throw new Error('Invalid report context population.');
  const path = input.context.path.map((segment) => ({ dimension: segment.dimension, value: cleanText(segment.value) }));
  const filters = copyFilters(normalizeFilters(input.context.filters ?? []));
  const context: ReportContext = {
    path,
    pathLabels: pathLabels(path).map(cleanText),
    nodeType: input.context.nodeType,
    nodeLabel: cleanText(input.context.nodeLabel),
    population: input.context.population,
    filters,
  };
  const dimensions = reportDimensions(path);
  const responses = await Promise.all(dimensions.map(async (dimension) => ({
    dimension,
    response: await adapter.explore({
      ...requestContext(adapter, path, filters), nextDimension: dimension, maxGroups: REPORT_MAX_AGGREGATE_GROUPS,
    }),
  })));
  const aggregateCharts: ReportChart[] = responses.filter(({ response }) => response.groups.length > 1).map(({ dimension, response }) => ({
    id: `distribution-${dimension.toLowerCase()}`,
    kind: 'ranked-bar',
    title: `${dimension} distribution`,
    description: response.totalGroups > response.groups.length
      ? `Leading ${response.groups.length} of ${response.totalGroups} ${dimension.toLowerCase()} groups.`
      : `All ${response.totalGroups} ${dimension.toLowerCase()} groups in this context.`,
    ariaLabel: `${dimension} distribution: ${response.groups.map((group) => `${group.value} ${group.count}`).join(', ')}`,
    values: response.groups.map((group) => ({ label: cleanText(group.value), value: group.count })),
    total: response.totalCount,
    source: 'contextual-aggregate',
  }));
  const exactFindings = input.findings.filter((finding) => pathsEqual(finding.context, path) && filtersEqual(finding.filters ?? [], filters));
  const findings = exactFindings.map(copyFinding);
  const ai = input.aiSnapshot && pathsEqual(input.aiSnapshot.contextPath, path) && filtersEqual(input.aiSnapshot.contextFilters ?? [], filters) ? {
    question: cleanText(input.aiSnapshot.question),
    answer: cleanText(input.aiSnapshot.response.answer),
    groundingStatus: input.aiSnapshot.response.groundingStatus,
    evidenceReferences: input.aiSnapshot.response.evidenceReferences.map((reference) => ({ ...reference, title: cleanText(reference.title) })),
    nextChecks: input.aiSnapshot.response.nextChecks.map(cleanText),
    limitations: input.aiSnapshot.response.limitations.map(cleanText),
  } : undefined;
  const generatedAt = validTimestamp(input.generatedAt) ?? new Date().toISOString();
  const referenceTime = validTimestamp(input.referenceTime) ?? validTimestamp(findings[0]?.referenceTime);
  const suggestedNextAreas = ai?.nextChecks.length ? ai.nextChecks : availableDimensions(path).slice(0, 3).map((dimension) => `Explore by ${dimension}`);

  return {
    schemaVersion: 1,
    release: AXEON_RELEASE,
    title: 'Operational Investigation Report',
    context,
    securityScope: { ...adapter.profile.securityContext, label: 'Current permitted data' },
    generatedAt,
    referenceTime,
    provenance: adapter.profile.id === 'mock'
      ? { mode: 'synthetic-local', label: 'Synthetic local development data', authorizedRealMaximoData: false }
      : { mode: 'real-maximo', label: 'Configured Maximo data source', authorizedRealMaximoData: adapter.profile.securityContext.enforcement === 'maximo-authorized' },
    kpis: createKPIs(context.population, exactFindings),
    charts: [...aggregateCharts, ...findingCharts(exactFindings)].slice(0, 6),
    findings,
    ...(ai ? { aiInterpretation: ai } : {}),
    suggestedNextAreas,
    limitations: [
      adapter.profile.id === 'mock'
        ? 'This local report uses deterministic synthetic data and a development security-scope marker; real Maximo authorization is not implemented.'
        : 'Real Maximo report evidence must be authorized by Maximo before it reaches Axeon.',
      'Charts use bounded aggregate responses and structured findings. They do not represent unrestricted raw Work Order retrieval.',
      ...(ai ? ['Axeon AI interpretation is separate from deterministic measured evidence.'] : ['No exact-context Axeon AI interpretation was included.']),
    ],
  };
}
