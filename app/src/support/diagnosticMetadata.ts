import type { AIExecutionStatus } from '../ai/providerResolver';
import type { AIProviderId } from '../ai/providerRegistry';
import type { MaximoAdapterProfile } from '../data/maximoAdapter';
import { AXEON_RELEASE, type ProductReleaseMetadata } from '../product/releaseMetadata';

export interface SafeDiagnosticMetadata {
  readonly release: ProductReleaseMetadata;
  readonly adapter: Pick<MaximoAdapterProfile, 'id' | 'mode' | 'availability'>;
  readonly ai: {
    readonly providerId: AIProviderId | 'injected';
    readonly executionStatus: AIExecutionStatus;
  };
  readonly securityScope: MaximoAdapterProfile['securityContext'];
}

export function buildSafeDiagnosticMetadata(input: {
  adapter: MaximoAdapterProfile;
  aiProviderId: AIProviderId | 'injected';
  aiExecutionStatus: AIExecutionStatus;
}): Readonly<SafeDiagnosticMetadata> {
  return Object.freeze({
    release: AXEON_RELEASE,
    adapter: Object.freeze({ id: input.adapter.id, mode: input.adapter.mode, availability: input.adapter.availability }),
    ai: Object.freeze({ providerId: input.aiProviderId, executionStatus: input.aiExecutionStatus }),
    securityScope: Object.freeze({ ...input.adapter.securityContext }),
  });
}
