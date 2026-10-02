// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { createSyntheticSqliteWorkOrderRepository, initializeSyntheticDatabase, SyntheticDatabaseError } from './syntheticDatabase.js';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const principal = (username: string) => ({ subjectId: username, username, role: username === 'axeon.admin' ? 'administrator' as const : 'user' as const, authenticationMethod: 'password-session' as const, issuedAt: '2026-09-01T00:00:00.000Z' });
async function fixture() { const directory = await mkdtemp(join(tmpdir(), 'axeon-sqlite-')); directories.push(directory); const file = join(directory, 'work-orders.sqlite'); return { file, initialized: initializeSyntheticDatabase(file) }; }

test('synthetic SQLite initialization is repeatable and preserves the 2,000-record development fixture', async () => {
  const { file, initialized } = await fixture();
  expect(initialized).toMatchObject({ workOrderCount: 2000, referenceTime: '2026-09-01T00:00:00.000Z' });
  expect(initializeSyntheticDatabase(file)).toEqual(initialized);
  const repository = createSyntheticSqliteWorkOrderRepository(file);
  expect(repository.aggregateBySite(principal('axeon.admin'))).toEqual({ totalCount: 2000, groups: [{ site: 'SITE-A', count: 560 }, { site: 'SITE-B', count: 430 }, { site: 'SITE-C', count: 360 }, { site: 'SITE-D', count: 280 }, { site: 'SITE-E', count: 220 }, { site: 'SITE-F', count: 150 }] });
  repository.close();
});

test('authorized aggregate and bounded preview apply organization and explicit site scope before querying', async () => {
  const { file } = await fixture(); const repository = createSyntheticSqliteWorkOrderRepository(file);
  expect(repository.aggregateBySite(principal('site.a.user'))).toEqual({ totalCount: 560, groups: [{ site: 'SITE-A', count: 560 }] });
  expect(repository.aggregateBySite(principal('multi.site.user'))).toEqual({ totalCount: 920, groups: [{ site: 'SITE-A', count: 560 }, { site: 'SITE-C', count: 360 }] });
  const first = repository.previewWorkOrders(principal('site.a.user'), { offset: 0 }); const second = repository.previewWorkOrders(principal('site.a.user'), { offset: 20 });
  expect(first).toMatchObject({ totalCount: 560 }); expect(first.records).toHaveLength(20); expect(second.records).toHaveLength(20); expect(first.records[0]?.id).not.toBe(second.records[0]?.id); expect(first.records.every((record) => record.site === 'SITE-A')).toBe(true);
  expect(() => repository.previewWorkOrders(principal('site.a.user'), { site: 'SITE-B', offset: 0 })).toThrow(SyntheticDatabaseError);
  repository.close();
});

test('missing, permissionless, malformed, and unavailable database contexts fail closed', async () => {
  const { file } = await fixture(); const repository = createSyntheticSqliteWorkOrderRepository(file);
  expect(() => repository.aggregateBySite(principal('no.workorder.user'))).toThrow(SyntheticDatabaseError);
  expect(() => repository.aggregateBySite(principal('unmapped.user'))).toThrow(SyntheticDatabaseError);
  expect(() => repository.aggregateBySite({ ...principal('unmapped.admin'), role: 'administrator' })).toThrow(SyntheticDatabaseError);
  expect(() => repository.previewWorkOrders(principal('site.a.user'), { site: 'SITE-A', offset: -1 })).toThrow(SyntheticDatabaseError);
  expect(() => repository.previewWorkOrders(principal('site.a.user'), { site: 'SITE-A; DROP TABLE work_orders', offset: 0 })).toThrow(SyntheticDatabaseError);
  repository.close();
  expect(() => createSyntheticSqliteWorkOrderRepository(`${file}.missing`)).toThrow(SyntheticDatabaseError);
});
