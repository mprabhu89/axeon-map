import { dimensions, type Dimension, type PathSegment } from './exploration';
import type { AdapterSecurityContext } from '../data/maximoAdapter';

export const filterDimensions = [...dimensions, 'Work Type'] as const;
export type FilterDimension = typeof filterDimensions[number];

export interface InvestigationFilter {
  dimension: FilterDimension;
  values: readonly string[];
}

export interface InvestigationContext {
  path: readonly PathSegment[];
  filters: readonly InvestigationFilter[];
  securityScope: AdapterSecurityContext;
}

export function normalizeFilters(filters: readonly InvestigationFilter[]): InvestigationFilter[] {
  const allowed = new Set<string>(filterDimensions);
  const byDimension = new Map<FilterDimension, Set<string>>();
  for (const filter of filters) {
    if (!filter || typeof filter !== 'object') continue;
    if (!allowed.has(filter.dimension) || !Array.isArray(filter.values)) continue;
    const values = byDimension.get(filter.dimension) ?? new Set<string>();
    for (const raw of filter.values) {
      if (typeof raw !== 'string') continue;
      const value = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
      if (value && value.length <= 200) values.add(value);
    }
    if (values.size) byDimension.set(filter.dimension, values);
  }
  return filterDimensions.flatMap((dimension) => {
    const values = byDimension.get(dimension);
    return values?.size ? [{ dimension, values: [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) }] : [];
  });
}

export function copyFilters(filters: readonly InvestigationFilter[]): InvestigationFilter[] {
  return normalizeFilters(filters).map(({ dimension, values }) => ({ dimension, values: [...values] }));
}

export function filtersKey(filters: readonly InvestigationFilter[]): string {
  return JSON.stringify(normalizeFilters(filters));
}

export function contextKey(path: readonly PathSegment[], filters: readonly InvestigationFilter[]): string {
  return JSON.stringify([path, normalizeFilters(filters)]);
}

export function filtersEqual(left: readonly InvestigationFilter[], right: readonly InvestigationFilter[]): boolean {
  return filtersKey(left) === filtersKey(right);
}

export function filterLabel(filter: InvestigationFilter): string {
  return `${filter.dimension}: ${filter.values.join(', ')}`;
}

export function isPathDimension(dimension: FilterDimension): dimension is Dimension {
  return dimensions.includes(dimension as Dimension);
}
