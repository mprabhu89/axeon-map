import type { AnalyticalLens, FindingSeverity } from '../analytics/finding';
import type { Dimension, PathSegment } from '../model/exploration';
import type { InvestigationFilter } from '../model/investigationContext';
import type { AdapterSecurityContext } from '../data/maximoAdapter';

export type AIGroundingStatus = 'grounded' | 'limited-evidence';
export type AIInteractionType = 'suggested-question' | 'free-form-question';

export interface AIContextFinding {
  id: string;
  ruleId: string;
  lens: AnalyticalLens;
  title: string;
  severity: FindingSeverity;
  metric: { key: string; value: number; unit: 'orders' | 'percent' };
  affectedCount: number;
  populationCount: number;
  comparison?: { key: string; value: number; unit: 'percent' };
  thresholds: readonly { key: string; operator: '>=' | '<='; value: number; unit: string }[];
  evidence: Readonly<Record<string, string | number>>;
}

export interface AIContextPack {
  schemaVersion: 1;
  context: {
    path: readonly PathSegment[];
    labels: readonly string[];
    type: Dimension | 'Work Orders';
    label: string;
    workOrderPopulation: number;
    availableDimensions: readonly Dimension[];
    filters: readonly InvestigationFilter[];
  };
  findings: readonly AIContextFinding[];
  securityScope: AdapterSecurityContext;
  question: string;
  referenceTime: string | null;
  provenance: {
    evidenceSource: 'deterministic-operational-findings';
    authorizationMode: 'development-scope-marker' | 'maximo-authorized';
    underlyingRecordsIncluded: false;
    untrustedTextIsData: true;
  };
}

export interface AxeonAIRequest {
  contextPack: AIContextPack;
  interactionType: AIInteractionType;
  selectedSuggestion?: { id: string; lens: AnalyticalLens };
}

export interface AIEvidenceReference {
  findingId: string;
  lens: AnalyticalLens;
  title: string;
}

export interface AxeonAIResponse {
  answer: string;
  evidenceReferences: readonly AIEvidenceReference[];
  nextChecks: readonly string[];
  limitations: readonly string[];
  groundingStatus: AIGroundingStatus;
  metadata: {
    providerId: string;
    mode: 'deterministic-mock' | 'provider-adapter';
  };
}

export interface AxeonAIProvider {
  respond(request: AxeonAIRequest): Promise<AxeonAIResponse>;
}

export interface AxeonAIGateway {
  ask(request: AxeonAIRequest): Promise<AxeonAIResponse>;
}
