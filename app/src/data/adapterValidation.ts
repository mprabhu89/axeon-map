import { dimensions, type PathSegment } from '../model/exploration';
import { filterDimensions, type InvestigationFilter } from '../model/investigationContext';
import { adapterError, type AdapterSecurityContext, type AuthorizedInvestigationRequest } from './maximoAdapter';

const cleanValue = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;

export function assertAuthorizedContext(request: AuthorizedInvestigationRequest, expected: AdapterSecurityContext): void {
  if (!request || !Array.isArray(request.path)) throw adapterError('invalid-context');
  if (!request.securityScope
    || request.securityScope.kind !== expected.kind
    || request.securityScope.enforcement !== expected.enforcement
    || request.securityScope.source !== expected.source) throw adapterError('unauthorized');

  const used = new Set<string>();
  for (const segment of request.path as readonly PathSegment[]) {
    if (!segment || !dimensions.includes(segment.dimension) || !cleanValue(segment.value) || used.has(segment.dimension)) throw adapterError('invalid-context');
    used.add(segment.dimension);
  }
  if (request.filters === undefined) return;
  if (!Array.isArray(request.filters)) throw adapterError('invalid-context');
  const filtered = new Set<string>();
  for (const filter of request.filters as readonly InvestigationFilter[]) {
    if (!filter || !filterDimensions.includes(filter.dimension) || filtered.has(filter.dimension)
      || !Array.isArray(filter.values) || filter.values.length === 0 || filter.values.some((value) => !cleanValue(value))) throw adapterError('invalid-context');
    filtered.add(filter.dimension);
  }
}

export function boundedInteger(value: number, maximum: number): number {
  if (!Number.isFinite(value) || value <= 0) throw adapterError('invalid-context');
  return Math.min(maximum, Math.floor(value));
}

export function boundedOffset(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw adapterError('invalid-context');
  return value;
}
