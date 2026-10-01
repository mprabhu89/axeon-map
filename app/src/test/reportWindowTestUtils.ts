import type { ReportWindowLauncher, ReportWindowTarget } from '../report/reportWindow';

export function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

export interface CapturedReportWindow extends ReportWindowTarget {
  readonly openedUrl: string;
  readonly navigations: string[];
  readonly detached: boolean;
}

export function capturedReportLauncher(blocked = false): ReportWindowLauncher & { readonly targets: CapturedReportWindow[]; blocked: boolean } {
  const targets: CapturedReportWindow[] = [];
  return {
    targets,
    blocked,
    currentUrl: () => 'http://axeon.test/',
    open(url) {
      if (this.blocked) return null;
      const navigations: string[] = [];
      let detached = false;
      const target: CapturedReportWindow = {
        openedUrl: url,
        closed: false,
        sessionStorage: memoryStorage(),
        navigations,
        get detached() { return detached; },
        navigate: (nextUrl) => { navigations.push(nextUrl); },
        detachOpener: () => { detached = true; },
      };
      targets.push(target);
      return target;
    },
  };
}
