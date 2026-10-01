import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import type { AxeonAIConfiguration } from './ai/configuration';
import type { AnalyticalEvidenceAdapter } from './data/maximoAdapter';
import { mockMaximoAdapter } from './data/mockMaximoAdapter';
import { createLocalInvestigationPersistence } from './model/investigationPersistence';
import { AXEON_RELEASE } from './product/releaseMetadata';
import { readReportSnapshot } from './report/reportSnapshot';
import { parseReportRoute } from './report/reportWindow';
import { capturedReportLauncher, type CapturedReportWindow } from './test/reportWindowTestUtils';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const panel = () => screen.getByRole('complementary', { name: 'Selected node details' });
const choose = async (dimension: string) => fireEvent.click(await screen.findByRole('button', { name: dimension }));
const select = async (name: string) => fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^Select ${name}, [\\d,]+ Work Orders$`) }));
const openReport = () => fireEvent.click(within(panel()).getByRole('button', { name: 'Investigation Report' }));

async function reportFrom(target: CapturedReportWindow) {
  await waitFor(() => expect(target.navigations).toHaveLength(1));
  const route = parseReportRoute(new URL(target.navigations[0]!).hash);
  expect(route?.mode).toBe('ready');
  const snapshot = readReportSnapshot(target.sessionStorage, route!.reportId);
  expect(snapshot.status).toBe('ready');
  if (snapshot.status !== 'ready') throw new Error('Expected a ready report snapshot.');
  return snapshot.report;
}

test('root report opens a separate browser context and leaves the original investigation untouched', async () => {
  const launcher = capturedReportLauncher();
  render(<App adapter={mockMaximoAdapter} reportWindowLauncher={launcher} />);
  await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' });
  openReport();
  expect(launcher.targets).toHaveLength(1);
  expect(launcher.targets[0]!.openedUrl).toMatch(/#\/report\/preparing\/[0-9A-Za-z-]+$/);
  expect(launcher.targets[0]!.detached).toBe(true);
  expect(screen.queryByRole('dialog', { name: 'Operational Investigation Report' })).toBeNull();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  const report = await reportFrom(launcher.targets[0]!);
  expect(report.context.population).toBe(2_000);
  expect(report.context.pathLabels).toEqual(['Work Orders']);
  expect(report.release.version).toBe(AXEON_RELEASE.version);
  expect(launcher.targets[0]!.openedUrl).not.toContain('Work%20Orders');
});

test('prospective report transfers exact context without committing inspection or causing record/analytics reload', async () => {
  const launcher = capturedReportLauncher();
  const adapter: AnalyticalEvidenceAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: vi.fn((request) => mockMaximoAdapter.explore(request)),
    previewRecords: vi.fn((request) => mockMaximoAdapter.previewRecords(request)),
    exportRecords: vi.fn((request) => mockMaximoAdapter.exportRecords(request)),
    analyticalEvidence: vi.fn((request) => mockMaximoAdapter.analyticalEvidence(request)),
  };
  render(<App adapter={adapter} reportWindowLauncher={launcher} />);
  await choose('Site');
  await select('SITE-D');
  await within(panel()).findByText('30.5% concentrated');
  const analyticalCalls = vi.mocked(adapter.analyticalEvidence).mock.calls.length;
  openReport();
  const report = await reportFrom(launcher.targets[0]!);
  expect(report.context.path).toEqual([{ dimension: 'Site', value: 'SITE-D' }]);
  expect(report.context.pathLabels).toEqual(['Work Orders', 'Site: SITE-D']);
  expect(report.kpis).toContainEqual(expect.objectContaining({ id: 'reactive-share', displayValue: '85.4%' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(within(panel()).getByText('PROSPECTIVE PATH')).toBeTruthy();
  expect(within(panel()).getByRole('button', { name: 'Explore SITE-D' })).toBeTruthy();
  expect(adapter.previewRecords).not.toHaveBeenCalled();
  expect(adapter.exportRecords).not.toHaveBeenCalled();
  expect(vi.mocked(adapter.analyticalEvidence).mock.calls).toHaveLength(analyticalCalls);
});

test('committed multi-level context transfers while the source Investigation Spine remains intact', async () => {
  const launcher = capturedReportLauncher();
  render(<App adapter={mockMaximoAdapter} reportWindowLauncher={launcher} />);
  await choose('Site');
  await select('SITE-A');
  fireEvent.click(within(panel()).getByRole('button', { name: 'Explore SITE-A' }));
  await choose('Priority');
  await select('1');
  fireEvent.click(within(panel()).getByRole('button', { name: 'Explore 1' }));
  await waitFor(() => expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A → Priority: 1'));
  openReport();
  const report = await reportFrom(launcher.targets[0]!);
  expect(report.context.path).toEqual([
    { dimension: 'Site', value: 'SITE-A' },
    { dimension: 'Priority', value: '1' },
  ]);
  expect(report.context.pathLabels).toEqual(['Work Orders', 'Site: SITE-A', 'Priority: 1']);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A → Priority: 1');
});

test('active filters and exact-context AI response transfer while the original UI remains unchanged', async () => {
  const launcher = capturedReportLauncher();
  render(<App adapter={mockMaximoAdapter} reportWindowLauncher={launcher} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Filter' }));
  const filter = await screen.findByRole('dialog', { name: 'Filter Investigation' });
  fireEvent.click(await within(filter).findByRole('checkbox', { name: /^CM / }));
  fireEvent.click(await within(filter).findByRole('checkbox', { name: /^EM / }));
  fireEvent.click(within(filter).getByRole('button', { name: 'Apply Filters' }));
  await choose('Site');
  await select('SITE-D');
  await within(panel()).findByText('PROSPECTIVE PATH');
  const input = within(panel()).getByRole('textbox', { name: 'YOUR QUESTION' });
  fireEvent.change(input, { target: { value: 'Why should I investigate this?' } });
  fireEvent.click(within(panel()).getByRole('button', { name: 'Ask Axeon' }));
  await within(panel()).findByText(/GROUNDED IN CURRENT AXEON FINDINGS/);
  openReport();
  const report = await reportFrom(launcher.targets[0]!);
  expect(report.context.filters).toEqual([{ dimension: 'Work Type', values: ['CM', 'EM'] }]);
  expect(report.aiInterpretation?.question).toBe('Why should I investigate this?');
  expect(screen.getByRole('button', { name: 'Remove Work Type filter' })).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
}, 12_000);

test('multiple report requests use unique immutable snapshots that cannot overwrite one another', async () => {
  const launcher = capturedReportLauncher();
  render(<App adapter={mockMaximoAdapter} reportWindowLauncher={launcher} />);
  await choose('Site');
  await select('SITE-A');
  openReport();
  const reportA = await reportFrom(launcher.targets[0]!);
  const serializedA = JSON.stringify(reportA);
  await select('SITE-D');
  await waitFor(() => expect(within(panel()).getByRole('button', { name: 'Explore SITE-D' })).toBeTruthy());
  openReport();
  const reportB = await reportFrom(launcher.targets[1]!);
  const routeA = parseReportRoute(new URL(launcher.targets[0]!.navigations[0]!).hash)!;
  const routeB = parseReportRoute(new URL(launcher.targets[1]!.navigations[0]!).hash)!;
  expect(routeA.reportId).not.toBe(routeB.reportId);
  expect(reportA.context.nodeLabel).toBe('SITE-A');
  expect(reportB.context.nodeLabel).toBe('SITE-D');
  const rereadA = readReportSnapshot(launcher.targets[0]!.sessionStorage, routeA.reportId);
  expect(rereadA.status === 'ready' ? JSON.stringify(rereadA.report) : '').toBe(serializedA);
});

test('blocked popup fails safely and retry opens the report without changing investigation state', async () => {
  const launcher = capturedReportLauncher(true);
  render(<App adapter={mockMaximoAdapter} reportWindowLauncher={launcher} />);
  await choose('Site');
  await select('SITE-A');
  openReport();
  expect((await screen.findByRole('alert')).textContent).toContain('Investigation Report could not be opened');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(within(panel()).getByRole('button', { name: 'Explore SITE-A' })).toBeTruthy();
  launcher.blocked = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry Investigation Report' }));
  const report = await reportFrom(launcher.targets[0]!);
  expect(report.context.nodeLabel).toBe('SITE-A');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('opening a report does not create or alter Saved and Recent investigations', async () => {
  const launcher = capturedReportLauncher();
  const entries = new Map<string, string>();
  const persistence = createLocalInvestigationPersistence({ getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } });
  render(<App adapter={mockMaximoAdapter} persistence={persistence} reportWindowLauncher={launcher} />);
  await choose('Site');
  await select('SITE-A');
  const before = JSON.stringify([...entries]);
  openReport();
  await reportFrom(launcher.targets[0]!);
  expect(JSON.stringify([...entries])).toBe(before);
  expect(persistence.listSaved()).toEqual([]);
  expect(persistence.listRecent()).toEqual([]);
});

test.each([
  { enabled: false, selectedProviderId: 'mock' },
  { enabled: true, selectedProviderId: 'openai' },
] as readonly AxeonAIConfiguration[])('report remains available with AI configuration $selectedProviderId enabled=$enabled', async (aiConfiguration) => {
  const launcher = capturedReportLauncher();
  render(<App adapter={mockMaximoAdapter} aiConfiguration={aiConfiguration} reportWindowLauncher={launcher} />);
  await choose('Site');
  await select('SITE-D');
  await within(panel()).findByText('85.4% reactive');
  openReport();
  const report = await reportFrom(launcher.targets[0]!);
  expect(report.kpis).toContainEqual(expect.objectContaining({ displayValue: '85.4%' }));
  expect(report.aiInterpretation).toBeUndefined();
});
