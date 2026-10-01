import { useEffect, useMemo, useState } from 'react';
import type { InvestigationReportLoad } from '../model/useInvestigationReport';
import { readReportSnapshot } from '../report/reportSnapshot';
import { parseReportRoute } from '../report/reportWindow';
import { InvestigationReport } from './InvestigationReport';

export interface ReportWindowEnvironment {
  readonly location: Pick<Location, 'hash'>;
  readonly sessionStorage: Storage;
  readonly closed: boolean;
  close(): void;
  print(): void;
  addEventListener(type: 'hashchange', listener: () => void): void;
  removeEventListener(type: 'hashchange', listener: () => void): void;
}

function loadFromEnvironment(environment: ReportWindowEnvironment): InvestigationReportLoad {
  const route = parseReportRoute(environment.location.hash);
  if (!route || route.mode === 'error') return { status: 'error' };
  if (route.mode === 'preparing') return { status: 'loading' };
  const snapshot = readReportSnapshot(environment.sessionStorage, route.reportId);
  return snapshot.status === 'ready' ? { status: 'ready', report: snapshot.report } : { status: 'error' };
}

export function ReportWindowApp({ environment = window }: { environment?: ReportWindowEnvironment }) {
  const [revision, setRevision] = useState(0);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const load = useMemo(() => loadFromEnvironment(environment), [environment, revision]);
  useEffect(() => {
    const changed = () => setRevision((value) => value + 1);
    environment.addEventListener('hashchange', changed);
    return () => environment.removeEventListener('hashchange', changed);
  }, [environment]);

  const close = () => {
    environment.close();
    globalThis.setTimeout(() => {
      if (!environment.closed) setCloseMessage('You can close this report tab and return to Axeon Map.');
    }, 0);
  };

  return <InvestigationReport load={load} onClose={close} onRetry={() => setRevision((value) => value + 1)}
    onPrint={() => environment.print()} closeMessage={closeMessage} />;
}
