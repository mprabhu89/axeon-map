import type { AIProviderId } from './providerRegistry';

export interface AxeonAIConfiguration {
  enabled: boolean;
  selectedProviderId: AIProviderId;
}

export const DEFAULT_LOCAL_AI_CONFIGURATION: Readonly<AxeonAIConfiguration> = Object.freeze({
  enabled: true,
  selectedProviderId: 'mock',
});

