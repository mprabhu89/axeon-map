import type { PathSegment } from '../model/exploration';
import type { InvestigationFilter } from '../model/investigationContext';

export type AnalyticalLens = 'Backlog & Aging' | 'Repeat Work' | 'Process Bottleneck' | 'Work Mix'
  | 'Reliability' | 'Risk' | 'Data Quality' | 'Optimization';
export type FindingSeverity = 'info' | 'attention' | 'elevated';

export interface AnalyticalFinding {
  id: string;
  ruleId: string;
  lens: AnalyticalLens;
  title: string;
  context: readonly PathSegment[];
  filters?: readonly InvestigationFilter[];
  severity: FindingSeverity;
  referenceTime: string;
  metric: { key: string; value: number; unit: 'orders' | 'percent' };
  affectedCount: number;
  populationCount: number;
  comparison?: { key: string; value: number; unit: 'percent' };
  thresholds: readonly { key: string; operator: '>=' | '<='; value: number; unit: 'orders' | 'days' | 'percentage-points' | 'percent' | 'periods' | 'assets' | 'priority' }[];
  evidence: Readonly<Record<string, string | number>>;
}

export function findingId(ruleId: string, context: readonly PathSegment[], subject = ''): string {
  return `${ruleId}:${encodeURIComponent(JSON.stringify(context))}:${encodeURIComponent(subject)}`;
}
