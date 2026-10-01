import type { AxeonAIGateway, AxeonAIProvider, AxeonAIRequest, AxeonAIResponse } from './contracts';

export class ProviderIndependentAxeonAIGateway implements AxeonAIGateway {
  constructor(private readonly provider: AxeonAIProvider) {}

  ask(request: AxeonAIRequest): Promise<AxeonAIResponse> {
    return this.provider.respond(request);
  }
}
