import type { Dimension, PathSegment } from '../model/exploration';
import type { FilterDimension, InvestigationFilter } from '../model/investigationContext';
import type { WorkOrderAnalyticalEvidence } from './workOrderEvidence';

export const MAXIMO_ADAPTER_LIMITS = Object.freeze({
  visibleExplorationGroups: 16,
  recordPreviewPageSize: 20,
  filterValuesPerDimension: 50,
  reportAggregateDimensions: 3,
  reportGroupsPerDimension: 8,
});

export type MaximoAdapterCapability = 'exploration' | 'filters' | 'records' | 'export' | 'analytics' | 'reporting-aggregates';
export type MaximoAdapterAvailability = 'active' | 'not-configured' | 'unavailable';

export interface AdapterSecurityContext {
  kind: 'current-user';
  enforcement: 'development-marker' | 'maximo-authorized' | 'not-configured';
  source: 'mock-adapter' | 'maximo-session' | 'real-adapter';
}

export interface MaximoAdapterProfile {
  id: 'mock' | 'real-maximo';
  displayName: string;
  mode: 'development' | 'production';
  availability: MaximoAdapterAvailability;
  capabilities: Readonly<Record<MaximoAdapterCapability, boolean>>;
  securityContext: AdapterSecurityContext;
}

export const MOCK_SECURITY_CONTEXT: AdapterSecurityContext = Object.freeze({
  kind: 'current-user', enforcement: 'development-marker', source: 'mock-adapter',
});

export const adapterCapabilities = (enabled: readonly MaximoAdapterCapability[]): Readonly<Record<MaximoAdapterCapability, boolean>> => {
  const selected = new Set(enabled);
  return Object.freeze({
    exploration: selected.has('exploration'), filters: selected.has('filters'), records: selected.has('records'),
    export: selected.has('export'), analytics: selected.has('analytics'),
    'reporting-aggregates': selected.has('reporting-aggregates'),
  });
};

export type MaximoAdapterErrorCode = 'unavailable' | 'unauthorized' | 'invalid-context' | 'unsupported-capability' | 'transient' | 'unknown';

const safeErrorMessages: Readonly<Record<MaximoAdapterErrorCode, string>> = {
  unavailable: 'The configured Maximo data source is unavailable.',
  unauthorized: 'The current Maximo user is not authorized for this request.',
  'invalid-context': 'The investigation context is invalid or incomplete.',
  'unsupported-capability': 'The configured Maximo data source does not support this capability.',
  transient: 'The Maximo data request could not be completed. Please retry.',
  unknown: 'The Maximo data request could not be completed.',
};

export class MaximoAdapterError extends Error {
  readonly name = 'MaximoAdapterError';
  constructor(readonly code: MaximoAdapterErrorCode, readonly retryable = code === 'transient') {
    super(safeErrorMessages[code]);
  }
}

export function adapterError(code: MaximoAdapterErrorCode): MaximoAdapterError {
  return new MaximoAdapterError(code);
}

export interface AuthorizedInvestigationRequest {
  path: readonly PathSegment[];
  filters?: readonly InvestigationFilter[];
  securityScope: AdapterSecurityContext;
}

export interface ExplorationRequest extends AuthorizedInvestigationRequest {
  nextDimension: Dimension | null;
  maxGroups: number;
}

export interface ExplorationGroup { value: string; count: number }
export interface ExplorationResponse { totalCount: number; groups: readonly ExplorationGroup[]; totalGroups: number }

export interface RecordPreviewRequest extends AuthorizedInvestigationRequest { maxRecords: number; offset: number }
export interface RecordExportRequest extends AuthorizedInvestigationRequest {}

export interface WorkOrderExportRecord {
  id: string | null;
  site: string | null;
  status: string | null;
  priority: number | string | null;
  classification: string | null;
  location: string | null;
  asset: string | null;
}

export interface RecordExportResponse { fileName: string; contentType: 'text/csv'; content: string; recordCount: number }
export interface WorkOrderPreviewRecord extends WorkOrderExportRecord {}
export interface RecordPreviewResponse { totalCount: number; records: readonly WorkOrderPreviewRecord[] }

export interface FilterValuesRequest extends AuthorizedInvestigationRequest { dimension: FilterDimension; maxValues: number }
export interface FilterValue { value: string; count: number }
export interface FilterValuesResponse { values: readonly FilterValue[]; totalValues: number }

export interface AnalyticalEvidenceRequest extends AuthorizedInvestigationRequest {}
export interface AuthorizedWorkMixBaseline { eligibleCount: number; reactiveCount: number; plannedCount: number }
export interface AnalyticalEvidenceResponse {
  evidence: readonly WorkOrderAnalyticalEvidence[];
  baseline: AuthorizedWorkMixBaseline;
  referenceTime: string;
}

// Read-only, capability-oriented port. It exposes no table name, SQL, Maximo payload, endpoint, or write operation.
export interface MaximoAdapter {
  readonly profile: MaximoAdapterProfile;
  explore(request: ExplorationRequest): Promise<ExplorationResponse>;
  filterValues?(request: FilterValuesRequest): Promise<FilterValuesResponse>;
  previewRecords(request: RecordPreviewRequest): Promise<RecordPreviewResponse>;
  exportRecords(request: RecordExportRequest): Promise<RecordExportResponse>;
}

export interface AnalyticalEvidenceAdapter extends MaximoAdapter {
  analyticalEvidence(request: AnalyticalEvidenceRequest): Promise<AnalyticalEvidenceResponse>;
}

export function supportsAdapterCapability(adapter: MaximoAdapter, capability: MaximoAdapterCapability): boolean {
  return adapter.profile.availability === 'active' && adapter.profile.capabilities[capability];
}

export function requireAdapterCapability(adapter: MaximoAdapter, capability: MaximoAdapterCapability): void {
  if (adapter.profile.availability !== 'active') throw adapterError('unavailable');
  if (!adapter.profile.capabilities[capability]) throw adapterError('unsupported-capability');
}

export function requestContext(adapter: MaximoAdapter, path: readonly PathSegment[], filters: readonly InvestigationFilter[] = []): AuthorizedInvestigationRequest {
  return {
    path: path.map(({ dimension, value }) => ({ dimension, value })),
    ...(filters.length ? { filters: filters.map(({ dimension, values }) => ({ dimension, values: [...values] })) } : {}),
    securityScope: { ...adapter.profile.securityContext },
  };
}
