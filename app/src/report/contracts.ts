import type { AIGroundingStatus, AIEvidenceReference, AxeonAIResponse } from '../ai/contracts';
import type { AnalyticalFinding, AnalyticalLens, FindingSeverity } from '../analytics/finding';
import type { Dimension, PathSegment } from '../model/exploration';
import type { InvestigationFilter } from '../model/investigationContext';
import type { AdapterSecurityContext } from '../data/maximoAdapter';
import type { ProductReleaseMetadata } from '../product/releaseMetadata';

export interface ReportContext {
  path: readonly PathSegment[];
  pathLabels: readonly string[];
  nodeType: Dimension | 'Work Orders';
  nodeLabel: string;
  population: number;
  filters: readonly InvestigationFilter[];
}

export interface ReportKPI {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  detail: string;
  sourceFindingId?: string;
}

export interface ReportChartDatum {
  label: string;
  value: number;
}

export type ReportChartKind = 'ranked-bar' | 'composition' | 'comparison';

export interface ReportChart {
  id: string;
  kind: ReportChartKind;
  title: string;
  description: string;
  ariaLabel: string;
  values: readonly ReportChartDatum[];
  total?: number;
  source: 'contextual-aggregate' | 'deterministic-finding';
  sourceFindingId?: string;
}

export interface ReportFinding {
  id: string;
  ruleId: string;
  lens: AnalyticalLens;
  title: string;
  severity: FindingSeverity;
  metric: AnalyticalFinding['metric'];
  affectedCount: number;
  populationCount: number;
  comparison?: AnalyticalFinding['comparison'];
  thresholds: AnalyticalFinding['thresholds'];
  evidence: Readonly<Record<string, string | number>>;
  referenceTime: string;
}

export interface ReportAIInterpretation {
  question: string;
  answer: string;
  groundingStatus: AIGroundingStatus;
  evidenceReferences: readonly AIEvidenceReference[];
  nextChecks: readonly string[];
  limitations: readonly string[];
}

export interface InvestigationReport {
  schemaVersion: 1;
  release: ProductReleaseMetadata;
  title: 'Operational Investigation Report';
  context: ReportContext;
  securityScope: AdapterSecurityContext & { label: 'Current permitted data' };
  generatedAt: string;
  referenceTime: string | null;
  provenance: {
    mode: 'synthetic-local' | 'real-maximo';
    label: string;
    authorizedRealMaximoData: boolean;
  };
  kpis: readonly ReportKPI[];
  charts: readonly ReportChart[];
  findings: readonly ReportFinding[];
  aiInterpretation?: ReportAIInterpretation;
  suggestedNextAreas: readonly string[];
  limitations: readonly string[];
}

export interface ReportAISnapshot {
  contextPath: readonly PathSegment[];
  contextFilters?: readonly InvestigationFilter[];
  question: string;
  response: AxeonAIResponse;
}
