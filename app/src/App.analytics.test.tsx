import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import type { AnalyticalEvidenceAdapter, AnalyticalEvidenceResponse } from './data/maximoAdapter';
import { MOCK_SECURITY_CONTEXT } from './data/maximoAdapter';
import { mockMaximoAdapter } from './data/mockMaximoAdapter';
import { createLocalInvestigationPersistence } from './model/investigationPersistence';

afterEach(cleanup);
const scope = MOCK_SECURITY_CONTEXT;
const panel = () => screen.getByRole('complementary', { name: 'Selected node details' });
const choose = async (dimension: string) => fireEvent.click(await screen.findByRole('button', { name: dimension }));
const select = async (label: string) => fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^Select ${label}, [\\d,]+ Work Orders$`) }));

test('only the active inspected or committed context is analyzed; Explore does not duplicate unchanged context', async () => {
  const adapter: AnalyticalEvidenceAdapter = {
    ...mockMaximoAdapter,
    analyticalEvidence: vi.fn((request) => mockMaximoAdapter.analyticalEvidence(request)),
  };
  render(<App adapter={adapter} />);
  await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' });
  expect(adapter.analyticalEvidence).not.toHaveBeenCalled();
  await choose('Site');
  expect(adapter.analyticalEvidence).not.toHaveBeenCalled();
  await select('SITE-A');
  expect(await within(panel()).findByText('29 of 225 approvals')).toBeTruthy();
  expect(adapter.analyticalEvidence).toHaveBeenCalledWith({ path: [{ dimension: 'Site', value: 'SITE-A' }], securityScope: scope });
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(within(panel()).getByText('PROSPECTIVE PATH')).toBeTruthy();
  const calls = vi.mocked(adapter.analyticalEvidence).mock.calls.length;
  fireEvent.click(within(panel()).getByRole('button', { name: 'Explore SITE-A' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toContain('Site: SITE-A');
  expect(vi.mocked(adapter.analyticalEvidence).mock.calls).toHaveLength(calls);
  await choose('Status');
  await select('WAPPR');
  await waitFor(() => expect(adapter.analyticalEvidence).toHaveBeenCalledWith({
    path: [{ dimension: 'Site', value: 'SITE-A' }, { dimension: 'Status', value: 'WAPPR' }], securityScope: scope,
  }));
  expect(within(panel()).getByText('PROSPECTIVE PATH')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).not.toContain('WAPPR');
  expect(within(panel()).getByRole('heading', { name: 'Questions to Investigate' })).toBeTruthy();
  expect(within(panel()).getByText(/Are the same assets repeatedly generating WAPPR Work Orders at SITE-A/)).toBeTruthy();
});

test('switching siblings prevents an older response from replacing the newer context', async () => {
  let resolveSiteA!: (response: AnalyticalEvidenceResponse) => void;
  const siteA = new Promise<AnalyticalEvidenceResponse>((resolve) => { resolveSiteA = resolve; });
  const adapter: AnalyticalEvidenceAdapter = {
    ...mockMaximoAdapter,
    analyticalEvidence: vi.fn((request) => request.path[0]?.value === 'SITE-A'
      ? siteA : mockMaximoAdapter.analyticalEvidence(request)),
  };
  render(<App adapter={adapter} />);
  await choose('Site');
  await select('SITE-A');
  expect(within(panel()).getByRole('status').textContent).toContain('Checking this context');
  expect(within(panel()).getByRole('button', { name: 'Open Records' }).hasAttribute('disabled')).toBe(false);
  await select('SITE-B');
  expect(await within(panel()).findByText('No qualifying operational findings for this context.')).toBeTruthy();
  await act(async () => { resolveSiteA(await mockMaximoAdapter.analyticalEvidence({ path: [{ dimension: 'Site', value: 'SITE-A' }], securityScope: scope })); });
  expect(within(panel()).getByRole('heading', { name: 'SITE-B' })).toBeTruthy();
  expect(within(panel()).queryByText('29 of 225 approvals')).toBeNull();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
});

test('analysis failure stays local; Retry uses the current path while exploration and records remain available', async () => {
  let rejectFirst!: (reason: Error) => void;
  const pending = new Promise<AnalyticalEvidenceResponse>((_resolve, reject) => { rejectFirst = reject; });
  const adapter: AnalyticalEvidenceAdapter = {
    ...mockMaximoAdapter,
    analyticalEvidence: vi.fn().mockImplementationOnce(() => pending)
      .mockImplementation((request) => mockMaximoAdapter.analyticalEvidence(request)),
  };
  render(<App adapter={adapter} />);
  await choose('Site');
  await select('SITE-A');
  expect(within(panel()).getByRole('status').textContent).toContain('Checking this context');
  expect(within(panel()).getByRole('button', { name: 'Explore SITE-A' }).hasAttribute('disabled')).toBe(false);
  fireEvent.click(within(panel()).getByRole('button', { name: 'Open Records' }));
  expect(await screen.findByRole('dialog', { name: 'Work Orders' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await act(async () => { rejectFirst(new Error('internal adapter detail')); });
  expect(await within(panel()).findByRole('alert')).toHaveProperty('textContent', 'Operational findings are unavailable. Please retry.Retry operational findings');
  expect(panel().textContent).not.toContain('internal adapter detail');
  fireEvent.click(within(panel()).getByRole('button', { name: 'Retry operational findings' }));
  expect(await within(panel()).findByText('29 of 225 approvals')).toBeTruthy();
  expect(vi.mocked(adapter.analyticalEvidence).mock.calls.at(-1)?.[0].path).toEqual([{ dimension: 'Site', value: 'SITE-A' }]);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
});

test('resuming saved metadata re-runs analysis for the restored committed path', async () => {
  const entries = new Map<string, string>();
  const store = createLocalInvestigationPersistence({
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
  });
  store.save('SITE-A Review', [{ dimension: 'Site', value: 'SITE-A' }]);
  const adapter: AnalyticalEvidenceAdapter = {
    ...mockMaximoAdapter,
    analyticalEvidence: vi.fn((request) => mockMaximoAdapter.analyticalEvidence(request)),
  };
  render(<App adapter={adapter} persistence={store} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Saved & Recent' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Saved & Recent Investigations' })).getByRole('button', { name: 'Open' }));
  expect(await within(panel()).findByText('29 of 225 approvals')).toBeTruthy();
  expect(vi.mocked(adapter.analyticalEvidence).mock.calls).toHaveLength(1);
  fireEvent.click(within(panel()).getByRole('button', { name: 'Reset Investigation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved & Recent' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Saved & Recent Investigations' })).getByRole('button', { name: 'Open' }));
  await waitFor(() => expect(vi.mocked(adapter.analyticalEvidence).mock.calls).toHaveLength(2));
  expect(await within(panel()).findByText('29 of 225 approvals')).toBeTruthy();
  expect([...entries.values()].join(' ')).not.toMatch(/AX-ANA-|agedApprovalCount|analyticalEvidence/);
});

test('advanced findings follow prospective and committed contexts through the existing Node Intelligence flow', async () => {
  const adapter: AnalyticalEvidenceAdapter = {
    ...mockMaximoAdapter,
    analyticalEvidence: vi.fn((request) => mockMaximoAdapter.analyticalEvidence(request)),
  };
  render(<App adapter={adapter} />);
  await choose('Site');
  await select('SITE-F');
  expect(await within(panel()).findByText('9 of 16 high-priority unresolved')).toBeTruthy();
  expect(within(panel()).getByText('PROSPECTIVE PATH')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  fireEvent.click(within(panel()).getByRole('button', { name: 'Explore SITE-F' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toContain('Site: SITE-F');
  expect(within(panel()).getByText('9 of 16 high-priority unresolved')).toBeTruthy();

  fireEvent.click(within(panel()).getByRole('button', { name: 'Reset Investigation' }));
  await choose('Site');
  await select('SITE-E');
  expect(await within(panel()).findByText('13 of 145 reactive orders')).toBeTruthy();
  expect(within(panel()).getByText('Missing asset · 9.0%')).toBeTruthy();
  await select('SITE-D');
  expect(await within(panel()).findByText('30.5% concentrated')).toBeTruthy();
  expect(within(panel()).getByText('Top 3 assets · 73 of 239 reactive')).toBeTruthy();

  fireEvent.click(within(panel()).getByRole('button', { name: 'Reset Investigation' }));
  await choose('Asset');
  await select('A-PUMP-01');
  expect(await within(panel()).findByText('A-PUMP-01 · 3 periods / 180 days')).toBeTruthy();
  expect(within(panel()).getByRole('heading', { name: 'Questions to Investigate' })).toBeTruthy();
  expect(within(panel()).getByLabelText('YOUR QUESTION')).toBeTruthy();
  expect(vi.mocked(adapter.analyticalEvidence).mock.calls).toHaveLength(4);
});


