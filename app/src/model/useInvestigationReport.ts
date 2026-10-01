import { useRef, useState } from 'react';
import type { MaximoAdapter } from '../data/maximoAdapter';
import { buildInvestigationReport, type BuildInvestigationReportInput } from '../report/buildInvestigationReport';
import type { InvestigationReport } from '../report/contracts';
import { createReportId, writeReportSnapshot } from '../report/reportSnapshot';
import { browserReportWindowLauncher, reportWindowUrl, type ReportWindowLauncher } from '../report/reportWindow';
import { axeonLogger, createCorrelationId } from '../support/logger';

export type InvestigationReportLoad =
  | { status: 'closed' | 'loading' | 'error' }
  | { status: 'ready'; report: InvestigationReport };

export interface ReportLaunchError {
  message: string;
  reason: 'popup-blocked' | 'preparation-failed';
}

export function useInvestigationReport(adapter: MaximoAdapter, launcher: ReportWindowLauncher = browserReportWindowLauncher) {
  const [error, setError] = useState<ReportLaunchError | null>(null);
  const lastInput = useRef<BuildInvestigationReportInput | null>(null);

  const open = (input: BuildInvestigationReportInput) => {
    lastInput.current = input;
    const reportId = createReportId();
    const baseUrl = launcher.currentUrl();
    const target = launcher.open(reportWindowUrl(baseUrl, 'preparing', reportId));
    if (!target) {
      axeonLogger.warn({
        eventCode: 'AX-TECH-REPORT-OPEN-FAILED', component: 'report', operation: 'open-window', result: 'failed',
        correlationId: createCorrelationId(),
      });
      setError({ reason: 'popup-blocked', message: 'Investigation Report could not be opened. Please retry.' });
      return;
    }
    try { target.detachOpener(); } catch { /* opener isolation is best-effort for the already-created same-origin surface */ }
    setError(null);
    const navigateSafely = (mode: 'ready' | 'error') => {
      try { target.navigate(reportWindowUrl(baseUrl, mode, reportId)); } catch { /* the original investigation remains intact */ }
    };
    void buildInvestigationReport(adapter, input).then((report) => {
      if (target.closed) return;
      try {
        writeReportSnapshot(target.sessionStorage, reportId, report);
        navigateSafely('ready');
      } catch {
        axeonLogger.warn({
          eventCode: 'AX-TECH-REPORT-OPEN-FAILED', component: 'report', operation: 'prepare-snapshot', result: 'failed',
          correlationId: createCorrelationId(),
        });
        navigateSafely('error');
        setError({ reason: 'preparation-failed', message: 'Investigation Report could not be prepared. Please retry.' });
      }
    }).catch(() => {
      axeonLogger.warn({
        eventCode: 'AX-TECH-REPORT-OPEN-FAILED', component: 'report', operation: 'build-report', result: 'failed',
        correlationId: createCorrelationId(),
      });
      if (!target.closed) navigateSafely('error');
      setError({ reason: 'preparation-failed', message: 'Investigation Report could not be prepared. Please retry.' });
    });
  };

  return {
    error,
    open,
    retry: () => { if (lastInput.current) open(lastInput.current); },
    dismissError: () => setError(null),
  };
}
