import { expect, test } from 'vitest';
import { analyzeContext } from '../analytics/analyzeContext';
import { mockMaximoAdapter } from '../data/mockMaximoAdapter';
import { MOCK_SECURITY_CONTEXT } from '../data/maximoAdapter';
import { buildAIContextPack } from './contextPack';
import { DEFAULT_LOCAL_AI_CONFIGURATION, type AxeonAIConfiguration } from './configuration';
import type { AxeonAIRequest } from './contracts';
import { AIProviderUnavailableError, resolveAxeonAIRuntime } from './providerResolver';

async function siteDRequest(): Promise<AxeonAIRequest> {
  const path = [{ dimension: 'Site', value: 'SITE-D' }] as const;
  const findings = await analyzeContext(mockMaximoAdapter, path);
  return {
    interactionType: 'free-form-question',
    contextPack: buildAIContextPack({
      path, contextType: 'Site', contextLabel: 'SITE-D', population: 280, findings,
      question: 'Why should I investigate this?', securityScope: MOCK_SECURITY_CONTEXT,
      referenceTime: findings[0]?.referenceTime ?? null,
    }),
  };
}

test('default configuration resolves the executable Mock provider behind the gateway', async () => {
  const runtime = resolveAxeonAIRuntime(DEFAULT_LOCAL_AI_CONFIGURATION);
  expect(runtime).toMatchObject({ executionStatus: 'active', provider: { id: 'mock', status: 'active' } });
  const response = await runtime.gateway.ask(await siteDRequest());
  expect(response).toMatchObject({ groundingStatus: 'grounded', metadata: { providerId: 'mock' } });
  expect(response.answer).toContain('85.36% versus the authorized baseline of 71.80%');
});

test.each(['watsonx', 'azure-openai', 'openai', 'aws-bedrock', 'google-vertex', 'compatible'] as const)(
  'unconfigured %s never falls back to Mock', async (selectedProviderId) => {
    const configuration: AxeonAIConfiguration = { enabled: true, selectedProviderId };
    const runtime = resolveAxeonAIRuntime(configuration);
    expect(runtime.executionStatus).toBe('unavailable');
    expect(runtime.provider.id).toBe(selectedProviderId);
    await expect(runtime.gateway.ask(await siteDRequest())).rejects.toBeInstanceOf(AIProviderUnavailableError);
  },
);

test('disabled configuration prevents execution without changing the request contract', async () => {
  const request = await siteDRequest();
  const runtime = resolveAxeonAIRuntime({ enabled: false, selectedProviderId: 'mock' });
  expect(runtime.executionStatus).toBe('disabled');
  await expect(runtime.gateway.ask(request)).rejects.toThrow('Generative AI is disabled');
  expect(request.contextPack.schemaVersion).toBe(1);
  expect(request.contextPack.context.path).toEqual([{ dimension: 'Site', value: 'SITE-D' }]);
  expect(JSON.stringify(runtime.configuration)).not.toMatch(/secret|token|password|key/i);
});


