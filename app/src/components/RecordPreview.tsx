import { useEffect, useRef } from 'react';
import type { RecordPreviewResponse, WorkOrderPreviewRecord } from '../data/maximoAdapter';
import { pathLabels, type PathSegment } from '../model/exploration';
import { filterLabel, type InvestigationFilter } from '../model/investigationContext';

interface Props {
  path: readonly PathSegment[];
  filters: readonly InvestigationFilter[];
  page: number;
  pageCount: number;
  load: { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; response: RecordPreviewResponse };
  exportStatus: 'idle' | 'loading' | 'error';
  onClose: () => void;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
}

function display(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

const columns: { label: string; field: keyof WorkOrderPreviewRecord }[] = [
  { label: 'Work Order', field: 'id' },
  { label: 'Site', field: 'site' },
  { label: 'Status', field: 'status' },
  { label: 'Priority', field: 'priority' },
  { label: 'Classification', field: 'classification' },
  { label: 'Location', field: 'location' },
  { label: 'Asset', field: 'asset' },
];

export function RecordPreview({ path, filters, page, pageCount, load, exportStatus, onClose, onRetry, onPrevious, onNext, onDownload }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="preview-backdrop">
      <section className="record-preview" role="dialog" aria-modal="true" aria-labelledby="record-preview-title">
        <div className="preview-heading">
          <div><span className="eyebrow">READ-ONLY RECORD PREVIEW</span><h2 id="record-preview-title">Work Orders</h2></div>
          <button ref={closeRef} className="preview-close" type="button" onClick={onClose} aria-label="Close" title="Close"><span aria-hidden="true">×</span></button>
        </div>
        <div className="preview-path"><span className="field-label">REPRESENTED CONTEXT</span><p>{pathLabels(path).join(' → ')}</p></div>
        {filters.length > 0 && <div className="preview-filters"><span className="field-label">ACTIVE FILTERS</span><ul>{filters.map((filter) => <li key={filter.dimension}>{filterLabel(filter)}</li>)}</ul></div>}
        <div className="preview-actions">
          <button type="button" className="preview-download" onClick={onDownload} disabled={exportStatus === 'loading'} aria-label="Download spreadsheet" title="Download spreadsheet">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v11m-4-4 4 4 4-4M4 17v3h16v-3" /></svg>
          </button>
          {exportStatus === 'error' && <span role="alert">Download is unavailable. Please try again.</span>}
        </div>
        {load.status === 'loading' && <p role="status" className="preview-message">Loading record preview…</p>}
        {load.status === 'error' && <div role="alert" className="preview-message">
          Record preview is unavailable. Please retry.
          <button type="button" className="retry-button" onClick={onRetry}>Retry record preview</button>
        </div>}
        {load.status === 'ready' && <>
          <div className="preview-summary"><strong>{load.response.totalCount.toLocaleString()} matching Work Orders</strong><span>{load.response.records.length === 0 ? 'Showing 0 of 0' : `Showing ${(page - 1) * 20 + 1}–${(page - 1) * 20 + load.response.records.length} of ${load.response.totalCount.toLocaleString()}`}</span></div>
          <div className="preview-scroll">
            <table className="preview-table">
              <thead><tr>{columns.map(({ label }) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{load.response.records.map((record, index) => <tr key={record.id ?? `missing-${index}`}>{columns.map(({ field }) => <td key={field}>{display(record[field])}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {load.response.records.length === 0 && <p className="preview-message">No matching Work Orders.</p>}
          <nav className="preview-pagination" aria-label="Record preview pages">
            <button type="button" onClick={onPrevious} disabled={page === 1}>Previous</button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" onClick={onNext} disabled={page >= pageCount}>Next</button>
          </nav>
        </>}
      </section>
    </div>
  );
}
