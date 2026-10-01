import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { MAXIMO_ADAPTER_LIMITS, requestContext, requireAdapterCapability, supportsAdapterCapability, type ExplorationResponse, type MaximoAdapter } from '../data/maximoAdapter';
import { availableDimensions, pathLabels, type Dimension, type PathSegment } from './exploration';
import { initialInvestigation, investigationReducer, viewParentPath } from './investigation';
import { copyFilters, filtersKey, normalizeFilters, type InvestigationFilter } from './investigationContext';

export interface InvestigationNode {
  id: string;
  kind: 'spine' | 'candidate';
  label: string;
  count: number;
  path: readonly PathSegment[];
  dimension: Dimension | 'Work Orders';
}

const visibleChildLimit = MAXIMO_ADAPTER_LIMITS.visibleExplorationGroups;

type LoadState =
  | { key: string; status: 'loading' | 'error' }
  | { key: string; status: 'ready'; response: ExplorationResponse };

export function useInvestigation(adapter: MaximoAdapter) {
  const [state, dispatch] = useReducer(investigationReducer, initialInvestigation);
  const [load, setLoad] = useState<LoadState>({ key: '', status: 'loading' });
  const [retryIndex, setRetryIndex] = useState(0);
  const [rootCount, setRootCount] = useState<number | null>(null);
  const [filters, setFilters] = useState<readonly InvestigationFilter[]>([]);
  const [filteredSpine, setFilteredSpine] = useState<{ key: string; counts: readonly number[] } | null>(null);
  const restoreToken = useRef(0);
  // Inspection is transient presentation state; only the reducer owns the committed path.
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const parentPath = useMemo(() => viewParentPath(state), [state]);
  const activeFiltersKey = filtersKey(filters);
  const requestKey = JSON.stringify([parentPath, state.displayDimension, activeFiltersKey]);

  useEffect(() => {
    let active = true;
    setLoad({ key: requestKey, status: 'loading' });
    Promise.resolve().then(() => {
      requireAdapterCapability(adapter, 'exploration');
      return adapter.explore({
      ...requestContext(adapter, parentPath, filters),
      nextDimension: state.displayDimension,
      maxGroups: visibleChildLimit,
    }); }).then((response) => {
      if (active) {
        if (parentPath.length === 0 && filters.length === 0) setRootCount(response.totalCount);
        setLoad({ key: requestKey, status: 'ready', response });
      }
    }).catch(() => {
      if (active) setLoad({ key: requestKey, status: 'error' });
    });
    return () => { active = false; };
  }, [adapter, requestKey, retryIndex]);

  const spineCountKey = JSON.stringify([state.path, activeFiltersKey]);
  useEffect(() => {
    if (!filters.length) { setFilteredSpine(null); return; }
    let active = true;
    const paths = [[], ...state.path.map((_, index) => state.path.slice(0, index + 1))] as readonly PathSegment[][];
    void Promise.all(paths.map((path) => adapter.explore({
      ...requestContext(adapter, path, filters), nextDimension: null, maxGroups: 1,
    }))).then((responses) => {
      if (active) setFilteredSpine({ key: spineCountKey, counts: responses.map((response) => response.totalCount) });
    }).catch(() => {
      if (active) setFilteredSpine({ key: spineCountKey, counts: [] });
    });
    return () => { active = false; };
  }, [adapter, spineCountKey]);

  const activeLoad = load.key === requestKey ? load : null;
  const response = activeLoad?.status === 'ready' ? activeLoad.response : null;
  const filteredCounts = filteredSpine?.key === spineCountKey ? filteredSpine.counts : null;
  const view = useMemo(() => {
    const knownRootCount = filters.length
      ? filteredCounts?.[0] ?? (parentPath.length === 0 ? response?.totalCount ?? null : null)
      : rootCount ?? (parentPath.length === 0 ? response?.totalCount ?? null : null);
    const spine: InvestigationNode[] = knownRootCount === null ? [] : [{
      id: 'spine:0', kind: 'spine', label: 'Work Orders', count: knownRootCount, path: [], dimension: 'Work Orders',
    }];
    parentPath.forEach((segment, index) => spine.push({
      id: `spine:${index + 1}`,
      kind: 'spine',
      label: segment.value,
      count: filters.length ? filteredCounts?.[index + 1] ?? 0 : state.selectedCounts[index]!,
      path: parentPath.slice(0, index + 1),
      dimension: segment.dimension,
    }));
    if (!response) return { spine, children: [], selected: spine.find((node) => node.id === inspectedId) ?? spine.at(-1) ?? null, hiddenCount: 0 };
    const children: InvestigationNode[] = response.groups.map(({ value, count }) => ({
      id: `candidate:${state.displayDimension}:${value}`,
      kind: 'candidate',
      label: value,
      count,
      path: [...parentPath, { dimension: state.displayDimension!, value }],
      dimension: state.displayDimension!,
    }));
    const selected = [...children, ...spine].find((node) => node.id === inspectedId) ?? spine.at(-1) ?? null;
    return { spine, children, selected, hiddenCount: Math.max(0, response.totalGroups - children.length) };
  }, [response, rootCount, filteredCounts, parentPath, state, inspectedId, activeFiltersKey]);

  return {
    ...view,
    loading: !activeLoad || activeLoad.status === 'loading',
    error: activeLoad?.status === 'error',
    state,
    filters,
    path: pathLabels(state.path),
    available: view.selected?.kind === 'spine' && view.selected.path.length === state.path.length
      ? availableDimensions(state.path) : [],
    canChooseDimension: view.selected?.kind === 'spine' && view.selected.path.length === state.path.length,
    selectNode: (node: InvestigationNode) => setInspectedId(node.id),
    explore: () => {
      if (view.selected?.kind !== 'candidate' || !state.displayDimension) return;
      restoreToken.current += 1;
      dispatch({ type: 'explore-child', value: view.selected.label, count: view.selected.count });
      setInspectedId(null);
    },
    chooseDimension: (dimension: Dimension) => {
      restoreToken.current += 1;
      dispatch({ type: 'choose-dimension', dimension });
      setInspectedId(null);
    },
    back: () => { restoreToken.current += 1; dispatch({ type: 'back' }); setInspectedId(null); },
    reset: () => { restoreToken.current += 1; dispatch({ type: 'reset' }); setFilters([]); setInspectedId(null); },
    applyFilters: (next: readonly InvestigationFilter[]) => { setFilters(copyFilters(next)); },
    clearFilters: () => { setFilters([]); },
    removeFilter: (dimension: InvestigationFilter['dimension']) => {
      setFilters((current) => current.filter((filter) => filter.dimension !== dimension));
    },
    restore: async (savedPath: readonly PathSegment[], savedFilters: readonly InvestigationFilter[] = []): Promise<boolean> => {
      const token = ++restoreToken.current;
      const normalizedFilters = normalizeFilters(savedFilters);
      if ((!savedPath.length && !normalizedFilters.length) || savedPath.length > 6) return false;
      const used = new Set<Dimension>();
      const validated: PathSegment[] = [];
      const counts: number[] = [];
      try {
        for (const segment of savedPath) {
          if (!segment || !availableDimensions(validated).includes(segment.dimension)
            || typeof segment.value !== 'string' || !segment.value.trim() || used.has(segment.dimension)) return false;
          const response = await adapter.explore({
            ...requestContext(adapter, validated),
            nextDimension: segment.dimension,
            maxGroups: visibleChildLimit,
          });
          if (token !== restoreToken.current) return false;
          const match = response.groups.find((group) => group.value === segment.value && group.count > 0);
          if (!match) return false;
          validated.push({ dimension: segment.dimension, value: segment.value });
          counts.push(match.count);
          used.add(segment.dimension);
        }
        if (normalizedFilters.length) {
          if (!adapter.filterValues || !supportsAdapterCapability(adapter, 'filters')) return false;
          for (const filter of normalizedFilters) {
            const response = await adapter.filterValues({
              ...requestContext(adapter, validated), dimension: filter.dimension,
              maxValues: MAXIMO_ADAPTER_LIMITS.filterValuesPerDimension,
            });
            const available = new Set(response.values.map(({ value }) => value));
            if (filter.values.some((value) => !available.has(value))) return false;
          }
          const combined = await adapter.explore({
            ...requestContext(adapter, validated, normalizedFilters), nextDimension: null, maxGroups: 1,
          });
          if (combined.totalCount <= 0) return false;
        }
        if (token !== restoreToken.current) return false;
        dispatch({ type: 'restore', path: validated, counts });
        setFilters(copyFilters(normalizedFilters));
        setInspectedId(null);
        return true;
      } catch {
        return false;
      }
    },
    retry: () => setRetryIndex((index) => index + 1),
  };
}
