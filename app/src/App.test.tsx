import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { MOCK_SECURITY_CONTEXT, type MaximoAdapter } from './data/maximoAdapter';
import { mockMaximoAdapter } from './data/mockMaximoAdapter';
import { createLocalInvestigationPersistence } from './model/investigationPersistence';
import { downloadCsv } from './model/downloadCsv';

vi.mock('./model/downloadCsv', () => ({ downloadCsv: vi.fn() }));

afterEach(() => { cleanup(); vi.mocked(downloadCsv).mockClear(); });

async function choose(dimension: string) {
  fireEvent.click(await screen.findByRole('button', { name: dimension }));
}

async function select(label: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^Select ${label}, [\\d,]+ Work Orders$`) }));
}

function explore(label: string) {
  fireEvent.click(screen.getByRole('button', { name: `Explore ${label}` }));
}

function investigationStore() {
  const entries = new Map<string, string>();
  return createLocalInvestigationPersistence({
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
  });
}

test('renders the shell with a calculated Work Orders root', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  expect(screen.getByLabelText('Axeon Map')).toBeTruthy();
  expect(screen.getByText('Viewing: My permitted data')).toBeTruthy();
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).toBeTruthy();
});

test('adapter-provided labels are rendered as text rather than executable HTML', async () => {
  const hostileLabel = '<img src=x onerror=alert(1)>';
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: vi.fn(async (request) => request.nextDimension === 'Site'
      ? { totalCount: 1, groups: [{ value: hostileLabel, count: 1 }], totalGroups: 1 }
      : mockMaximoAdapter.explore(request)),
    previewRecords: (request) => mockMaximoAdapter.previewRecords(request),
    exportRecords: (request) => mockMaximoAdapter.exportRecords(request),
  };
  const { container } = render(<App adapter={adapter} />);
  await choose('Site');
  expect(await screen.findByText(hostileLabel)).toBeTruthy();
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('script')).toBeNull();
});

test('inspecting a candidate updates context without committing; Explore commits it', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  await select('SITE-A');
  const panel = screen.getByRole('complementary', { name: 'Selected node details' });
  expect(within(panel).getByRole('heading', { name: 'SITE-A' })).toBeTruthy();
  expect(within(panel).getByText('560 Work Orders')).toBeTruthy();
  expect(within(panel).getByLabelText('Work Orders to Site: SITE-A')).toBeTruthy();
  expect(within(panel).queryByRole('button', { name: 'Site' })).toBeNull();
  expect(within(panel).getByText('PROSPECTIVE PATH')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getAllByRole('button', { name: /^Select / })).toHaveLength(1);
  expect(within(panel).getByText('Are the same assets at SITE-A repeatedly generating Work Orders?')).toBeTruthy();
  expect(within(panel).getByRole('button', { name: 'Explore SITE-A' }).hasAttribute('disabled')).toBe(false);
  explore('SITE-A');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  expect(within(panel).queryByRole('button', { name: 'Explore SITE-A' })).toBeNull();
  expect(within(panel).getByText('CURRENT PATH')).toBeTruthy();
  await choose('Priority');
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getByRole('button', { name: 'Select SITE-A, 560 Work Orders' })).toBeTruthy();
  await select('1');
  expect(within(panel).getByLabelText('Work Orders to Site: SITE-A to Priority: 1')).toBeTruthy();
  expect(within(panel).queryByRole('button', { name: 'Priority' })).toBeNull();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
});

test('switching inspected siblings replaces selection without refetching or adding history', async () => {
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: vi.fn((request) => mockMaximoAdapter.explore(request)),
    previewRecords: (request) => mockMaximoAdapter.previewRecords(request),
    exportRecords: (request) => mockMaximoAdapter.exportRecords(request),
  };
  render(<App adapter={adapter} />);
  await choose('Site');
  await select('SITE-A');
  const callsAfterLoad = vi.mocked(adapter.explore).mock.calls.length;
  await select('SITE-B');
  const panel = screen.getByRole('complementary', { name: 'Selected node details' });
  expect(within(panel).getByRole('heading', { name: 'SITE-B' })).toBeTruthy();
  expect(within(panel).getByLabelText('Work Orders to Site: SITE-B')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Select SITE-A, 560 Work Orders' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getAllByRole('button', { name: /^Select / })).toHaveLength(1);
  expect(vi.mocked(adapter.explore).mock.calls.length).toBe(callsAfterLoad);
});

test('Back changes committed history only, and Reset clears temporary inspection', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  await select('SITE-A');
  explore('SITE-A');
  await choose('Priority');
  await select('1');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(await screen.findByRole('button', { name: 'Select SITE-A, 560 Work Orders' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Explore 1' })).toBeNull();
  await select('SITE-B');
  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(screen.queryByRole('button', { name: 'Explore SITE-B' })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Select SITE-B,/ })).toBeNull();
  expect((await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).getAttribute('aria-pressed')).toBe('true');
});

test('spine inspection does not rewrite the committed path; candidate and Explore are native buttons', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  const candidate = await screen.findByRole('button', { name: 'Select SITE-A, 560 Work Orders' });
  candidate.focus();
  expect(document.activeElement).toBe(candidate);
  fireEvent.click(candidate);
  const exploreButton = screen.getByRole('button', { name: 'Explore SITE-A' });
  exploreButton.focus();
  expect(document.activeElement).toBe(exploreButton);
  fireEvent.click(exploreButton);
  await choose('Priority');
  await select('1');
  const root = screen.getByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' });
  fireEvent.click(root);
  expect(screen.getByRole('complementary', { name: 'Selected node details' }).textContent).toContain('Work Orders');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  expect(screen.queryByRole('button', { name: 'Explore Work Orders' })).toBeNull();
});

test('full selected spine remains while only the active level fans out', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  await select('SITE-A');
  explore('SITE-A');
  await choose('Priority');
  await select('1');
  explore('1');
  await choose('Classification');
  const candidates = screen.getByRole('group', { name: 'Current candidate groups' });
  expect(await within(candidates).findByRole('button', { name: /^Select Electrical,/ })).toBeTruthy();
  const spine = screen.getByRole('group', { name: 'Investigation spine' });
  expect(within(spine).getByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).toBeTruthy();
  expect(within(spine).getByRole('button', { name: 'Select SITE-A, 560 Work Orders' })).toBeTruthy();
  expect(within(spine).getByRole('button', { name: /^Select 1, [\d,]+ Work Orders$/ })).toBeTruthy();
  expect(within(spine).getAllByRole('button', { name: /^Node Intelligence for / })).toHaveLength(3);
  expect(within(candidates).getByRole('button', { name: 'Node Intelligence for Electrical' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Select SITE-B,/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Select 2, [\d,]+ Work Orders$/ })).toBeNull();
});

test('Back returns one level and Reset returns to the root', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  await select('SITE-A');
  explore('SITE-A');
  await choose('Priority');
  await select('1');
  explore('1');
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  const spine = screen.getByRole('group', { name: 'Investigation spine' });
  expect(within(spine).getByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).toBeTruthy();
  expect(within(spine).getByRole('button', { name: 'Select SITE-A, 560 Work Orders' })).toBeTruthy();
  expect(within(spine).queryByRole('button', { name: /^Select 1,/ })).toBeNull();
  expect(await screen.findByRole('button', { name: /^Select 1, [\d,]+ Work Orders$/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(screen.queryByRole('button', { name: /^Select SITE-A/ })).toBeNull();
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' })).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getAllByRole('button', { name: /^Select / })).toHaveLength(1);
});

test('Back from an unselected expansion removes the deepest selected path level', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  await select('SITE-A');
  explore('SITE-A');
  await choose('Priority');
  expect(await screen.findByRole('button', { name: /^Select 1, [\d,]+ Work Orders$/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(await screen.findByRole('button', { name: 'Select SITE-A, 560 Work Orders' })).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getAllByRole('button', { name: /^Select / })).toHaveLength(1);
  expect(screen.queryByRole('button', { name: /^Select 1,/ })).toBeNull();
});

test('candidate fan remains limited to 16 groups', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Asset');
  const candidates = screen.getByRole('group', { name: 'Current candidate groups' });
  expect(await within(candidates).findAllByRole('button', { name: /^Select / })).toHaveLength(16);
  expect(screen.getByText(/more groups are hidden in this preview/)).toBeTruthy();
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getAllByRole('button', { name: /^Select / })).toHaveLength(1);
});

test('Node Intelligence controls remain accessible on generated nodes', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Status');
  expect(await screen.findByRole('button', { name: 'Node Intelligence for WAPPR' })).toBeTruthy();
  for (const name of ['Work Orders', 'WAPPR', 'INPRG', 'COMP', 'WSCH']) {
    expect(screen.getByRole('button', { name: `Node Intelligence for ${name}` })).toBeTruthy();
  }
  fireEvent.click(screen.getByRole('button', { name: 'Node Intelligence for WAPPR' }));
  expect(screen.getByLabelText('Work Orders to Status: WAPPR')).toBeTruthy();
});

test('lens-tagged investigation questions follow root, Site, Status to Priority, and Asset contexts', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  const panel = screen.getByRole('complementary', { name: 'Selected node details' });
  expect(await within(panel).findByText('Is high-priority work accumulating in a way that could increase operational exposure?')).toBeTruthy();
  expect(within(panel).getByText('Work Mix')).toBeTruthy();
  const input = within(panel).getByRole('textbox', { name: 'YOUR QUESTION' });
  expect(input.getAttribute('placeholder')).toBe('Ask your own question about this node...');
  expect(input.hasAttribute('disabled')).toBe(false);

  await choose('Site');
  await select('SITE-A');
  expect(within(panel).getByText('Are the same assets at SITE-A repeatedly generating Work Orders?')).toBeTruthy();
  explore('SITE-A');

  await choose('Status');
  await select('WAPPR');
  explore('WAPPR');
  await choose('Priority');
  await select('1');
  expect(within(panel).getByLabelText('Work Orders to Site: SITE-A to Status: WAPPR to Priority: 1')).toBeTruthy();
  expect(within(panel).getByText('Are any Priority 1 Work Orders at SITE-A aging unusually long in WAPPR?')).toBeTruthy();
  expect(within(panel).getByText('Process Bottleneck')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  await choose('Status');
  await select('WAPPR');
  explore('WAPPR');
  await choose('Priority');
  await select('1');
  expect(within(panel).getByText('Are Priority 1 Work Orders aging unusually long in WAPPR?')).toBeTruthy();
  expect(within(panel).queryByText(/at this site/i)).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  await choose('Asset');
  const assetGroups = screen.getByRole('group', { name: 'Current candidate groups' });
  fireEvent.click((await within(assetGroups).findAllByRole('button', { name: /^Select / }))[0]!);
  expect(within(panel).getByText(/repeatedly generating Work Orders within this workload\?/)).toBeTruthy();
  expect(within(panel).getByText('Reliability')).toBeTruthy();
});

test('UI consumes aggregate DTOs without raw Work Orders', async () => {
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: async (request) => ({ totalCount: 9, groups: request.nextDimension ? [{ value: 'SITE-X', count: 9 }] : [], totalGroups: request.nextDimension ? 1 : 0 }),
    previewRecords: async () => ({ totalCount: 0, records: [] }),
    exportRecords: (request) => mockMaximoAdapter.exportRecords(request),
  };
  render(<App adapter={adapter} />);
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 9 Work Orders' })).toBeTruthy();
  await choose('Site');
  await select('SITE-X');
  expect(screen.getByLabelText('Work Orders to Site: SITE-X')).toBeTruthy();
  explore('SITE-X');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-X');
});

test('adapter failure produces a safe error state', async () => {
  let attempts = 0;
  const adapter: MaximoAdapter = { profile: mockMaximoAdapter.profile, explore: async () => {
    if (attempts++ === 0) throw new Error('secret internal failure');
    return { totalCount: 1, groups: [], totalGroups: 0 };
  }, previewRecords: async () => ({ totalCount: 0, records: [] }), exportRecords: (request) => mockMaximoAdapter.exportRecords(request) };
  render(<App adapter={adapter} />);
  expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
  expect(screen.queryByText(/secret internal failure/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('button', { name: 'Select Work Orders, 1 Work Orders' })).toBeTruthy();
});

test('Open Records at root shows 20 of 2,000 and leaves aggregate state untouched', async () => {
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: vi.fn((request) => mockMaximoAdapter.explore(request)),
    previewRecords: vi.fn((request) => mockMaximoAdapter.previewRecords(request)),
    exportRecords: vi.fn((request) => mockMaximoAdapter.exportRecords(request)),
  };
  render(<App adapter={adapter} />);
  const open = await screen.findByRole('button', { name: 'Open Records' });
  const aggregateCalls = vi.mocked(adapter.explore).mock.calls.length;
  fireEvent.click(open);
  const dialog = screen.getByRole('dialog', { name: 'Work Orders' });
  const close = within(dialog).getByRole('button', { name: 'Close' });
  expect(close.tagName).toBe('BUTTON');
  expect(close.getAttribute('type')).toBe('button');
  expect(close.getAttribute('title')).toBe('Close');
  expect(close.classList.contains('preview-close')).toBe(true);
  await waitFor(() => expect(document.activeElement).toBe(close));
  expect(within(dialog).getByText('Work Orders', { selector: '.preview-path p' })).toBeTruthy();
  expect(await within(dialog).findByText('Showing 1–20 of 2,000')).toBeTruthy();
  expect(within(dialog).getByText('2,000 matching Work Orders')).toBeTruthy();
  expect(within(dialog).getAllByRole('row')).toHaveLength(21);
  expect(within(dialog).getByText('Page 1 of 100')).toBeTruthy();
  expect(within(dialog).getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(true);
  expect(vi.mocked(adapter.previewRecords).mock.calls[0]?.[0]).toEqual({
    path: [], maxRecords: 20, offset: 0, securityScope: MOCK_SECURITY_CONTEXT,
  });
  expect(vi.mocked(adapter.exportRecords)).not.toHaveBeenCalled();
  expect(vi.mocked(downloadCsv)).not.toHaveBeenCalled();
  expect(vi.mocked(adapter.explore).mock.calls.length).toBe(aggregateCalls);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  await waitFor(() => expect(document.activeElement).toBe(open));
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
});

test('SITE-A pages use bounded offsets without changing inspection, spine, or aggregates', async () => {
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: vi.fn((request) => mockMaximoAdapter.explore(request)),
    previewRecords: vi.fn((request) => mockMaximoAdapter.previewRecords(request)),
    exportRecords: (request) => mockMaximoAdapter.exportRecords(request),
  };
  render(<App adapter={adapter} />);
  await choose('Site');
  await select('SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Open Records' }));
  const dialog = screen.getByRole('dialog', { name: 'Work Orders' });
  expect(await within(dialog).findByText('Showing 1–20 of 560')).toBeTruthy();
  expect(within(dialog).getByText('Page 1 of 28')).toBeTruthy();
  expect(within(dialog).getByRole('button', { name: 'Previous' }).hasAttribute('disabled')).toBe(true);
  const aggregateCalls = vi.mocked(adapter.explore).mock.calls.length;
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  expect(await within(dialog).findByText('Showing 21–40 of 560')).toBeTruthy();
  expect(within(dialog).getByText('Page 2 of 28')).toBeTruthy();
  expect(vi.mocked(adapter.previewRecords).mock.calls.at(-1)?.[0].offset).toBe(20);
  expect(vi.mocked(adapter.explore).mock.calls.length).toBe(aggregateCalls);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(screen.getByRole('button', { name: 'Explore SITE-A' })).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Previous' }));
  expect(await within(dialog).findByText('Showing 1–20 of 560')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  await select('SITE-B');
  fireEvent.click(screen.getByRole('button', { name: 'Open Records' }));
  const second = screen.getByRole('dialog', { name: 'Work Orders' });
  expect(await within(second).findByText('Showing 1–20 of 430')).toBeTruthy();
  expect(within(second).getByText('Page 1 of 22')).toBeTruthy();
});

test('final page displays remaining records and disables Next', async () => {
  const records = Array.from({ length: 33 }, (_, index) => ({
    id: `WO-${index + 1}`, site: 'SITE-X', status: 'WAPPR', priority: 1,
    classification: 'Electrical', location: 'X-PLANT', asset: 'X-PUMP',
  }));
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: (request) => mockMaximoAdapter.explore(request),
    previewRecords: async ({ offset, maxRecords }) => ({ totalCount: 33, records: records.slice(offset, offset + maxRecords) }),
    exportRecords: (request) => mockMaximoAdapter.exportRecords(request),
  };
  render(<App adapter={adapter} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open Records' }));
  const dialog = screen.getByRole('dialog', { name: 'Work Orders' });
  expect(await within(dialog).findByText('Showing 1–20 of 33')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
  expect(await within(dialog).findByText('Showing 21–33 of 33')).toBeTruthy();
  expect(within(dialog).getByText('Page 2 of 2')).toBeTruthy();
  expect(within(dialog).getByRole('button', { name: 'Next' }).hasAttribute('disabled')).toBe(true);
  expect(within(dialog).getAllByRole('row')).toHaveLength(14);
});

test('download icon is explicit and exports the prospective SITE-A context', async () => {
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: (request) => mockMaximoAdapter.explore(request),
    previewRecords: (request) => mockMaximoAdapter.previewRecords(request),
    exportRecords: vi.fn((request) => mockMaximoAdapter.exportRecords(request)),
  };
  render(<App adapter={adapter} />);
  await choose('Site');
  await select('SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Open Records' }));
  const dialog = screen.getByRole('dialog', { name: 'Work Orders' });
  expect(await within(dialog).findByText('Showing 1–20 of 560')).toBeTruthy();
  expect(vi.mocked(adapter.exportRecords)).not.toHaveBeenCalled();
  const downloadButton = within(dialog).getByRole('button', { name: 'Download spreadsheet' });
  expect(downloadButton.querySelector('svg')).not.toBeNull();
  expect(downloadButton.getAttribute('title')).toBe('Download spreadsheet');
  fireEvent.click(downloadButton);
  await waitFor(() => expect(vi.mocked(downloadCsv)).toHaveBeenCalledTimes(1));
  expect(vi.mocked(adapter.exportRecords).mock.calls[0]?.[0]).toEqual({
    path: [{ dimension: 'Site', value: 'SITE-A' }], securityScope: MOCK_SECURITY_CONTEXT,
  });
  const exported = vi.mocked(downloadCsv).mock.calls[0]?.[0];
  expect(exported?.recordCount).toBe(560);
  expect(exported?.fileName).toBe('axeon-work-orders-site-site-a.csv');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(screen.getByRole('button', { name: 'Explore SITE-A' })).toBeTruthy();
});

test('Open Records on an inspected Site uses prospective context and preserves inspection', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  await select('SITE-A');
  fireEvent.click(screen.getByRole('button', { name: 'Open Records' }));
  const dialog = screen.getByRole('dialog', { name: 'Work Orders' });
  expect(await within(dialog).findByText('Showing 1–20 of 560')).toBeTruthy();
  expect(within(dialog).getByText('Work Orders → Site: SITE-A')).toBeTruthy();
  for (const row of within(dialog).getAllByRole('row').slice(1)) {
    expect(within(row).getAllByRole('cell')[1]?.textContent).toBe('SITE-A');
  }
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('button', { name: 'Explore SITE-A' })).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
});

test('Open Records on committed Site and inspected Status uses their combined path', async () => {
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: (request) => mockMaximoAdapter.explore(request),
    previewRecords: vi.fn((request) => mockMaximoAdapter.previewRecords(request)),
    exportRecords: (request) => mockMaximoAdapter.exportRecords(request),
  };
  render(<App adapter={adapter} />);
  await choose('Site');
  await select('SITE-A');
  explore('SITE-A');
  await choose('Status');
  await select('WAPPR');
  fireEvent.click(screen.getByRole('button', { name: 'Open Records' }));
  const dialog = screen.getByRole('dialog', { name: 'Work Orders' });
  expect(within(dialog).getByText('Work Orders → Site: SITE-A → Status: WAPPR')).toBeTruthy();
  expect((await within(dialog).findByText(/^Showing \d+–\d+ of \d+$/)).textContent).toMatch(/^Showing \d+–\d+ of \d+$/);
  expect(vi.mocked(adapter.previewRecords).mock.calls[0]?.[0].path).toEqual([
    { dimension: 'Site', value: 'SITE-A' }, { dimension: 'Status', value: 'WAPPR' },
  ]);
  for (const row of within(dialog).getAllByRole('row').slice(1)) {
    const cells = within(row).getAllByRole('cell');
    expect(cells[1]?.textContent).toBe('SITE-A');
    expect(cells[2]?.textContent).toBe('WAPPR');
  }
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  expect(screen.getByRole('button', { name: 'Explore WAPPR' })).toBeTruthy();
});

test('record preview shows loading, safe error, Retry, and neutral missing-field values', async () => {
  let attempts = 0;
  const adapter: MaximoAdapter = {
    profile: mockMaximoAdapter.profile,
    explore: (request) => mockMaximoAdapter.explore(request),
    exportRecords: (request) => mockMaximoAdapter.exportRecords(request),
    previewRecords: async () => {
      if (attempts++ === 0) throw new Error('private adapter detail');
      return { totalCount: 1, records: [{
        id: 'SYN-WO-TEST', site: null, status: 'WAPPR', priority: null,
        classification: null, location: null, asset: null,
      }] };
    },
  };
  render(<App adapter={adapter} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Open Records' }));
  const dialog = screen.getByRole('dialog', { name: 'Work Orders' });
  expect(within(dialog).getByRole('status').textContent).toContain('Loading record preview');
  expect(await within(dialog).findByRole('alert')).toBeTruthy();
  expect(within(dialog).queryByText(/private adapter detail/)).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Retry record preview' }));
  expect(await within(dialog).findByText('Showing 1–1 of 1')).toBeTruthy();
  const row = within(dialog).getAllByRole('row')[1]!;
  expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
    'SYN-WO-TEST', '—', 'WAPPR', '—', '—', '—', '—',
  ]);
});

test('root cannot be saved; a named multi-level committed spine saves and resumes', async () => {
  const store = investigationStore();
  render(<App adapter={mockMaximoAdapter} persistence={store} />);
  expect(screen.queryByRole('button', { name: 'Save Investigation' })).toBeNull();
  await choose('Site');
  await select('SITE-A');
  explore('SITE-A');
  await choose('Status');
  await select('WAPPR');
  explore('WAPPR');
  fireEvent.click(screen.getByRole('button', { name: 'Save Investigation' }));
  const saveDialog = screen.getByRole('dialog', { name: 'Save Investigation' });
  const input = within(saveDialog).getByRole('textbox', { name: 'INVESTIGATION NAME' });
  expect((input as HTMLInputElement).value).toBe('SITE-A / WAPPR');
  fireEvent.change(input, { target: { value: '   ' } });
  fireEvent.click(within(saveDialog).getByRole('button', { name: 'Save Investigation' }));
  expect(within(saveDialog).getByRole('alert').textContent).toBe('Enter an investigation name.');
  expect(store.listSaved()).toHaveLength(0);
  fireEvent.change(input, { target: { value: '  SITE-A WAPPR Review  ' } });
  fireEvent.click(within(saveDialog).getByRole('button', { name: 'Save Investigation' }));
  expect(store.listSaved()[0]?.name).toBe('SITE-A WAPPR Review');
  fireEvent.click(screen.getByRole('button', { name: 'Close investigations' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved & Recent' }));
  const browse = screen.getByRole('dialog', { name: 'Saved & Recent Investigations' });
  expect(within(browse).getByText('SITE-A WAPPR Review')).toBeTruthy();
  fireEvent.click(within(browse).getByRole('button', { name: 'Open' }));
  await waitFor(() => expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent)
    .toBe('Work Orders → Site: SITE-A → Status: WAPPR'));
  const spine = screen.getByRole('group', { name: 'Investigation spine' });
  expect(within(spine).getByRole('button', { name: /^Select SITE-A,/ })).toBeTruthy();
  expect(within(spine).getByRole('button', { name: /^Select WAPPR,/ })).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('saving while a candidate is inspected excludes it and resume clears preview/inspection', async () => {
  const store = investigationStore();
  render(<App adapter={mockMaximoAdapter} persistence={store} />);
  await choose('Site');
  await select('SITE-A');
  explore('SITE-A');
  await choose('Status');
  await select('WAPPR');
  fireEvent.click(screen.getByRole('button', { name: 'Open Records' }));
  expect(await within(screen.getByRole('dialog', { name: 'Work Orders' })).findByText(/^Showing \d+–\d+ of \d+$/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Investigation' }));
  const dialog = screen.getByRole('dialog', { name: 'Save Investigation' });
  expect(within(dialog).getByText('Saving committed path: Work Orders → Site: SITE-A')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save Investigation' }));
  expect(store.listSaved()[0]?.path).toEqual([{ dimension: 'Site', value: 'SITE-A' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Close investigations' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved & Recent' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Saved & Recent Investigations' })).getByRole('button', { name: 'Open' }));
  await waitFor(() => expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Explore WAPPR' })).toBeNull();
  expect(screen.getByRole('complementary', { name: 'Selected node details' }).textContent).toContain('SITE-A');
});

test('recent path resumes, and deleting a saved path requires a second explicit action', async () => {
  const store = investigationStore();
  const path = [{ dimension: 'Site', value: 'SITE-A' }] as const;
  store.recordRecent(path);
  const saved = store.save('Site review', path);
  render(<App adapter={mockMaximoAdapter} persistence={store} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Saved & Recent' }));
  const dialog = screen.getByRole('dialog', { name: 'Saved & Recent Investigations' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete Site review' }));
  expect(store.listSaved()).toHaveLength(1);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete Site review' }));
  expect(store.listSaved()).toHaveLength(0);
  expect(saved.id).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Resume' }));
  await waitFor(() => expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A'));
  expect(store.listRecent()).toHaveLength(1);
});

test('unrestorable saved path reports a generic error without changing the investigation', async () => {
  const store = investigationStore();
  store.save('Old site', [{ dimension: 'Site', value: 'SITE-Z' }]);
  render(<App adapter={mockMaximoAdapter} persistence={store} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Saved & Recent' }));
  const dialog = screen.getByRole('dialog', { name: 'Saved & Recent Investigations' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Open' }));
  expect(await within(dialog).findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getAllByRole('button', { name: /^Select / })).toHaveLength(1);
  expect(store.listSaved()).toHaveLength(1);
});

test('a later invalid saved segment cannot partially replace an existing committed spine', async () => {
  const store = investigationStore();
  store.save('Stale status', [
    { dimension: 'Site', value: 'SITE-A' },
    { dimension: 'Status', value: 'MISSING' },
  ]);
  render(<App adapter={mockMaximoAdapter} persistence={store} />);
  await choose('Site');
  await select('SITE-B');
  explore('SITE-B');
  fireEvent.click(screen.getByRole('button', { name: 'Saved & Recent' }));
  const dialog = screen.getByRole('dialog', { name: 'Saved & Recent Investigations' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Open' }));
  expect(await within(dialog).findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-B');
  expect(within(screen.getByRole('group', { name: 'Investigation spine' })).getByRole('button', { name: /^Select SITE-B,/ })).toBeTruthy();
});



