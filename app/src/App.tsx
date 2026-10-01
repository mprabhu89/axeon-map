import { useEffect, useMemo, useRef, useState } from 'react';
import type { AxeonAIGateway } from './ai/contracts';
import { DEFAULT_LOCAL_AI_CONFIGURATION, type AxeonAIConfiguration } from './ai/configuration';
import { resolveAxeonAIRuntime } from './ai/providerResolver';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { AIProviderStatus } from './components/AIProviderStatus';
import { ContextPanel } from './components/ContextPanel';
import { InvestigationCanvas } from './components/InvestigationCanvas';
import { InvestigationLibrary } from './components/InvestigationLibrary';
import { RecordPreview } from './components/RecordPreview';
import { FilterDialog } from './components/FilterDialog';
import type { MaximoAdapter } from './data/maximoAdapter';
import { useInvestigation } from './model/useInvestigation';
import { useInvestigationReport } from './model/useInvestigationReport';
import { createBrowserInvestigationPersistence, type InvestigationPersistence, type RecentInvestigation, type SavedInvestigation } from './model/investigationPersistence';
import { useRecordPreview } from './model/useRecordPreview';
import { supportsAnalyticalEvidence, useOperationalFindings } from './model/useOperationalFindings';
import { useAxeonAI } from './model/useAxeonAI';
import { filterLabel, type InvestigationFilter } from './model/investigationContext';
import type { ReportWindowLauncher } from './report/reportWindow';

export function App({ adapter, persistence, aiGateway, aiConfiguration = DEFAULT_LOCAL_AI_CONFIGURATION, reportWindowLauncher }: { adapter: MaximoAdapter; persistence?: InvestigationPersistence; aiGateway?: AxeonAIGateway; aiConfiguration?: Readonly<AxeonAIConfiguration>; reportWindowLauncher?: ReportWindowLauncher }) {
  const aiRuntime = useMemo(() => resolveAxeonAIRuntime(aiConfiguration), [aiConfiguration.enabled, aiConfiguration.selectedProviderId]);
  const effectiveAIGateway = aiGateway ?? aiRuntime.gateway;
  const investigation = useInvestigation(adapter);
  const preview = useRecordPreview(adapter);
  const report = useInvestigationReport(adapter, reportWindowLauncher);
  const [analysisRevision, setAnalysisRevision] = useState(0);
  const findings = useOperationalFindings(
    supportsAnalyticalEvidence(adapter) ? adapter : null,
    investigation.selected?.path ?? null,
    analysisRevision,
    investigation.filters,
  );
  const axeonAI = useAxeonAI(effectiveAIGateway, investigation.selected, findings.load, analysisRevision, aiGateway ? {
    status: 'active', message: 'Injected Axeon AI Gateway is available.', providerId: 'injected',
  } : { status: aiRuntime.executionStatus, message: aiRuntime.statusMessage, providerId: aiRuntime.provider.id }, investigation.filters, adapter.profile.securityContext);
  const store = useMemo(() => persistence ?? createBrowserInvestigationPersistence(), [persistence]);
  const [saved, setSaved] = useState(() => store.listSaved());
  const [recent, setRecent] = useState(() => store.listRecent());
  const [libraryMode, setLibraryMode] = useState<'save' | 'browse' | null>(null);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [providerStatusOpen, setProviderStatusOpen] = useState(false);
  const [filterPath, setFilterPath] = useState<SavedInvestigation['path'] | null>(null);
  const providerStatusTrigger = useRef<HTMLButtonElement | null>(null);
  const libraryTrigger = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const filterReturnFocus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (preview.path === null && returnFocus.current) {
      returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [preview.path]);
  useEffect(() => {
    if (libraryMode === null && libraryTrigger.current) {
      libraryTrigger.current.focus();
      libraryTrigger.current = null;
    }
  }, [libraryMode]);
  useEffect(() => {
    if (!providerStatusOpen && providerStatusTrigger.current) {
      providerStatusTrigger.current.focus();
      providerStatusTrigger.current = null;
    }
  }, [providerStatusOpen]);
  useEffect(() => {
    if (filterPath === null && filterReturnFocus.current) {
      filterReturnFocus.current.focus();
      filterReturnFocus.current = null;
    }
  }, [filterPath]);

  const refreshLibrary = () => {
    setSaved(store.listSaved());
    setRecent(store.listRecent());
  };
  const openLibrary = (mode: 'save' | 'browse', source: HTMLButtonElement) => {
    libraryTrigger.current = source;
    setLibraryError(null);
    refreshLibrary();
    setLibraryMode(mode);
  };
  const saveInvestigation = (name: string) => {
    try {
      store.save(name, investigation.state.path, investigation.filters);
      refreshLibrary();
      setLibraryMode('browse');
      setLibraryError(null);
    } catch {
      setLibraryError('Investigation could not be saved. Please retry.');
    }
  };
  const resume = async (path: SavedInvestigation['path'], filters: readonly InvestigationFilter[] = [], savedId?: string) => {
    setLibraryBusy(true);
    setLibraryError(null);
    const restored = await investigation.restore(path, filters);
    if (restored) {
      setAnalysisRevision((revision) => revision + 1);
      try {
        store.recordRecent(path, filters);
        if (savedId) store.markOpened(savedId);
        else store.recordRecent(path, filters);
        refreshLibrary();
      } catch {
        // Restoring a valid path is independent of local recent-list storage.
      }
      preview.close();
      setLibraryMode(null);
    } else {
      setLibraryError('This investigation could not be reopened. The current data may have changed.');
    }
    setLibraryBusy(false);
  };
  const resetInvestigation = () => {
    try {
      store.recordRecent(investigation.state.path, investigation.filters);
      refreshLibrary();
    } catch {
      // Reset remains available if local storage is unavailable.
    }
    investigation.reset();
  };
  const deleteSaved = (id: string) => {
    try {
      store.deleteSaved(id);
      refreshLibrary();
      setLibraryError(null);
    } catch {
      setLibraryError('Saved investigation could not be deleted. Please retry.');
    }
  };

  const openRecords = (source: HTMLButtonElement) => {
    if (!investigation.selected) return;
    returnFocus.current = source;
    preview.open(investigation.selected.path, investigation.filters);
  };
  const openReport = (_source: HTMLButtonElement) => {
    if (!investigation.selected) return;
    report.open({
      context: {
        path: investigation.selected.path,
        nodeType: investigation.selected.dimension,
        nodeLabel: investigation.selected.label,
        population: investigation.selected.count,
        filters: investigation.filters,
      },
      findings: findings.load.status === 'ready' ? findings.load.findings : [],
      referenceTime: findings.load.status === 'ready' ? findings.load.referenceTime ?? null : null,
      ...(axeonAI.load.status === 'ready' ? { aiSnapshot: {
        contextPath: axeonAI.load.contextPath,
        contextFilters: axeonAI.load.contextFilters,
        question: axeonAI.load.question,
        response: axeonAI.load.response,
      } } : {}),
    });
  };
  const openFilters = (source: HTMLButtonElement) => {
    if (!investigation.selected) return;
    filterReturnFocus.current = source;
    setFilterPath(investigation.selected.path);
  };

  return (
    <div className="app-shell">
      <AppHeader providerLabel={aiRuntime.provider.displayName} providerStatus={aiRuntime.executionStatus} onOpenProvider={(source) => { providerStatusTrigger.current = source; setProviderStatusOpen(true); }} />
      <div className="workspace-header"><div><span className="eyebrow">INVESTIGATION PATH</span><nav aria-label="Investigation path">{investigation.path.join(' → ')}</nav>{investigation.filters.length > 0 && <div className="active-filter-strip" aria-label="Active filters"><span>FILTERED BY</span>{investigation.filters.map((filter) => <button key={filter.dimension} type="button" onClick={() => investigation.removeFilter(filter.dimension)} aria-label={`Remove ${filter.dimension} filter`}>{filterLabel(filter)} <b aria-hidden="true">×</b></button>)}</div>}</div><div className="workspace-actions">{(investigation.state.path.length > 0 || investigation.filters.length > 0) && <button type="button" onClick={(event) => openLibrary('save', event.currentTarget)}>Save Investigation</button>}<button type="button" onClick={(event) => openLibrary('browse', event.currentTarget)}>Saved & Recent</button><span className="workspace-id">WORK ORDERS / LOCAL EXPLORATION</span></div></div>
      {report.error && <div className="report-launch-error" role="alert"><span>{report.error.message}</span><div><button type="button" onClick={report.retry}>Retry Investigation Report</button><button type="button" onClick={report.dismissError} aria-label="Dismiss report error">Dismiss</button></div></div>}
      <main className="workspace">
        <InvestigationCanvas spine={investigation.spine} children={investigation.children} dimension={investigation.state.displayDimension} hiddenCount={investigation.hiddenCount} selectedId={investigation.selected?.id ?? ''} onSelect={investigation.selectNode} loading={investigation.loading} error={investigation.error} />
        <ContextPanel node={investigation.selected} available={investigation.available} canChooseDimension={investigation.canChooseDimension} filters={investigation.filters} onExplore={investigation.explore} onOpenRecords={openRecords} onOpenReport={openReport} onOpenFilters={openFilters} onChooseDimension={investigation.chooseDimension} onBack={investigation.back} onReset={resetInvestigation} canBack={investigation.state.path.length > 0 || investigation.state.displayDimension !== null} canReset={investigation.state.path.length > 0 || investigation.state.displayDimension !== null || investigation.selected?.kind === 'candidate' || investigation.filters.length > 0} loading={investigation.loading} error={investigation.error} onRetry={investigation.retry} findings={findings.load} onRetryFindings={findings.retry} ai={axeonAI} />
      </main>
      {preview.path !== null && <RecordPreview path={preview.path} filters={preview.filters} page={preview.page} pageCount={preview.pageCount} load={preview.load} exportStatus={preview.exportStatus} onClose={preview.close} onRetry={preview.retry} onPrevious={preview.previous} onNext={preview.next} onDownload={preview.download} />}
      {filterPath !== null && <FilterDialog adapter={adapter} path={filterPath} activeFilters={investigation.filters} onApply={investigation.applyFilters} onClear={investigation.clearFilters} onClose={() => setFilterPath(null)} />}
      {libraryMode !== null && <InvestigationLibrary key={libraryMode} mode={libraryMode} committedPath={investigation.state.path} committedFilters={investigation.filters} saved={saved} recent={recent} busy={libraryBusy} error={libraryError} onClose={() => setLibraryMode(null)} onSave={saveInvestigation} onResumeSaved={(item) => { void resume(item.path, item.filters, item.id); }} onResumeRecent={(item: RecentInvestigation) => { void resume(item.path, item.filters); }} onDelete={deleteSaved} />}
      {providerStatusOpen && <AIProviderStatus configuration={aiConfiguration} executionStatus={aiRuntime.executionStatus} onClose={() => setProviderStatusOpen(false)} />}
      <AppFooter />
    </div>
  );
}
