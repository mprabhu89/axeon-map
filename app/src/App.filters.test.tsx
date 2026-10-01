import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import type { AxeonAIGateway } from './ai/contracts';
import type { AnalyticalEvidenceAdapter } from './data/maximoAdapter';
import { mockMaximoAdapter } from './data/mockMaximoAdapter';
import { createLocalInvestigationPersistence } from './model/investigationPersistence';
import { readReportSnapshot } from './report/reportSnapshot';
import { parseReportRoute } from './report/reportWindow';
import { capturedReportLauncher } from './test/reportWindowTestUtils';

afterEach(cleanup);

const wrappedAdapter = (): AnalyticalEvidenceAdapter => ({
  profile: mockMaximoAdapter.profile,
  explore: vi.fn((request) => mockMaximoAdapter.explore(request)),
  filterValues: vi.fn((request) => mockMaximoAdapter.filterValues!(request)),
  previewRecords: vi.fn((request) => mockMaximoAdapter.previewRecords(request)),
  exportRecords: vi.fn((request) => mockMaximoAdapter.exportRecords(request)),
  analyticalEvidence: vi.fn((request) => mockMaximoAdapter.analyticalEvidence(request)),
});

async function openFilters() {
  fireEvent.click(await screen.findByRole('button', { name: 'Filter' }));
  return screen.findByRole('dialog', { name: 'Filter Investigation' });
}

async function toggleFilter(value: string) {
  const dialog = await screen.findByRole('dialog', { name: 'Filter Investigation' });
  fireEvent.click(await within(dialog).findByRole('checkbox', { name: new RegExp(`^${value} `) }));
}

test('Filter dialog visibly renders Work Type with all adapter-discovered values in its primary group', async () => {
  const adapter = wrappedAdapter();
  render(<App adapter={adapter} />);
  const contextPanel = screen.getByRole('complementary', { name: 'Selected node details' });
  expect(within(contextPanel).queryByRole('button', { name: 'Work Type' })).toBeNull();
  const dialog = await openFilters();
  const workType = within(dialog).getByRole('group', { name: 'Work Type' });
  expect(workType.classList.contains('filter-group-featured')).toBe(true);
  expect(workType.closest('.filter-primary-group')).toBeTruthy();
  expect(within(workType).getByRole('checkbox', { name: 'CM 1,215' })).toBeTruthy();
  expect(within(workType).getByRole('checkbox', { name: 'PM 564' })).toBeTruthy();
  expect(within(workType).getByRole('checkbox', { name: 'EM 221' })).toBeTruthy();
  expect(vi.mocked(adapter.filterValues!)).toHaveBeenCalledWith(expect.objectContaining({ dimension: 'Work Type', maxValues: 50 }));
});

test('Filter dialog renders customer-specific Work Types returned by the adapter without assuming synthetic values', async () => {
  const adapter = wrappedAdapter();
  adapter.filterValues = vi.fn(async (request) => request.dimension === 'Work Type'
    ? { values: [{ value: 'CUSTOM-A', count: 7 }, { value: 'CUSTOM-B', count: 3 }], totalValues: 2 }
    : mockMaximoAdapter.filterValues!(request));
  render(<App adapter={adapter} />);
  const dialog = await openFilters();
  const workType = within(dialog).getByRole('group', { name: 'Work Type' });
  expect(within(workType).getByRole('checkbox', { name: 'CUSTOM-A 7' })).toBeTruthy();
  expect(within(workType).getByRole('checkbox', { name: 'CUSTOM-B 3' })).toBeTruthy();
  expect(within(workType).queryByRole('checkbox', { name: /^PM / })).toBeNull();
  expect(within(workType).queryByRole('checkbox', { name: /^CM / })).toBeNull();
  expect(within(workType).queryByRole('checkbox', { name: /^EM / })).toBeNull();
});

test('filter editing is staged and Apply, remove, Clear, Back, and Reset keep filters separate from the spine', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await openFilters();
  await toggleFilter('SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByLabelText('Active filters')).toBeNull();
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).toBeTruthy();

  await openFilters();
  await toggleFilter('SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 560 Work Orders' })).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(screen.getByRole('button', { name: 'Remove Site filter' }).textContent).toContain('Site: SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Remove Site filter' }));
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).toBeTruthy();

  await openFilters();
  await toggleFilter('CM');
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  expect(await screen.findByLabelText('Active filters')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Site' }));
  const filteredSite = await screen.findByRole('button', { name: /^Select SITE-A,/ });
  fireEvent.click(filteredSite);
  fireEvent.click(screen.getByRole('button', { name: 'Explore SITE-A' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('button', { name: 'Remove Work Type filter' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  expect(screen.queryByLabelText('Active filters')).toBeNull();

  await openFilters();
  await toggleFilter('EM');
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  await openFilters();
  fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
  expect(screen.queryByLabelText('Active filters')).toBeNull();
}, 20_000);

test('prospective path plus active filters reaches records, analytics, AI, and report without committing inspection', async () => {
  const adapter = wrappedAdapter();
  const reportLauncher = capturedReportLauncher();
  const ask = vi.fn<AxeonAIGateway['ask']>(async (request) => ({
    answer: `Filtered context has ${request.contextPack.context.workOrderPopulation} Work Orders.`, evidenceReferences: [], nextChecks: [], limitations: [],
    groundingStatus: 'limited-evidence', metadata: { providerId: 'test', mode: 'provider-adapter' },
  }));
  render(<App adapter={adapter} aiGateway={{ ask }} reportWindowLauncher={reportLauncher} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Site' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select SITE-A, 560 Work Orders' }));
  fireEvent.click(screen.getByRole('button', { name: 'Explore SITE-A' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Status' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Select WAPPR,/ }));

  await openFilters();
  await toggleFilter('CM');
  await toggleFilter('EM');
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  expect(await screen.findByText('PROSPECTIVE PATH')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Open Records' }));
  const preview = await screen.findByRole('dialog', { name: 'Work Orders' });
  expect(within(preview).getByText('Work Type: CM, EM')).toBeTruthy();
  expect(await within(preview).findByText('178 matching Work Orders')).toBeTruthy();
  await waitFor(() => expect(vi.mocked(adapter.previewRecords).mock.calls.at(-1)?.[0]).toMatchObject({
    path: [{ dimension: 'Site', value: 'SITE-A' }, { dimension: 'Status', value: 'WAPPR' }],
    filters: [{ dimension: 'Work Type', values: ['CM', 'EM'] }],
  }));
  fireEvent.click(within(preview).getByRole('button', { name: 'Close' }));

  const input = screen.getByRole('textbox', { name: 'YOUR QUESTION' });
  fireEvent.change(input, { target: { value: 'What should I investigate?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ask Axeon' }));
  await waitFor(() => expect(ask).toHaveBeenCalled());
  expect(ask.mock.calls[0]![0].contextPack.context.filters).toEqual([{ dimension: 'Work Type', values: ['CM', 'EM'] }]);
  expect(await screen.findByText(/Filtered context has/)).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Investigation Report' }));
  await waitFor(() => expect(reportLauncher.targets[0]?.navigations).toHaveLength(1));
  const reportRoute = parseReportRoute(new URL(reportLauncher.targets[0]!.navigations[0]!).hash)!;
  const reportSnapshot = readReportSnapshot(reportLauncher.targets[0]!.sessionStorage, reportRoute.reportId);
  expect(reportSnapshot.status).toBe('ready');
  if (reportSnapshot.status !== 'ready') throw new Error('Expected ready report snapshot.');
  expect(reportSnapshot.report.context.filters).toEqual([{ dimension: 'Work Type', values: ['CM', 'EM'] }]);
  expect(reportSnapshot.report.aiInterpretation?.answer).toMatch(/Filtered context has/);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  expect(vi.mocked(adapter.filterValues!).mock.calls.length).toBeGreaterThan(0);
  expect(vi.mocked(adapter.previewRecords).mock.calls.at(-1)?.[0].maxRecords).toBe(20);
  fireEvent.click(screen.getByRole('button', { name: 'Remove Work Type filter' }));
  await waitFor(() => expect(screen.queryByText(/Filtered context has/)).toBeNull());
}, 20_000);

test('saved and recent investigations preserve filters while legacy filterless saves still resume', async () => {
  const entries = new Map<string, string>();
  const persistence = createLocalInvestigationPersistence({ getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } });
  render(<App adapter={mockMaximoAdapter} persistence={persistence} />);
  await openFilters();
  await toggleFilter('SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Save Investigation' }));
  const saveDialog = screen.getByRole('dialog', { name: 'Save Investigation' });
  fireEvent.change(within(saveDialog).getByRole('textbox', { name: 'INVESTIGATION NAME' }), { target: { value: 'Filtered SITE-A' } });
  fireEvent.click(within(saveDialog).getByRole('button', { name: 'Save Investigation' }));
  expect(persistence.listSaved()[0]?.filters).toEqual([{ dimension: 'Site', values: ['SITE-A'] }]);
  expect(persistence.listRecent()[0]?.filters).toEqual([{ dimension: 'Site', values: ['SITE-A'] }]);
  fireEvent.click(screen.getByRole('button', { name: 'Close investigations' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved & Recent' }));
  const browse = screen.getByRole('dialog', { name: 'Saved & Recent Investigations' });
  fireEvent.click(within(browse).getAllByRole('button', { name: 'Open' })[0]!);
  expect(await screen.findByRole('button', { name: 'Remove Site filter' })).toBeTruthy();
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 560 Work Orders' })).toBeTruthy();
});
