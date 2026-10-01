import { expect, test } from 'vitest';
import { analyzeContext } from '../analytics/analyzeContext';
import { mockMaximoAdapter } from '../data/mockMaximoAdapter';
import { MOCK_SECURITY_CONTEXT } from '../data/maximoAdapter';
import { buildAIContextPack } from './contextPack';
import type { AxeonAIRequest } from './contracts';
import { ProviderIndependentAxeonAIGateway } from './gateway';
import { MockAxeonAIProvider } from './mockProvider';

const gateway = new ProviderIndependentAxeonAIGateway(new MockAxeonAIProvider());
const requestFor = async (path: readonly { dimension: 'Site' | 'Asset'; value: string }[], population: number, question: string): Promise<AxeonAIRequest> => {
  const findings = await analyzeContext(mockMaximoAdapter, path);
  return {
    interactionType: 'free-form-question',
    contextPack: buildAIContextPack({
      path, contextType: path.at(-1)?.dimension ?? 'Work Orders', contextLabel: path.at(-1)?.value ?? 'Work Orders',
      population, findings, question, securityScope: MOCK_SECURITY_CONTEXT,
      referenceTime: findings[0]?.referenceTime ?? '2026-09-01T00:00:00.000Z',
    }),
  };
};

test('provider-independent gateway returns a deterministic structured grounded response using supplied metrics', async () => {
  const request = await requestFor([{ dimension: 'Site', value: 'SITE-D' }], 280, 'Why should I investigate this?');
  const first = await gateway.ask(request);
  const second = await gateway.ask(request);
  expect(second).toEqual(first);
  expect(first).toMatchObject({ groundingStatus: 'grounded', metadata: { providerId: 'mock', mode: 'deterministic-mock' } });
  expect(first.answer).toContain('85.36% versus the authorized baseline of 71.80%');
  expect(first.answer).toContain('13.56 percentage points');
  expect(first.answer).toContain('73 of 239');
  expect(first.evidenceReferences.map((reference) => reference.lens)).toEqual(['Work Mix', 'Optimization']);
  expect(first.nextChecks).toEqual(['Explore by Status', 'Explore by Priority']);
});

test('unsupported failure-cause questions return limited evidence without an invented cause', async () => {
  const response = await gateway.ask(await requestFor([{ dimension: 'Asset', value: 'A-PUMP-01' }], 37, 'Why did this pump fail?'));
  expect(response.groundingStatus).toBe('limited-evidence');
  expect(response.answer).toContain('does not contain sufficient failure-cause evidence');
  expect(response.limitations.join(' ')).toMatch(/cause|remedy|failure-code/i);
  expect(response.answer).not.toMatch(/poor PM|technician|spare part|misuse|safety|financial/i);
});

test('no-finding context does not claim that no problems exist', async () => {
  const response = await gateway.ask(await requestFor([{ dimension: 'Site', value: 'SITE-B' }], 360, 'Are there any major problems here?'));
  expect(response.groundingStatus).toBe('limited-evidence');
  expect(response.evidenceReferences).toEqual([]);
  expect(response.answer).toContain('no qualifying operational findings');
  expect(response.answer).toContain('does not establish that no other operational issues exist');
  expect(response.answer).not.toMatch(/no problems|healthy|safe/i);
});

test('a suggested lens without a qualifying finding returns limited evidence instead of substituting another lens', async () => {
  const request = await requestFor([{ dimension: 'Site', value: 'SITE-D' }], 280, 'Is high-priority work accumulating?');
  request.interactionType = 'suggested-question';
  request.selectedSuggestion = { id: 'site-risk', lens: 'Risk' };
  const response = await gateway.ask(request);
  expect(response.groundingStatus).toBe('limited-evidence');
  expect(response.answer).toContain('no qualifying Risk finding');
  expect(response.evidenceReferences).toEqual([]);
  expect(response.answer).not.toContain('85.36%');
});

