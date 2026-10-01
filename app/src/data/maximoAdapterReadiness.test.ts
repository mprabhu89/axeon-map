import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCAL_MAXIMO_ADAPTER_CONFIGURATION, resolveMaximoAdapter } from './adapterResolver';
import {
  adapterCapabilities,
  adapterError,
  MAXIMO_ADAPTER_LIMITS,
  MaximoAdapterError,
  MOCK_SECURITY_CONTEXT,
  requestContext,
  requireAdapterCapability,
} from './maximoAdapter';
import { createMockMaximoAdapter } from './mockMaximoAdapter';
import { realMaximoAdapter } from './realMaximoAdapter';
import {
  normalizeAnalyticalEvidence,
  normalizePreviewRecord,
  normalizePriority,
} from './workOrderNormalization';

const productionSources = import.meta.glob(
  [
    '../**/*.ts',
    '../**/*.tsx',
    '!../**/*.test.ts',
    '!../**/*.test.tsx',
    '!./syntheticWorkOrders.ts',
    '!./mockMaximoAdapter.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

describe('Task 017 Maximo Adapter readiness', () => {
  it('declares Mock active and Real Maximo not configured', () => {
    const mock = createMockMaximoAdapter();

    expect(mock.profile).toMatchObject({
      id: 'mock',
      availability: 'active',
      mode: 'development',
    });
    expect(Object.values(mock.profile.capabilities).every(Boolean)).toBe(true);
    expect(realMaximoAdapter.profile).toMatchObject({
      id: 'real-maximo',
      availability: 'not-configured',
      mode: 'production',
    });
    expect(Object.values(realMaximoAdapter.profile.capabilities).every((value) => !value)).toBe(true);
  });

  it('resolves adapters explicitly and never falls back from Real to Mock', async () => {
    const local = resolveMaximoAdapter(DEFAULT_LOCAL_MAXIMO_ADAPTER_CONFIGURATION);
    const real = resolveMaximoAdapter({ selectedAdapterId: 'real-maximo' });

    expect(local.profile.id).toBe('mock');
    expect(real.profile.id).toBe('real-maximo');
    await expect(
      real.explore({ ...requestContext(real, []), nextDimension: null, maxGroups: 16 }),
    ).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('fails closed when authorization context is missing or mismatched', async () => {
    const adapter = createMockMaximoAdapter();
    const invalidScope = {
      ...MOCK_SECURITY_CONTEXT,
      source: 'real-adapter' as const,
    };

    await expect(
      adapter.explore({ path: [], securityScope: invalidScope, nextDimension: null, maxGroups: 16 }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    await expect(
      adapter.explore({
        path: undefined,
        securityScope: MOCK_SECURITY_CONTEXT,
        nextDimension: null,
        maxGroups: 16,
      } as never),
    ).rejects.toMatchObject({ code: 'invalid-context' });
  });

  it('fails unsupported capabilities without executing a hidden fallback', () => {
    const adapter = createMockMaximoAdapter();
    const unsupported = {
      ...adapter,
      profile: {
        ...adapter.profile,
        capabilities: adapterCapabilities(['exploration']),
      },
    };

    expect(() => requireAdapterCapability(unsupported, 'export')).toThrowError(
      expect.objectContaining({ code: 'unsupported-capability' }),
    );
  });

  it('uses user-safe typed errors without leaking sensitive internal details', () => {
    const error = adapterError('unknown');

    expect(error).toBeInstanceOf(MaximoAdapterError);
    expect(error.message).toBe('The Maximo data request could not be completed.');
    expect(error.message).not.toContain('secret');
    expect(error.message).not.toContain('SELECT');
  });

  it('normalizes database-native variations before they reach product logic', () => {
    expect(normalizePriority(' 2 ')).toBe(2);
    expect(normalizePriority('URGENT')).toBe('URGENT');
    expect(normalizePriority(null)).toBeNull();
    expect(
      normalizePreviewRecord({
        id: ' WO\n100 ',
        site: null,
        status: undefined,
        priority: ' 1 ',
        classification: '',
        location: null,
        asset: undefined,
      }),
    ).toEqual({
      id: 'WO 100',
      site: null,
      status: null,
      priority: 1,
      classification: null,
      location: null,
      asset: null,
    });
    expect(normalizeAnalyticalEvidence({}).id).toBe('(Unspecified)');
  });

  it('centralizes every accepted bounded-access contract', () => {
    expect(MAXIMO_ADAPTER_LIMITS).toEqual({
      visibleExplorationGroups: 16,
      recordPreviewPageSize: 20,
      filterValuesPerDimension: 50,
      reportAggregateDimensions: 3,
      reportGroupsPerDimension: 8,
    });
  });

  it('keeps direct synthetic dataset imports out of production product modules', () => {
    const leakingModules = Object.entries(productionSources)
      .filter(([, source]) => source.includes("from './syntheticWorkOrders'") || source.includes("from '../data/syntheticWorkOrders'"))
      .map(([path]) => path);

    expect(leakingModules).toEqual([]);
  });
});
