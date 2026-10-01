import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import type { AxeonAIGateway, AxeonAIRequest, AxeonAIResponse } from './ai/contracts';
import { mockAxeonAIGateway } from './ai/mockProvider';
import { mockMaximoAdapter } from './data/mockMaximoAdapter';
import { createLocalInvestigationPersistence } from './model/investigationPersistence';

afterEach(cleanup);
const panel = () => screen.getByRole('complementary', { name: 'Selected node details' });
const choose = async (dimension: string) => fireEvent.click(await screen.findByRole('button', { name: dimension }));
const select = async (label: string) => fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^Select ${label}, [\\d,]+ Work Orders$`) }));
const askFreeForm = (question: string) => {
  const input = within(panel()).getByRole('textbox', { name: 'YOUR QUESTION' });
  fireEvent.change(input, { target: { value: question } });
  fireEvent.click(within(panel()).getByRole('button', { name: 'Ask Axeon' }));
};

test('suggested question is explicit and uses the inspected prospective context without committing it', async () => {
  const gateway: AxeonAIGateway = { ask: vi.fn((request) => mockAxeonAIGateway.ask(request)) };
  render(<App adapter={mockMaximoAdapter} aiGateway={gateway} />);
  await choose('Site');
  await select('SITE-D');
  expect(await within(panel()).findByText('30.5% concentrated')).toBeTruthy();
  expect(gateway.ask).not.toHaveBeenCalled();
  const question = within(panel()).getByRole('button', { name: /Ask Axeon:.*workload at SITE-D deserves supervisor attention first/i });
  fireEvent.click(question);
  expect(await within(panel()).findByText('GROUNDED IN CURRENT AXEON FINDINGS')).toBeTruthy();
  const request = vi.mocked(gateway.ask).mock.calls[0]![0];
  expect(request.interactionType).toBe('suggested-question');
  expect(request.contextPack.context).toMatchObject({ path: [{ dimension: 'Site', value: 'SITE-D' }], workOrderPopulation: 280 });
  expect(request.contextPack.findings.map((finding) => finding.lens)).toEqual(['Work Mix', 'Optimization']);
  expect(JSON.stringify(request.contextPack)).not.toMatch(/SYN-WO-|recordPreview|savedInvestigation/i);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
  fireEvent.click(within(panel()).getByRole('button', { name: 'Explore SITE-D' }));
  askFreeForm('What should I check next?');
  await waitFor(() => expect(vi.mocked(gateway.ask).mock.calls).toHaveLength(2));
  expect(vi.mocked(gateway.ask).mock.calls[1]![0].contextPack.context.path).toEqual([{ dimension: 'Site', value: 'SITE-D' }]);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-D');
});

test('free-form questions produce grounded and limited-evidence responses for current findings', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await choose('Site');
  await select('SITE-D');
  await within(panel()).findByText('30.5% concentrated');
  askFreeForm('Why should I investigate this?');
  expect(await within(panel()).findByText(/85.36% versus the authorized baseline of 71.80%/)).toBeTruthy();
  expect(within(panel()).getByText(/Work Mix — Higher reactive work share/)).toBeTruthy();
  expect(within(panel()).getByText(/Optimization — Reactive workload concentration opportunity/)).toBeTruthy();
  expect(within(panel()).getByText('Deterministic Mock AI Provider · local architecture validation')).toBeTruthy();

  fireEvent.click(within(panel()).getByRole('button', { name: 'Reset Investigation' }));
  await choose('Asset');
  await select('A-PUMP-01');
  await within(panel()).findByText('A-PUMP-01 · 3 periods / 180 days');
  askFreeForm('Why did this pump fail?');
  const limitedAnswer = await within(panel()).findByText(/does not contain sufficient failure-cause evidence/);
  expect(limitedAnswer).toBeTruthy();
  expect(within(panel()).getByText('LIMITED EVIDENCE')).toBeTruthy();
  expect(limitedAnswer.textContent).not.toMatch(/poor PM|technician|spare part|misuse/i);
});

test('empty free-form input is rejected and no-finding context gives a bounded limitation', async () => {
  const gateway: AxeonAIGateway = { ask: vi.fn((request) => mockAxeonAIGateway.ask(request)) };
  render(<App adapter={mockMaximoAdapter} aiGateway={gateway} />);
  await choose('Site');
  await select('SITE-B');
  await within(panel()).findByText('No qualifying operational findings for this context.');
  askFreeForm('   ');
  expect(within(panel()).getByRole('alert').textContent).toContain('Enter a question before asking Axeon.');
  expect(gateway.ask).not.toHaveBeenCalled();
  askFreeForm('Are there any major problems here?');
  expect(await within(panel()).findByText(/does not establish that no other operational issues exist/)).toBeTruthy();
  expect(within(panel()).getByText('LIMITED EVIDENCE')).toBeTruthy();
  expect(panel().textContent).not.toMatch(/Everything looks good|No problems|Healthy operation/i);
});

test('prospective multi-level context is sent exactly and asking does not commit the candidate', async () => {
  const gateway: AxeonAIGateway = { ask: vi.fn((request) => mockAxeonAIGateway.ask(request)) };
  render(<App adapter={mockMaximoAdapter} aiGateway={gateway} />);
  await choose('Site');
  await select('SITE-A');
  await within(panel()).findByText('29 of 225 approvals');
  fireEvent.click(within(panel()).getByRole('button', { name: 'Explore SITE-A' }));
  await choose('Status');
  await select('WAPPR');
  await waitFor(() => expect(within(panel()).queryByRole('status')).toBeNull());
  askFreeForm('Why should I investigate this?');
  await within(panel()).findByLabelText('Axeon AI response');
  await waitFor(() => expect(gateway.ask).toHaveBeenCalled());
  expect(vi.mocked(gateway.ask).mock.calls[0]![0].contextPack.context.path).toEqual([
    { dimension: 'Site', value: 'SITE-A' }, { dimension: 'Status', value: 'WAPPR' },
  ]);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders → Site: SITE-A');
  expect(within(panel()).getByText('PROSPECTIVE PATH')).toBeTruthy();
});

test('AI errors stay local, Retry uses current context, and deterministic findings remain available', async () => {
  const gateway: AxeonAIGateway = {
    ask: vi.fn().mockRejectedValueOnce(new Error('provider secret endpoint detail'))
      .mockImplementation((request: AxeonAIRequest) => mockAxeonAIGateway.ask(request)),
  };
  render(<App adapter={mockMaximoAdapter} aiGateway={gateway} />);
  await choose('Site');
  await select('SITE-D');
  expect(await within(panel()).findByText('85.4% reactive')).toBeTruthy();
  askFreeForm('Why should I investigate this?');
  expect(await within(panel()).findByRole('alert')).toHaveProperty('textContent', 'Axeon AI is unavailable. Please retry.Retry Axeon AI');
  expect(panel().textContent).not.toContain('provider secret endpoint detail');
  expect(within(panel()).getByText('85.4% reactive')).toBeTruthy();
  fireEvent.click(within(panel()).getByRole('button', { name: 'Retry Axeon AI' }));
  expect(await within(panel()).findByText('GROUNDED IN CURRENT AXEON FINDINGS')).toBeTruthy();
  expect(vi.mocked(gateway.ask).mock.calls).toHaveLength(2);
  expect(vi.mocked(gateway.ask).mock.calls[1]![0].contextPack.context.path).toEqual([{ dimension: 'Site', value: 'SITE-D' }]);
});

test('context changes and newer questions prevent stale AI responses', async () => {
  let resolveFirst!: (response: AxeonAIResponse) => void;
  let resolveSecond!: (response: AxeonAIResponse) => void;
  const first = new Promise<AxeonAIResponse>((resolve) => { resolveFirst = resolve; });
  const second = new Promise<AxeonAIResponse>((resolve) => { resolveSecond = resolve; });
  const gateway: AxeonAIGateway = { ask: vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second) };
  render(<App adapter={mockMaximoAdapter} aiGateway={gateway} />);
  await choose('Site');
  await select('SITE-D');
  await within(panel()).findByText('30.5% concentrated');
  askFreeForm('First question?');
  expect(within(panel()).getByRole('status').textContent).toContain('Preparing a grounded response');
  askFreeForm('Second question?');
  await waitFor(() => expect(vi.mocked(gateway.ask).mock.calls).toHaveLength(2));
  const secondRequest = vi.mocked(gateway.ask).mock.calls[1]![0];
  const secondResponse = await mockAxeonAIGateway.ask(secondRequest);
  await act(async () => resolveSecond(secondResponse));
  expect(await within(panel()).findByText('Second question?')).toBeTruthy();
  const firstRequest = vi.mocked(gateway.ask).mock.calls[0]![0];
  await act(async () => resolveFirst(await mockAxeonAIGateway.ask(firstRequest)));
  expect(within(panel()).getByText('Second question?')).toBeTruthy();
  expect(within(panel()).queryByText('First question?')).toBeNull();

  await select('SITE-B');
  expect(within(panel()).queryByLabelText('Axeon AI response')?.textContent).not.toContain('Second question?');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
});

test('an in-flight answer is discarded when the inspected context changes', async () => {
  let resolvePending!: (response: AxeonAIResponse) => void;
  const pending = new Promise<AxeonAIResponse>((resolve) => { resolvePending = resolve; });
  const gateway: AxeonAIGateway = { ask: vi.fn().mockReturnValue(pending) };
  render(<App adapter={mockMaximoAdapter} aiGateway={gateway} />);
  await choose('Site');
  await select('SITE-D');
  await within(panel()).findByText('30.5% concentrated');
  askFreeForm('Why should I investigate this?');
  await waitFor(() => expect(gateway.ask).toHaveBeenCalled());
  const request = vi.mocked(gateway.ask).mock.calls[0]![0];
  await select('SITE-B');
  expect(await within(panel()).findByText('No qualifying operational findings for this context.')).toBeTruthy();
  await act(async () => resolvePending(await mockAxeonAIGateway.ask(request)));
  expect(within(panel()).getByLabelText('Axeon AI response').textContent).toContain('Choose a suggested question');
  expect(within(panel()).getByLabelText('Axeon AI response').textContent).not.toContain('85.36%');
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
});

test('Saved Investigation metadata excludes AI and resume does not restore an old answer', async () => {
  const entries = new Map<string, string>();
  const store = createLocalInvestigationPersistence({ getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) });
  render(<App adapter={mockMaximoAdapter} persistence={store} />);
  await choose('Site');
  await select('SITE-D');
  await within(panel()).findByText('30.5% concentrated');
  fireEvent.click(within(panel()).getByRole('button', { name: 'Explore SITE-D' }));
  askFreeForm('Why should I investigate this?');
  expect(await within(panel()).findByText('GROUNDED IN CURRENT AXEON FINDINGS')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Save Investigation' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save Investigation' }));
  expect([...entries.values()].join(' ')).not.toMatch(/providerId|groundingStatus|Why should I investigate|contextPack/i);
  fireEvent.click(screen.getByRole('button', { name: 'Reset Investigation' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saved & Recent' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Open' }));
  expect(await within(panel()).findByText('30.5% concentrated')).toBeTruthy();
  expect(within(panel()).getByLabelText('Axeon AI response').textContent).toContain('Choose a suggested question');
  expect(within(panel()).getByLabelText('Axeon AI response').textContent).not.toContain('GROUNDED IN CURRENT');
});
