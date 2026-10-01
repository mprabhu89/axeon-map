import { expect, test } from 'vitest';
import { AI_PROVIDER_IDS, AI_PROVIDER_REGISTRY } from './providerRegistry';

test('provider registry exposes stable unique IDs and honest local statuses', () => {
  expect(AI_PROVIDER_REGISTRY.map((provider) => provider.id)).toEqual(AI_PROVIDER_IDS);
  expect(new Set(AI_PROVIDER_IDS).size).toBe(AI_PROVIDER_IDS.length);
  expect(AI_PROVIDER_REGISTRY.find((provider) => provider.id === 'mock')).toMatchObject({
    displayName: 'Mock AI Provider', status: 'active', developmentOnly: true,
  });
  for (const id of AI_PROVIDER_IDS.filter((providerId) => providerId !== 'mock')) {
    expect(AI_PROVIDER_REGISTRY.find((provider) => provider.id === id)?.status).toBe('not-configured');
  }
});

test('provider registry contains safe metadata without secrets or customer endpoints', () => {
  const serialized = JSON.stringify(AI_PROVIDER_REGISTRY);
  expect(serialized).not.toMatch(/api.?key|access.?token|client.?secret|password|account.?id|https?:\/\//i);
  expect(AI_PROVIDER_REGISTRY.every((provider) => provider.capabilities.contextualQuestionAnswering)).toBe(true);
  expect(AI_PROVIDER_REGISTRY.every((provider) => provider.capabilities.structuredResponses)).toBe(true);
});

