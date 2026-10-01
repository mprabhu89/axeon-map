export type ReportRouteMode = 'preparing' | 'ready' | 'error';

export interface ReportWindowTarget {
  readonly closed: boolean;
  readonly sessionStorage: Storage;
  navigate(url: string): void;
  detachOpener(): void;
}

export interface ReportWindowLauncher {
  currentUrl(): string;
  open(url: string): ReportWindowTarget | null;
}

export const browserReportWindowLauncher: ReportWindowLauncher = {
  currentUrl: () => window.location.href,
  open(url) {
    const opened = window.open(url, '_blank');
    if (!opened) return null;
    return {
      get closed() { return opened.closed; },
      get sessionStorage() { return opened.sessionStorage; },
      navigate: (nextUrl) => opened.location.replace(nextUrl),
      detachOpener: () => { try { opened.opener = null; } catch { /* same-origin report remains usable */ } },
    };
  },
};

export function reportWindowUrl(currentUrl: string, mode: ReportRouteMode, reportId: string): string {
  const url = new URL(currentUrl);
  url.search = '';
  url.hash = `/report/${mode}/${encodeURIComponent(reportId)}`;
  return url.toString();
}

export function parseReportRoute(hash: string): { mode: ReportRouteMode; reportId: string } | null {
  const match = /^#?\/report\/(preparing|ready|error)\/([0-9A-Za-z-]{8,80})$/.exec(hash);
  return match ? { mode: match[1] as ReportRouteMode, reportId: match[2]! } : null;
}
