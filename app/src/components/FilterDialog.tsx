import { useEffect, useMemo, useRef, useState } from 'react';
import { MAXIMO_ADAPTER_LIMITS, requestContext, supportsAdapterCapability, type FilterValue, type MaximoAdapter } from '../data/maximoAdapter';
import type { PathSegment } from '../model/exploration';
import { filterDimensions, normalizeFilters, type FilterDimension, type InvestigationFilter } from '../model/investigationContext';

interface Props {
  adapter: MaximoAdapter;
  path: readonly PathSegment[];
  activeFilters: readonly InvestigationFilter[];
  onApply: (filters: readonly InvestigationFilter[]) => void;
  onClear: () => void;
  onClose: () => void;
}

type Discovery = { status: 'loading' | 'error' } | { status: 'ready'; values: Readonly<Record<FilterDimension, readonly FilterValue[]>> };
const workTypeDimension: FilterDimension = 'Work Type';
const remainingFilterDimensions = filterDimensions.filter((dimension) => dimension !== workTypeDimension);

function FilterGroup({ dimension, values, draft, onToggle, featured = false }: {
  dimension: FilterDimension;
  values: readonly FilterValue[];
  draft: readonly InvestigationFilter[];
  onToggle: (dimension: FilterDimension, value: string) => void;
  featured?: boolean;
}) {
  return <fieldset className={`filter-group${featured ? ' filter-group-featured' : ''}`} data-filter-dimension={dimension}>
    <legend>{dimension}</legend>
    {values.length === 0 ? <p>No values in this context.</p> : <div>{values.map(({ value, count }) => {
      const checked = draft.some((filter) => filter.dimension === dimension && filter.values.includes(value));
      return <label key={value}><input type="checkbox" checked={checked} onChange={() => onToggle(dimension, value)} /><span>{value}</span><small>{count.toLocaleString()}</small></label>;
    })}</div>}
  </fieldset>;
}

export function FilterDialog({ adapter, path, activeFilters, onApply, onClear, onClose }: Props) {
  const [draft, setDraft] = useState(() => normalizeFilters(activeFilters));
  const [discovery, setDiscovery] = useState<Discovery>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const closeButton = useRef<HTMLButtonElement>(null);
  const activeKey = useMemo(() => JSON.stringify(activeFilters), [activeFilters]);
  useEffect(() => setDraft(normalizeFilters(activeFilters)), [activeKey]);
  useEffect(() => {
    let current = true;
    setDiscovery({ status: 'loading' });
    if (!adapter.filterValues || !supportsAdapterCapability(adapter, 'filters')) { setDiscovery({ status: 'error' }); return () => { current = false; }; }
    void Promise.all(filterDimensions.map(async (dimension) => ({
      dimension,
      response: await adapter.filterValues!({ ...requestContext(adapter, path, activeFilters), dimension, maxValues: MAXIMO_ADAPTER_LIMITS.filterValuesPerDimension }),
    }))).then((results) => {
      if (!current) return;
      const values = Object.fromEntries(results.map(({ dimension, response }) => [dimension, response.values])) as Record<FilterDimension, readonly FilterValue[]>;
      setDiscovery({ status: 'ready', values });
    }).catch(() => { if (current) setDiscovery({ status: 'error' }); });
    return () => { current = false; };
  }, [adapter, JSON.stringify(path), activeKey, revision]);
  useEffect(() => {
    closeButton.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);

  const toggle = (dimension: FilterDimension, value: string) => {
    setDraft((current) => {
      const existing = current.find((item) => item.dimension === dimension)?.values ?? [];
      const values = existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value];
      return normalizeFilters([...current.filter((item) => item.dimension !== dimension), ...(values.length ? [{ dimension, values }] : [])]);
    });
  };

  return <div className="preview-backdrop">
    <section className="filter-dialog" role="dialog" aria-modal="true" aria-labelledby="filter-title">
      <div className="preview-heading"><div><span className="eyebrow">POPULATION CONSTRAINT</span><h2 id="filter-title">Filter Investigation</h2></div><button ref={closeButton} type="button" onClick={onClose}>Close</button></div>
      <p className="filter-intro">Values within one dimension use OR. Different dimensions use AND. Changes take effect only when applied.</p>
      {discovery.status === 'loading' && <p role="status" className="preview-message">Loading available filter values…</p>}
      {discovery.status === 'error' && <div role="alert" className="preview-message">Filter values are unavailable.<button type="button" className="retry-button" onClick={() => setRevision((value) => value + 1)}>Retry</button></div>}
      {discovery.status === 'ready' && <>
        <div className="filter-primary-group">
          <span>WORK MANAGEMENT</span>
          <FilterGroup dimension={workTypeDimension} values={discovery.values[workTypeDimension]} draft={draft} onToggle={toggle} featured />
        </div>
        <div className="filter-groups">{remainingFilterDimensions.map((dimension) => <FilterGroup key={dimension} dimension={dimension} values={discovery.values[dimension]} draft={draft} onToggle={toggle} />)}</div>
      </>}
      <div className="filter-actions"><button type="button" onClick={() => { onClear(); onClose(); }}>Clear Filters</button><button type="button" onClick={onClose}>Cancel</button><button className="filter-apply" type="button" onClick={() => { onApply(draft); onClose(); }} disabled={discovery.status !== 'ready'}>Apply Filters</button></div>
    </section>
  </div>;
}
