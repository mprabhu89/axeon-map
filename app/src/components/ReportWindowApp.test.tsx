import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AXEON_RELEASE } from '../product/releaseMetadata';
import type { InvestigationReport } from '../report/contracts';
import { writeReportSnapshot } from '../report/reportSnapshot';
import { memoryStorage } from '../test/reportWindowTestUtils';
import { ReportWindowApp, type ReportWindowEnvironment } from './ReportWindowApp';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const report: InvestigationReport = {
  schemaVersion: 1,
  release: AXEON_RELEASE,
  title: 'Operational Investigation Report',
  context: { path: [{ dimension: 'Site', value: 'SITE-A' }], pathLabels: ['Work Orders', 'Site: SITE-A'], nodeType: 'Site', nodeLabel: 'SITE-A', population: 560, filters: [] },
  securityScope: { kind: 'current-user', enforcement: 'development-marker', source: 'mock-adapter', label: 'Current permitted data' },
  generatedAt: '2026-09-20T10:00:00.000Z',
  referenceTime: null,
  provenance: { mode: 'synthetic-local', label: 'Synthetic local evidence', authorizedRealMaximoData: false },
  kpis: [{ id: 'total', label: 'Total Work Orders', value: 560, displayValue: '560', detail: 'Exact population' }],
  charts: [], findings: [], suggestedNextAreas: [], limitations: ['Synthetic local evidence only.'],
};

function environment(hash: string, storage = memoryStorage(), closes = true) {
  let closed = false;
  const listeners = new Set<() => void>();
  const print = vi.fn();
  const close = vi.fn(() => { if (closes) closed = true; });
  const result: ReportWindowEnvironment & { print: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> } = {
    location: { hash },
    sessionStorage: storage,
    get closed() { return closed; },
    close, print,
    addEventListener: (_type, listener) => { listeners.add(listener); },
    removeEventListener: (_type, listener) => { listeners.delete(listener); },
  };
  return result;
}

test('report-only surface restores a validated snapshot and retains print/version behavior', () => {
  const storage = memoryStorage();
  writeReportSnapshot(storage, 'report-A123', report, Date.now());
  const env = environment('#/report/ready/report-A123', storage);
  render(<ReportWindowApp environment={env} />);
  expect(screen.getByRole('dialog', { name: 'Operational Investigation Report' })).toBeTruthy();
  expect(screen.getByText('Work Orders → Site: SITE-A')).toBeTruthy();
  expect(screen.getByText(`Version ${AXEON_RELEASE.version} · Operational Investigation Report · Read-only`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Print / Save PDF' }));
  expect(env.print).toHaveBeenCalledTimes(1);
});

test('report Close attempts window close and gives a graceful fallback when closure is denied', async () => {
  const storage = memoryStorage();
  writeReportSnapshot(storage, 'report-A123', report, Date.now());
  const env = environment('#/report/ready/report-A123', storage, false);
  render(<ReportWindowApp environment={env} />);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(env.close).toHaveBeenCalledTimes(1);
  expect((await screen.findByRole('status')).textContent).toContain('You can close this report tab and return to Axeon Map.');
});

test.each([
  '#/report/ready/missing-123',
  '#/report/ready/invalid',
  '#/report/error/report-A123',
])('missing or invalid report context fails closed for route %s', (hash) => {
  render(<ReportWindowApp environment={environment(hash)} />);
  expect(screen.getByRole('alert').textContent).toContain('Investigation Report unavailable');
  expect(screen.queryByText('Work Orders → Site: SITE-A')).toBeNull();
});

test('preparing route shows a lightweight accessible loading state', () => {
  render(<ReportWindowApp environment={environment('#/report/preparing/report-A123')} />);
  expect(screen.getByRole('status').textContent).toContain('Preparing Investigation Report');
});

test('Escape uses report Close behavior', async () => {
  const storage = memoryStorage();
  writeReportSnapshot(storage, 'report-A123', report, Date.now());
  const env = environment('#/report/ready/report-A123', storage);
  render(<ReportWindowApp environment={env} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(env.close).toHaveBeenCalledTimes(1));
});
