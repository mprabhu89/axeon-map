export const AI_PROVIDER_IDS = [
  'mock',
  'watsonx',
  'azure-openai',
  'openai',
  'aws-bedrock',
  'google-vertex',
  'compatible',
] as const;

export type AIProviderId = typeof AI_PROVIDER_IDS[number];
export type AIProviderStatus = 'active' | 'not-configured' | 'unavailable';

export interface AIProviderCapabilities {
  contextualQuestionAnswering: boolean;
  structuredResponses: boolean;
  enterpriseGateway: boolean;
}

export interface AIProviderDefinition {
  id: AIProviderId;
  displayName: string;
  status: AIProviderStatus;
  capabilities: AIProviderCapabilities;
  configurationRequirements: {
    administratorConfigured: boolean;
    serverSideCredentials: boolean;
    validatedAdapterRequired: boolean;
  };
  developmentOnly?: boolean;
}

const futureCapabilities: AIProviderCapabilities = {
  contextualQuestionAnswering: true,
  structuredResponses: true,
  enterpriseGateway: true,
};

const futureProvider = (id: Exclude<AIProviderId, 'mock'>, displayName: string): AIProviderDefinition => ({
  id,
  displayName,
  status: 'not-configured',
  capabilities: futureCapabilities,
  configurationRequirements: {
    administratorConfigured: true,
    serverSideCredentials: true,
    validatedAdapterRequired: true,
  },
});

export const AI_PROVIDER_REGISTRY: readonly AIProviderDefinition[] = Object.freeze([
  {
    id: 'mock',
    displayName: 'Mock AI Provider',
    status: 'active',
    capabilities: {
      contextualQuestionAnswering: true,
      structuredResponses: true,
      enterpriseGateway: false,
    },
    configurationRequirements: {
      administratorConfigured: false,
      serverSideCredentials: false,
      validatedAdapterRequired: false,
    },
    developmentOnly: true,
  },
  futureProvider('watsonx', 'IBM watsonx'),
  futureProvider('azure-openai', 'Azure OpenAI'),
  futureProvider('openai', 'OpenAI'),
  futureProvider('aws-bedrock', 'AWS Bedrock'),
  futureProvider('google-vertex', 'Google Vertex AI'),
  futureProvider('compatible', 'Compatible Enterprise Provider'),
]);

export function getAIProviderDefinition(id: AIProviderId): AIProviderDefinition {
  const provider = AI_PROVIDER_REGISTRY.find((item) => item.id === id);
  if (!provider) throw new Error('Configured AI provider is not registered.');
  return provider;
}

