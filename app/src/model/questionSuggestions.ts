import type { Dimension, PathSegment } from './exploration';
import type { InvestigationFilter } from './investigationContext';

export const analyticalLenses = [
  'Risk', 'Backlog & Aging', 'Repeat Work', 'Process Bottleneck',
  'Reliability', 'Work Mix', 'Data Quality', 'Optimization',
] as const;
export type AnalyticalLens = typeof analyticalLenses[number];
export interface QuestionSuggestion { id: string; lens: AnalyticalLens; text: string }
export interface QuestionContext {
  nodeDimension: Dimension | 'Work Orders';
  nodeLabel: string;
  path: readonly PathSegment[];
  filters?: readonly InvestigationFilter[];
}
const question = (id: string, lens: AnalyticalLens, text: string): QuestionSuggestion => ({ id, lens, text });
const value = (path: readonly PathSegment[], dimension: Dimension) =>
  path.find((segment) => segment.dimension === dimension)?.value;

/** Deterministic prompts only: no finding or data analysis is performed here. */
export function suggestAnalyticalQuestions({ nodeDimension, nodeLabel, path }: QuestionContext): QuestionSuggestion[] {
  const site = value(path, 'Site');
  const status = value(path, 'Status');
  const priority = value(path, 'Priority');
  if (priority && status && site) return [
    question('risk-critical-site-status', 'Risk', `Are any Priority ${priority} Work Orders at ${site} aging unusually long in ${status}?`),
    question('repeat-critical-site', 'Repeat Work', `Are repeated Work Orders on the same assets contributing disproportionately to this Priority ${priority} backlog at ${site}?`),
    question('bottleneck-critical-site-status', 'Process Bottleneck', `Does the ${status} workload at ${site} indicate a process bottleneck requiring supervisor attention?`),
    question('optimize-critical-site', 'Optimization', `Which part of this Priority ${priority} backlog at ${site} should be investigated first to reduce operational exposure?`),
  ];
  if (priority && status) return [
    question('risk-priority-status', 'Risk', `Are Priority ${priority} Work Orders aging unusually long in ${status}?`),
    question('bottleneck-priority-status', 'Process Bottleneck', `Is Priority ${priority} work remaining in ${status} longer than expected before progressing?`),
    question('repeat-priority-status', 'Repeat Work', `Are repeated Work Orders on the same assets contributing to this Priority ${priority} ${status} workload?`),
    question('optimize-priority-status', 'Optimization', `Which part of this Priority ${priority} ${status} workload deserves supervisor attention first?`),
  ];
  if (site && status) return [
    question('bottleneck-site-status', 'Process Bottleneck', `Is work at ${site} remaining in ${status} longer than expected before progressing?`),
    question('backlog-site-status', 'Backlog & Aging', `Is the ${status} backlog at ${site} growing or becoming stale?`),
    question('repeat-site-status', 'Repeat Work', `Are the same assets repeatedly generating ${status} Work Orders at ${site}?`),
    question('optimize-site-status', 'Optimization', `Which part of the ${status} workload at ${site} deserves supervisor attention first?`),
  ];
  if (site && priority) return [
    question('risk-site-priority', 'Risk', `Are Priority ${priority} Work Orders at ${site} remaining unresolved long enough to increase operational exposure?`),
    question('backlog-site-priority', 'Backlog & Aging', `Is the Priority ${priority} backlog at ${site} becoming stale?`),
    question('repeat-site-priority', 'Repeat Work', `Are the same assets repeatedly contributing to Priority ${priority} work at ${site}?`),
    question('optimize-site-priority', 'Optimization', `Which Priority ${priority} Work Orders at ${site} deserve supervisor attention first?`),
  ];
  switch (nodeDimension) {
    case 'Work Orders': return [
      question('root-risk', 'Risk', 'Is high-priority work accumulating in a way that could increase operational exposure?'),
      question('root-backlog', 'Backlog & Aging', 'Is the Work Order backlog growing or becoming increasingly stale?'),
      question('root-work-mix', 'Work Mix', 'Does the workload show an unusual concentration of reactive or high-priority work?'),
      question('root-optimization', 'Optimization', 'Which part of this workload deserves supervisor attention first?'),
    ];
    case 'Site': return [
      question('site-risk', 'Risk', `Is high-priority work at ${nodeLabel} accumulating in a way that could increase operational exposure?`),
      question('site-backlog', 'Backlog & Aging', `Are Work Orders at ${nodeLabel} aging longer than expected?`),
      question('site-repeat', 'Repeat Work', `Are the same assets at ${nodeLabel} repeatedly generating Work Orders?`),
      question('site-optimization', 'Optimization', `Which part of the workload at ${nodeLabel} deserves supervisor attention first?`),
    ];
    case 'Status': return [
      question('status-bottleneck', 'Process Bottleneck', `Is work remaining in ${nodeLabel} unusually long before progressing?`),
      question('status-backlog', 'Backlog & Aging', `Is the ${nodeLabel} backlog growing or becoming stale?`),
      question('status-quality', 'Data Quality', `Are missing or inconsistent record details limiting analysis of ${nodeLabel} Work Orders?`),
      question('status-optimization', 'Optimization', `What should be investigated first to reduce the ${nodeLabel} backlog?`),
    ];
    case 'Priority': return [
      question('priority-risk', 'Risk', `Are Priority ${nodeLabel} Work Orders remaining unresolved long enough to increase operational exposure?`),
      question('priority-backlog', 'Backlog & Aging', `Is the Priority ${nodeLabel} backlog becoming increasingly stale?`),
      question('priority-repeat', 'Repeat Work', `Are the same assets repeatedly contributing to Priority ${nodeLabel} work?`),
      question('priority-optimization', 'Optimization', `Which Priority ${nodeLabel} Work Orders deserve supervisor attention first?`),
    ];
    case 'Classification': return [
      question('classification-reliability', 'Reliability', `Does ${nodeLabel} work indicate recurring asset patterns that warrant reliability investigation?`),
      question('classification-work-mix', 'Work Mix', `Is the mix of ${nodeLabel} work changing in a way that may affect planning?`),
      question('classification-quality', 'Data Quality', `Are inconsistent ${nodeLabel} coding or missing record details limiting analysis?`),
      question('classification-optimization', 'Optimization', `What should be investigated first to understand the main driver of ${nodeLabel} work?`),
    ];
    case 'Location': return [
      question('location-repeat', 'Repeat Work', `Are repeated Work Orders concentrated around the same assets at ${nodeLabel}?`),
      question('location-risk', 'Risk', `Could unresolved work at ${nodeLabel} increase operational exposure?`),
      question('location-quality', 'Data Quality', `Are missing or inconsistent asset and location details limiting analysis at ${nodeLabel}?`),
      question('location-optimization', 'Optimization', `Where should investigation of the workload at ${nodeLabel} begin?`),
    ];
    case 'Asset': return [
      question('asset-repeat', 'Repeat Work', `Is ${nodeLabel} repeatedly generating Work Orders within this workload?`),
      question('asset-reliability', 'Reliability', `Does the work history for ${nodeLabel} suggest a recurring failure pattern worth investigating?`),
      question('asset-quality', 'Data Quality', `Are missing or inconsistent details limiting analysis of ${nodeLabel} Work Orders?`),
      question('asset-optimization', 'Optimization', `What should be investigated next to understand the main driver of work on ${nodeLabel}?`),
    ];
  }
}
