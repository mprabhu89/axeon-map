import { useEffect, useRef, useState } from 'react';
import { MAXIMO_ADAPTER_LIMITS, requestContext, requireAdapterCapability, type MaximoAdapter, type RecordPreviewResponse } from '../data/maximoAdapter';
import type { PathSegment } from './exploration';
import { copyFilters, filtersKey, type InvestigationFilter } from './investigationContext';
import { downloadCsv } from './downloadCsv';

export const recordPageSize = MAXIMO_ADAPTER_LIMITS.recordPreviewPageSize;

type PreviewLoad =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; response: RecordPreviewResponse };

export function useRecordPreview(adapter: MaximoAdapter) {
  const [path, setPath] = useState<readonly PathSegment[] | null>(null);
  const [filters, setFilters] = useState<readonly InvestigationFilter[]>([]);
  const [page, setPage] = useState(1);
  const [load, setLoad] = useState<PreviewLoad>({ status: 'idle' });
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [retryIndex, setRetryIndex] = useState(0);
  const exportToken = useRef(0);

  useEffect(() => {
    if (path === null) return;
    let active = true;
    setLoad({ status: 'loading' });
    Promise.resolve().then(() => {
      requireAdapterCapability(adapter, 'records');
      return adapter.previewRecords({
      ...requestContext(adapter, path, filters),
      maxRecords: recordPageSize,
      offset: (page - 1) * recordPageSize,
    }); }).then((response) => {
      if (active) setLoad({ status: 'ready', response });
    }).catch(() => {
      if (active) setLoad({ status: 'error' });
    });
    return () => { active = false; };
  }, [adapter, path, filtersKey(filters), page, retryIndex]);

  const pageCount = load.status === 'ready' ? Math.max(1, Math.ceil(load.response.totalCount / recordPageSize)) : 1;
  return {
    path, filters, page, pageCount, load, exportStatus,
    open: (context: readonly PathSegment[], activeFilters: readonly InvestigationFilter[] = []) => {
      exportToken.current += 1;
      setPath([...context]);
      setFilters(copyFilters(activeFilters));
      setPage(1);
      setLoad({ status: 'loading' });
      setExportStatus('idle');
    },
    close: () => {
      exportToken.current += 1;
      setPath(null);
      setFilters([]);
      setPage(1);
      setLoad({ status: 'idle' });
      setExportStatus('idle');
    },
    previous: () => {
      if (load.status === 'ready' && page > 1) {
        setLoad({ status: 'loading' });
        setPage(page - 1);
      }
    },
    next: () => {
      if (load.status === 'ready' && page < pageCount) {
        setLoad({ status: 'loading' });
        setPage(page + 1);
      }
    },
    retry: () => { setLoad({ status: 'loading' }); setRetryIndex((index) => index + 1); },
    download: async () => {
      if (path === null || exportStatus === 'loading') return;
      const token = ++exportToken.current;
      setExportStatus('loading');
      try {
        requireAdapterCapability(adapter, 'export');
        const exported = await adapter.exportRecords(requestContext(adapter, path, filters));
        if (token !== exportToken.current) return;
        downloadCsv(exported);
        setExportStatus('idle');
      } catch {
        if (token === exportToken.current) setExportStatus('error');
      }
    },
  };
}
