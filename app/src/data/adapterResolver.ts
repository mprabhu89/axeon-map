import type { MaximoAdapter } from './maximoAdapter';
import { mockMaximoAdapter } from './mockMaximoAdapter';
import { realMaximoAdapter } from './realMaximoAdapter';

export type MaximoAdapterId = 'mock' | 'real-maximo';
export interface MaximoAdapterConfiguration { selectedAdapterId: MaximoAdapterId }
export const DEFAULT_LOCAL_MAXIMO_ADAPTER_CONFIGURATION: Readonly<MaximoAdapterConfiguration> = Object.freeze({ selectedAdapterId: 'mock' });

export function resolveMaximoAdapter(configuration: Readonly<MaximoAdapterConfiguration>): MaximoAdapter {
  switch (configuration.selectedAdapterId) {
    case 'mock': return mockMaximoAdapter;
    case 'real-maximo': return realMaximoAdapter;
  }
}
