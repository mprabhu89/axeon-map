import { useEffect, useState } from 'react';
import { analyzeContextWithMetadata } from '../analytics/analyzeContext';
import type { AnalyticalFinding } from '../analytics/finding';
import { supportsAdapterCapability, type AnalyticalEvidenceAdapter, type MaximoAdapter } from '../data/maximoAdapter';
import type { PathSegment } from './exploration';
import { filtersKey, type InvestigationFilter } from './investigationContext';

export type FindingsLoad =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; findings: readonly AnalyticalFinding[]; referenceTime?: string };

export function supportsAnalyticalEvidence(adapter: MaximoAdapter): adapter is AnalyticalEvidenceAdapter {
  return supportsAdapterCapability(adapter, 'analytics') && 'analyticalEvidence' in adapter && typeof adapter.analyticalEvidence === 'function';
}

export function useOperationalFindings(adapter: AnalyticalEvidenceAdapter | null, path: readonly PathSegment[] | null, revision = 0, filters: readonly InvestigationFilter[] = []) {
  const [load, setLoad] = useState<{ key: string; adapter: AnalyticalEvidenceAdapter | null; revision: number; result: FindingsLoad }>(
    { key: '', adapter: null, revision: 0, result: { status: 'idle' } },
  );
  const [retryIndex, setRetryIndex] = useState(0);
  const key = path && (path.length || filters.length) ? JSON.stringify([path, filtersKey(filters)]) : '';

  useEffect(() => {
    if (!adapter || !path || (!path.length && !filters.length)) return;
    let active = true;
    setLoad({ key, adapter, revision, result: { status: 'loading' } });
    void Promise.resolve().then(() => analyzeContextWithMetadata(adapter, path, filters)).then(({ findings, referenceTime }) => {
      if (active) setLoad({ key, adapter, revision, result: { status: 'ready', findings, referenceTime } });
    }).catch(() => {
      if (active) setLoad({ key, adapter, revision, result: { status: 'error' } });
    });
    return () => { active = false; };
  }, [adapter, key, retryIndex, revision]);

  const current = !adapter || !key ? { status: 'idle' } as const
    : load.key === key && load.adapter === adapter && load.revision === revision ? load.result : { status: 'loading' } as const;
  return { load: current, retry: () => setRetryIndex((index) => index + 1) };
}
