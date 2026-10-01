import { expect, test } from 'vitest';
import { mockMaximoAdapter } from '../data/mockMaximoAdapter';
import { AXEON_RELEASE } from '../product/releaseMetadata';
import { buildSafeDiagnosticMetadata, type SafeDiagnosticMetadata } from './diagnosticMetadata';

test('safe diagnostic metadata exposes release and runtime identity without sensitive configuration', () => {
  const diagnostic: SafeDiagnosticMetadata = buildSafeDiagnosticMetadata({
    adapter: mockMaximoAdapter.profile,
    aiProviderId: 'mock',
    aiExecutionStatus: 'active',
  });

  expect(diagnostic).toEqual({
    release: AXEON_RELEASE,
    adapter: { id: 'mock', mode: 'development', availability: 'active' },
    ai: { providerId: 'mock', executionStatus: 'active' },
    securityScope: mockMaximoAdapter.profile.securityContext,
  });
  expect(JSON.stringify(diagnostic)).not.toMatch(/credential|password|token|secret|endpoint|sql|stack/i);
});
