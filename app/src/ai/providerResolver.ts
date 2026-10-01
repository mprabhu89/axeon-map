import type { AxeonAIGateway, AxeonAIProvider, AxeonAIRequest, AxeonAIResponse } from './contracts';
import type { AxeonAIConfiguration } from './configuration';
import { ProviderIndependentAxeonAIGateway } from './gateway';
import { MockAxeonAIProvider } from './mockProvider';
import { getAIProviderDefinition, type AIProviderDefinition, type AIProviderId } from './providerRegistry';
import { axeonLogger } from '../support/logger';

export type AIExecutionStatus = 'active' | 'disabled' | 'unavailable';

export interface AxeonAIRuntime {
  configuration: Readonly<AxeonAIConfiguration>;
  provider: AIProviderDefinition;
  gateway: AxeonAIGateway;
  executionStatus: AIExecutionStatus;
  statusMessage: string;
}

export class AIProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderUnavailableError';
  }
}

class UnavailableAxeonAIProvider implements AxeonAIProvider {
  constructor(private readonly message: string) {}

  respond(_request: AxeonAIRequest): Promise<AxeonAIResponse> {
    return Promise.reject(new AIProviderUnavailableError(this.message));
  }
}

const executableProviderFactories: Partial<Record<AIProviderId, () => AxeonAIProvider>> = {
  mock: () => new MockAxeonAIProvider(),
};

export function resolveAxeonAIRuntime(configuration: Readonly<AxeonAIConfiguration>): AxeonAIRuntime {
  const provider = getAIProviderDefinition(configuration.selectedProviderId);
  if (!configuration.enabled) {
    const statusMessage = 'Generative AI is disabled. Operational Findings and investigation guidance remain available.';
    return {
      configuration,
      provider,
      gateway: new ProviderIndependentAxeonAIGateway(new UnavailableAxeonAIProvider(statusMessage)),
      executionStatus: 'disabled',
      statusMessage,
    };
  }

  const factory = provider.status === 'active' ? executableProviderFactories[provider.id] : undefined;
  if (!factory) {
    const statusMessage = `${provider.displayName} is not configured for this deployment.`;
    axeonLogger.security({
      eventCode: 'AX-SEC-PROVIDER-REJECTED', component: 'ai', operation: 'resolve-provider', result: 'rejected',
      aiProviderId: provider.id,
    });
    return {
      configuration,
      provider,
      gateway: new ProviderIndependentAxeonAIGateway(new UnavailableAxeonAIProvider(statusMessage)),
      executionStatus: 'unavailable',
      statusMessage,
    };
  }

  return {
    configuration,
    provider,
    gateway: new ProviderIndependentAxeonAIGateway(factory()),
    executionStatus: 'active',
    statusMessage: `${provider.displayName} is active for local development.`,
  };
}
