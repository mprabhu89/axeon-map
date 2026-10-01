// @vitest-environment node
import { expect, test } from 'vitest';
import { createObjectProfileRegistry, DEFAULT_OBJECT_PROFILE_REGISTRY, type ObjectProfile } from './objectProfileRegistry.js';

test('server-owned registry exposes approved object profiles without implementation details', () => {
  expect(DEFAULT_OBJECT_PROFILE_REGISTRY.list().map((profile) => profile.id)).toEqual(['work-orders', 'service-requests', 'incidents', 'assets']);
  expect(DEFAULT_OBJECT_PROFILE_REGISTRY.get('work-orders')?.authorizationPolicyReference).toBe('maximo-work-order');
  expect(JSON.stringify(DEFAULT_OBJECT_PROFILE_REGISTRY.list())).not.toMatch(/sql|query|endpoint|secret/i);
});

test('registry validates custom profiles and rejects arbitrary query-bearing configuration', () => {
  const custom: ObjectProfile = {
    id: 'approved-custom', kind: 'custom', displayName: 'Approved Custom Object', applicationId: 'custom-app', primaryIdentifierField: 'record-id',
    fields: [{ id: 'record-id', label: 'Record', type: 'identifier', previewable: true }], explorationFieldIds: [], filterFieldIds: [], previewFieldIds: ['record-id'],
    relationships: [], analyticalCapabilities: [], authorizationPolicyReference: 'maximo-custom',
  };
  expect(createObjectProfileRegistry([custom]).get('approved-custom')).toMatchObject({ kind: 'custom' });
  expect(() => createObjectProfileRegistry([{ ...custom, sql: 'select * from anything' } as unknown as ObjectProfile])).toThrow('sql');
});
