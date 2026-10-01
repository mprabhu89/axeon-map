import { describe, expect, it } from 'vitest';
import type { AnalyticalEvidenceAdapter, MaximoAdapter } from './maximoAdapter';
import { MAXIMO_ADAPTER_LIMITS, requestContext } from './maximoAdapter';
import { createMockMaximoAdapter } from './mockMaximoAdapter';

type AdapterFactory = () => AnalyticalEvidenceAdapter;

/**
 * Reusable behavioral contract for adapter implementations. A future Real
 * Maximo Adapter can run this suite in an authorized MAS test environment.
 */
export const defineMaximoAdapterContract = (
  name: string,
  createAdapter: AdapterFactory,
) => {
  describe(`${name} Maximo Adapter contract`, () => {
    it('uses structured context and returns a bounded represented population', async () => {
      const adapter = createAdapter();
      const result = await adapter.explore({
        ...requestContext(adapter, []), nextDimension: null, maxGroups: 16,
      });

      expect(result).toEqual({ totalCount: 2_000, groups: [], totalGroups: 0 });
    });

    it('bounds exploration and derives groups from the represented context', async () => {
      const adapter = createAdapter();
      const result = await adapter.explore({
        ...requestContext(adapter, []),
        nextDimension: 'Site',
        maxGroups: Number.MAX_SAFE_INTEGER,
      });

      expect(result.groups.length).toBeGreaterThan(0);
      expect(result.groups.length).toBeLessThanOrEqual(
        MAXIMO_ADAPTER_LIMITS.visibleExplorationGroups,
      );
      expect(result.groups.find((group) => group.value === 'SITE-A')?.count).toBe(560);
    });

    it('applies same-dimension OR and cross-dimension AND filter semantics', async () => {
      const adapter = createAdapter();
      const reactive = await adapter.explore({
        ...requestContext(adapter, [], [
          { dimension: 'Work Type', values: ['CM', 'EM'] },
        ]),
        nextDimension: null, maxGroups: 16,
      });
      const siteAReactive = await adapter.explore({
        ...requestContext(adapter, [], [
          { dimension: 'Work Type', values: ['CM', 'EM'] },
          { dimension: 'Site', values: ['SITE-A'] },
        ]),
        nextDimension: null, maxGroups: 16,
      });

      expect(reactive.totalCount).toBe(1_436);
      expect(siteAReactive.totalCount).toBeLessThan(reactive.totalCount);
    });

    it('supports prospective paths without mutating committed state', async () => {
      const adapter = createAdapter();
      const committedPath = [{ dimension: 'Site', value: 'SITE-A' }] as const;
      const prospectivePath = [
        ...committedPath,
        { dimension: 'Status' as const, value: 'WAPPR' },
      ];
      const result = await adapter.explore({
        ...requestContext(adapter, prospectivePath, [
          { dimension: 'Work Type', values: ['CM', 'EM'] },
        ]),
        nextDimension: null, maxGroups: 16,
      });

      expect(result.totalCount).toBe(178);
      expect(committedPath).toEqual([{ dimension: 'Site', value: 'SITE-A' }]);
    });

    it('keeps preview pages bounded and export on the identical context', async () => {
      const adapter = createAdapter();
      const context = requestContext(adapter, [
        { dimension: 'Site', value: 'SITE-A' },
      ]);
      const firstPage = await adapter.previewRecords({
        ...context,
        offset: 0,
        maxRecords: Number.MAX_SAFE_INTEGER,
      });
      const secondPage = await adapter.previewRecords({
        ...context,
        offset: MAXIMO_ADAPTER_LIMITS.recordPreviewPageSize,
        maxRecords: MAXIMO_ADAPTER_LIMITS.recordPreviewPageSize,
      });
      const exported = await adapter.exportRecords(context);

      expect(firstPage.records).toHaveLength(MAXIMO_ADAPTER_LIMITS.recordPreviewPageSize);
      expect(secondPage.records[0]?.id).not.toBe(firstPage.records[0]?.id);
      expect(firstPage.totalCount).toBe(560);
      expect(exported.recordCount).toBe(560);
      expect(exported.content.trim().split(/\r?\n/)).toHaveLength(561);
    });

    it('keeps analytical evidence and baseline behind the same authorized boundary', async () => {
      const adapter = createAdapter();
      const evidence = await adapter.analyticalEvidence(
        requestContext(adapter, [{ dimension: 'Asset', value: 'A-PUMP-01' }]),
      );

      expect(evidence.evidence.every((record) => record.asset === 'A-PUMP-01')).toBe(true);
      expect(evidence.baseline.eligibleCount).toBe(2_000);
      expect(evidence.referenceTime).toBe('2026-09-01T00:00:00.000Z');
    });

    it('discovers domain values through the adapter rather than a product fixture', async () => {
      const adapter = createAdapter();
      const result = await adapter.filterValues!({
        ...requestContext(adapter, []),
        dimension: 'Work Type',
        maxValues: MAXIMO_ADAPTER_LIMITS.filterValuesPerDimension,
      });

      expect(result.values).toEqual([
        { value: 'CM', count: 1_215 },
        { value: 'PM', count: 564 },
        { value: 'EM', count: 221 },
      ]);
    });
  });
};

defineMaximoAdapterContract('Mock', createMockMaximoAdapter);

// Compile-time proof that the contract suite accepts the production-facing port.
const acceptsProductionContract = (_adapter: MaximoAdapter) => undefined;
acceptsProductionContract(createMockMaximoAdapter());
