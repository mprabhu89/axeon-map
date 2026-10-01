import { dimensions, type Dimension, type PathSegment } from '../model/exploration';
import { filterDimensions, normalizeFilters, type FilterDimension, type InvestigationFilter } from '../model/investigationContext';
import { adapterCapabilities, adapterError, MAXIMO_ADAPTER_LIMITS, MOCK_SECURITY_CONTEXT, type AnalyticalEvidenceAdapter, type ExplorationRequest, type ExplorationResponse, type FilterValuesRequest, type MaximoAdapterProfile, type RecordPreviewRequest, type RecordPreviewResponse } from './maximoAdapter';
import { generateSyntheticWorkOrders, SYNTHETIC_REFERENCE_DATE, type SyntheticWorkOrder } from './syntheticWorkOrders';
import { csvDocument, csvRecord, exportFileName } from './csvExport';
import { assertAuthorizedContext, boundedInteger, boundedOffset } from './adapterValidation';
import { normalizeAnalyticalEvidence, normalizePreviewRecord } from './workOrderNormalization';

export const MOCK_MAXIMO_ADAPTER_PROFILE: MaximoAdapterProfile = Object.freeze({
  id: 'mock', displayName: 'Mock Maximo Adapter', mode: 'development', availability: 'active',
  capabilities: adapterCapabilities(['exploration', 'filters', 'records', 'export', 'analytics', 'reporting-aggregates']),
  securityContext: MOCK_SECURITY_CONTEXT,
});

const fieldByDimension: Record<Dimension, keyof Omit<SyntheticWorkOrder, 'id'>> = {
  Site: 'site', Status: 'status', Priority: 'priority', Classification: 'classification', Location: 'location', Asset: 'asset',
};

const filterFieldByDimension: Record<FilterDimension, keyof SyntheticWorkOrder> = {
  ...fieldByDimension,
  'Work Type': 'workType',
};

function fieldValue(record: SyntheticWorkOrder, dimension: Dimension): string {
  const value = record[fieldByDimension[dimension]];
  return value === null || String(value).trim() === '' ? '(Unspecified)' : String(value);
}

function filterFieldValue(record: SyntheticWorkOrder, dimension: FilterDimension): string {
  const value = record[filterFieldByDimension[dimension]];
  return value === null || String(value).trim() === '' ? '(Unspecified)' : String(value);
}

function matchesContext(
  record: SyntheticWorkOrder,
  path: readonly PathSegment[],
  filters: readonly InvestigationFilter[] = [],
  excludedFilterDimension?: FilterDimension,
): boolean {
  if (!path.every(({ dimension, value }) => fieldValue(record, dimension) === value)) return false;
  return normalizeFilters(filters).every((filter) => filter.dimension === excludedFilterDimension
    || filter.values.includes(filterFieldValue(record, filter.dimension)));
}

function aggregate(records: readonly SyntheticWorkOrder[], request: ExplorationRequest): ExplorationResponse {
  const counts = new Map<string, number>();
  let totalCount = 0;
  for (const record of records) {
    if (!matchesContext(record, request.path, request.filters)) continue;
    totalCount += 1;
    if (request.nextDimension) {
      const value = fieldValue(record, request.nextDimension);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const groups = [...counts].map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, undefined, { numeric: true }));
  const limit = boundedInteger(request.maxGroups, MAXIMO_ADAPTER_LIMITS.visibleExplorationGroups);
  return { totalCount, groups: groups.slice(0, limit), totalGroups: groups.length };
}

function preview(records: readonly SyntheticWorkOrder[], request: RecordPreviewRequest): RecordPreviewResponse {
  const limit = boundedInteger(request.maxRecords, MAXIMO_ADAPTER_LIMITS.recordPreviewPageSize);
  const offset = boundedOffset(request.offset);
  const matches: SyntheticWorkOrder[] = [];
  let totalCount = 0;
  for (const record of records) {
    if (!matchesContext(record, request.path, request.filters)) continue;
    totalCount += 1;
    if (totalCount > offset && matches.length < limit) matches.push(record);
  }
  return {
    totalCount,
    records: matches.map((record) => normalizePreviewRecord(record as unknown as Record<string, unknown>)),
  };
}

function discoverFilterValues(records: readonly SyntheticWorkOrder[], request: FilterValuesRequest) {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!matchesContext(record, request.path, request.filters, request.dimension)) continue;
    const value = filterFieldValue(record, request.dimension);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const values = [...counts].map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, undefined, { numeric: true }));
  const limit = boundedInteger(request.maxValues, MAXIMO_ADAPTER_LIMITS.filterValuesPerDimension);
  return { values: values.slice(0, limit), totalValues: values.length };
}

export function createMockMaximoAdapter(records: readonly SyntheticWorkOrder[] = generateSyntheticWorkOrders()): AnalyticalEvidenceAdapter {
  const cache = new Map<string, ExplorationResponse>();
  const baseline = {
    eligibleCount: records.filter((record) => record.workType === 'PM' || record.workType === 'CM' || record.workType === 'EM').length,
    reactiveCount: records.filter((record) => record.workType === 'CM' || record.workType === 'EM').length,
    plannedCount: records.filter((record) => record.workType === 'PM').length,
  };
  return {
    profile: MOCK_MAXIMO_ADAPTER_PROFILE,
    async explore(request) {
      // This is a synthetic-only implementation. The scope marker is not authorization.
      assertAuthorizedContext(request, MOCK_SECURITY_CONTEXT);
      if (request.nextDimension !== null && !dimensions.includes(request.nextDimension)) throw adapterError('invalid-context');
      const key = JSON.stringify(request);
      const cached = cache.get(key);
      if (cached) return cached;
      const response = aggregate(records, request);
      cache.set(key, response);
      return response;
    },
    async filterValues(request) {
      assertAuthorizedContext(request, MOCK_SECURITY_CONTEXT);
      if (!filterDimensions.includes(request.dimension)) throw adapterError('invalid-context');
      return discoverFilterValues(records, request);
    },
    async previewRecords(request) {
      // This synthetic scope marker is not authorization.
      assertAuthorizedContext(request, MOCK_SECURITY_CONTEXT);
      return preview(records, request);
    },
    async exportRecords(request) {
      assertAuthorizedContext(request, MOCK_SECURITY_CONTEXT);
      const rows: string[] = [];
      for (const record of records) {
        if (matchesContext(record, request.path, request.filters)) rows.push(csvRecord(record));
      }
      return {
        fileName: exportFileName(request.path),
        contentType: 'text/csv',
        content: csvDocument(rows),
        recordCount: rows.length,
      };
    },
    async analyticalEvidence(request) {
      // Mock scope is fictitious; a Real Adapter must authorize before returning evidence or baseline.
      assertAuthorizedContext(request, MOCK_SECURITY_CONTEXT);
      return {
        evidence: records.filter((record) => matchesContext(record, request.path, request.filters))
          .map((record) => normalizeAnalyticalEvidence(record as unknown as Record<string, unknown>)),
        baseline: { ...baseline },
        referenceTime: SYNTHETIC_REFERENCE_DATE,
      };
    },
  };
}

export const mockMaximoAdapter = createMockMaximoAdapter();
