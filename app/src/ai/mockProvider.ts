import type { AIContextFinding, AxeonAIProvider, AxeonAIRequest, AxeonAIResponse } from './contracts';
import { ProviderIndependentAxeonAIGateway } from './gateway';

const number = (value: number) => Number.isInteger(value) ? value.toLocaleString('en-US') : value.toFixed(2);

function findingFact(finding: AIContextFinding): string {
  switch (finding.lens) {
    case 'Work Mix': {
      const baseline = finding.comparison?.value;
      const difference = finding.evidence.differencePercentagePoints;
      return `Reactive work is ${number(finding.metric.value)}%${baseline === undefined ? '' : ` versus the authorized baseline of ${number(baseline)}%`}${typeof difference === 'number' ? `, a difference of ${number(difference)} percentage points` : ''}.`;
    }
    case 'Optimization': return `The top ${number(Number(finding.evidence.topAssetCount ?? 0))} assets account for ${number(finding.affectedCount)} of ${number(finding.populationCount)} reactive Work Orders (${number(finding.metric.value)}%).`;
    case 'Reliability': return `${String(finding.evidence.asset ?? 'The asset')} has ${number(finding.affectedCount)} reactive Work Orders across ${number(Number(finding.evidence.activePeriods ?? 0))} periods in the ${number(Number(finding.thresholds.find((item) => item.key === 'lookbackDays')?.value ?? 0))}-day window.`;
    case 'Repeat Work': return `${String(finding.evidence.asset ?? 'An asset')} has ${number(finding.affectedCount)} reactive Work Orders in the defined repeat-work window.`;
    case 'Backlog & Aging': return `${number(finding.affectedCount)} of ${number(finding.populationCount)} approval Work Orders meet the aged-backlog rule.`;
    case 'Process Bottleneck': return `${number(finding.affectedCount)} of ${number(finding.populationCount)} scheduled PM Work Orders meet the current-stage duration rule.`;
    case 'Risk': return `${number(finding.affectedCount)} of ${number(finding.populationCount)} high-priority unresolved Work Orders meet the aged and overdue exposure rule.`;
    case 'Data Quality': return `${number(finding.affectedCount)} of ${number(finding.populationCount)} reactive Work Orders have the qualifying missing ${String(finding.evidence.fieldCategory ?? 'data')} pattern (${number(finding.metric.value)}%).`;
  }
}

function references(findings: readonly AIContextFinding[]) {
  return findings.map(({ id, lens, title }) => ({ findingId: id, lens, title }));
}

function nextChecks(request: AxeonAIRequest): string[] {
  const dimensions = request.contextPack.context.availableDimensions.slice(0, 2);
  return dimensions.length ? dimensions.map((dimension) => `Explore by ${dimension}`)
    : ['Review the structured evidence for the current findings'];
}

export class MockAxeonAIProvider implements AxeonAIProvider {
  async respond(request: AxeonAIRequest): Promise<AxeonAIResponse> {
    const { contextPack } = request;
    const causeQuestion = /\b(?:why|what)\b.*\b(?:fail|failed|failure|cause|caused)\b|\broot cause\b/i.test(contextPack.question);
    const lensMatches = request.selectedSuggestion
      ? contextPack.findings.filter((finding) => finding.lens === request.selectedSuggestion?.lens) : [];
    const supportingFindings = (lensMatches.length ? lensMatches : contextPack.findings).slice(0, 4);
    const evidenceReferences = references(supportingFindings);
    if (causeQuestion) return {
      answer: contextPack.findings.length
        ? `The current Axeon evidence shows ${supportingFindings.map((finding) => finding.lens.toLowerCase()).join(' and ')} patterns for this context, but it does not contain sufficient failure-cause evidence to determine why the asset failed.`
        : 'The current Context Pack contains no qualifying deterministic finding and no failure-cause evidence, so it cannot determine why the asset failed.',
      evidenceReferences,
      nextChecks: ['Review problem, cause, remedy, and failure information when authorized evidence becomes available'],
      limitations: ['Failure cause, remedy, technician action, and failure-code evidence are not present in this Context Pack.'],
      groundingStatus: 'limited-evidence',
      metadata: { providerId: 'mock', mode: 'deterministic-mock' },
    };
    if (!contextPack.findings.length) return {
      answer: 'The current deterministic rules produced no qualifying operational findings for this context. That does not establish that no other operational issues exist.',
      evidenceReferences: [],
      nextChecks: nextChecks(request),
      limitations: ['Only the currently implemented deterministic rules and supplied context were considered.'],
      groundingStatus: 'limited-evidence',
      metadata: { providerId: 'mock', mode: 'deterministic-mock' },
    };
    if (request.selectedSuggestion && !lensMatches.length) return {
      answer: `The current Context Pack contains no qualifying ${request.selectedSuggestion.lens} finding to answer this question directly. Other findings in this context do not establish that requested condition.`,
      evidenceReferences: [],
      nextChecks: nextChecks(request),
      limitations: [`No qualifying ${request.selectedSuggestion.lens} finding was supplied for this context.`],
      groundingStatus: 'limited-evidence',
      metadata: { providerId: 'mock', mode: 'deterministic-mock' },
    };
    return {
      answer: `${supportingFindings.map(findingFact).join(' ')} These measured patterns support further investigation; they do not establish a root cause.`,
      evidenceReferences,
      nextChecks: nextChecks(request),
      limitations: ['The response is limited to the supplied deterministic findings and current investigation context.'],
      groundingStatus: 'grounded',
      metadata: { providerId: 'mock', mode: 'deterministic-mock' },
    };
  }
}

export const mockAxeonAIGateway = new ProviderIndependentAxeonAIGateway(new MockAxeonAIProvider());
