import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { analyzeContext } from '../analytics/analyzeContext';
import type { AnalyticalFinding } from '../analytics/finding';
import { createMockMaximoAdapter } from '../data/mockMaximoAdapter';
import type { PathSegment } from '../model/exploration';
import { OperationalFindings } from './OperationalFindings';

afterEach(cleanup);
const adapter = createMockMaximoAdapter();

async function finding(path: readonly PathSegment[], lens: AnalyticalFinding['lens']): Promise<AnalyticalFinding> {
  const result = (await analyzeContext(adapter, path)).find((item) => item.lens === lens);
  expect(result).toBeDefined();
  return result!;
}

test('four lenses render calculated metrics, supplied severity, and concise rule context', async () => {
  const findings = await Promise.all([
    finding([{ dimension: 'Site', value: 'SITE-A' }], 'Backlog & Aging'),
    finding([{ dimension: 'Asset', value: 'A-PUMP-01' }], 'Repeat Work'),
    finding([{ dimension: 'Site', value: 'SITE-C' }], 'Process Bottleneck'),
    finding([{ dimension: 'Site', value: 'SITE-D' }], 'Work Mix'),
  ]);
  render(<OperationalFindings load={{ status: 'ready', findings }} onRetry={() => {}} />);
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(4);
  expect(within(rows[0]!).getByText('29 of 225 approvals')).toBeTruthy();
  expect(within(rows[0]!).getByText('Aged ≥ 90 days')).toBeTruthy();
  expect(within(rows[0]!).getByText('elevated')).toBeTruthy();
  expect(within(rows[1]!).getByText('15 reactive orders')).toBeTruthy();
  expect(within(rows[1]!).getByText('A-PUMP-01 · last 31 days')).toBeTruthy();
  expect(within(rows[2]!).getByText('9 of 13 scheduled PM orders')).toBeTruthy();
  expect(within(rows[2]!).getByText('In WSCH ≥ 75 days')).toBeTruthy();
  expect(within(rows[3]!).getByText('85.4% reactive')).toBeTruthy();
  expect(within(rows[3]!).getByText('Baseline 71.8% · +13.6 pts')).toBeTruthy();
  expect(within(rows[3]!).getByText('attention')).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/AI findings|SYN-WO-/);
});

test('native disclosure reveals structured rule and aggregate evidence without raw Work Orders', async () => {
  const mix = await finding([{ dimension: 'Site', value: 'SITE-D' }], 'Work Mix');
  render(<OperationalFindings load={{ status: 'ready', findings: [mix] }} onRetry={() => {}} />);
  fireEvent.click(screen.getByText('Evidence and rule'));
  const details = screen.getByText('Evidence and rule').closest('details');
  expect(details?.open).toBe(true);
  expect(within(details!).getByText('AX-ANA-MIX-001')).toBeTruthy();
  expect(within(details!).getByText('Reactive Share Difference threshold')).toBeTruthy();
  expect(within(details!).getByText('Reference date')).toBeTruthy();
  expect(within(details!).getByText('2026-09-01')).toBeTruthy();
  expect(details?.textContent).not.toContain('SYN-WO-');
});

test('empty findings use a limited neutral statement', () => {
  render(<OperationalFindings load={{ status: 'ready', findings: [] }} onRetry={() => {}} />);
  expect(screen.getByText('No qualifying operational findings for this context.')).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/everything looks good|no problems|healthy|safe|no risk/i);
});

test('advanced lenses use the same compact structured presentation and disclosure', async () => {
  const findings = await Promise.all([
    finding([{ dimension: 'Asset', value: 'A-PUMP-01' }], 'Reliability'),
    finding([{ dimension: 'Site', value: 'SITE-F' }], 'Risk'),
    finding([{ dimension: 'Site', value: 'SITE-E' }], 'Data Quality'),
    finding([{ dimension: 'Site', value: 'SITE-D' }], 'Optimization'),
  ]);
  render(<OperationalFindings load={{ status: 'ready', findings }} onRetry={() => {}} />);
  const rows = screen.getAllByRole('listitem');
  expect(within(rows[0]!).getByText('37 reactive orders')).toBeTruthy();
  expect(within(rows[0]!).getByText('A-PUMP-01 · 3 periods / 180 days')).toBeTruthy();
  expect(within(rows[1]!).getByText('9 of 16 high-priority unresolved')).toBeTruthy();
  expect(within(rows[1]!).getByText('Aged ≥ 60 days · overdue')).toBeTruthy();
  expect(within(rows[2]!).getByText('13 of 145 reactive orders')).toBeTruthy();
  expect(within(rows[2]!).getByText('Missing asset · 9.0%')).toBeTruthy();
  expect(within(rows[3]!).getByText('30.5% concentrated')).toBeTruthy();
  expect(within(rows[3]!).getByText('Top 3 assets · 73 of 239 reactive')).toBeTruthy();
  fireEvent.click(within(rows[1]!).getByText('Evidence and rule'));
  fireEvent.click(within(rows[2]!).getByText('Evidence and rule'));
  expect(within(rows[1]!).getByText('AX-ANA-RISK-001')).toBeTruthy();
  expect(within(rows[2]!).getByText('AX-ANA-DQ-001')).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/SYN-WO-|AI findings/);
});

test('finding volume is bounded initially and all findings remain available on request', async () => {
  const findings = await analyzeContext(adapter, [{ dimension: 'Site', value: 'SITE-A' }]);
  expect(findings.length).toBeGreaterThan(5);
  render(<OperationalFindings load={{ status: 'ready', findings }} onRetry={() => {}} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(5);
  expect(screen.getByText(`Showing 5 of ${findings.length} findings`)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'View all findings' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(findings.length);
  expect(screen.getByRole('button', { name: 'Show fewer findings' })).toBeTruthy();
});
