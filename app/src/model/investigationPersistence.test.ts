import { expect, test } from 'vitest';
import { createLocalInvestigationPersistence, defaultInvestigationName } from './investigationPersistence';
import type { PathSegment } from './exploration';

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    entries,
  };
}

const site = [{ dimension: 'Site', value: 'SITE-A' }] as const;
const multi = [...site, { dimension: 'Status', value: 'WAPPR' }] as const;

test('save stores only trimmed name, ID, committed path, and timestamps through the repository', () => {
  const storage = memoryStorage();
  const store = createLocalInvestigationPersistence(storage);
  expect(() => store.save('Root', [])).toThrow();
  expect(() => store.save('   ', site)).toThrow();
  expect(defaultInvestigationName(multi)).toBe('SITE-A / WAPPR');
  const saved = store.save('  SITE-A WAPPR Review  ', multi);
  expect(saved.name).toBe('SITE-A WAPPR Review');
  expect(saved.path).toEqual(multi);
  expect(saved.id).toBeTruthy();
  expect(saved.createdAt).toBeTruthy();
  expect(Object.keys(saved).sort()).toEqual(['createdAt', 'id', 'name', 'path']);
  const raw = [...storage.entries.values()][0]!;
  expect(JSON.parse(raw).schemaVersion).toBe(2);
  expect(raw).not.toMatch(/SYN-WO|classification|asset|questions|recordCount/);
  expect(createLocalInvestigationPersistence(storage).listSaved()).toHaveLength(1);
  store.deleteSaved(saved.id);
  expect(store.listSaved()).toHaveLength(0);
});

test('filtered investigations persist structured filters, distinguish recents, and load legacy entries without filters', () => {
  const storage = memoryStorage();
  const store = createLocalInvestigationPersistence(storage);
  const filters = [{ dimension: 'Work Type', values: ['CM', 'EM'] }, { dimension: 'Priority', values: ['1'] }] as const;
  const saved = store.save('Reactive priority', site, filters);
  expect(saved.filters).toEqual([{ dimension: 'Priority', values: ['1'] }, { dimension: 'Work Type', values: ['CM', 'EM'] }]);
  store.recordRecent(site, [{ dimension: 'Priority', values: ['2'] }]);
  expect(store.listRecent()).toHaveLength(2);
  expect([...storage.entries.values()][0]).not.toMatch(/SYN-WO|reportDate|actualStart/);

  storage.setItem('axeon-map-investigations-v1', JSON.stringify({
    schemaVersion: 1,
    saved: [{ id: 'legacy', name: 'Legacy', path: site, createdAt: '2026-01-01' }],
    recent: [{ path: site, lastOpenedAt: '2026-01-01' }],
  }));
  expect(createLocalInvestigationPersistence(storage).listSaved()[0]?.filters).toBeUndefined();
});

test('recent investigations are bounded, meaningful, and deduplicated by structured path', () => {
  const store = createLocalInvestigationPersistence(memoryStorage());
  store.recordRecent([]);
  expect(store.listRecent()).toHaveLength(0);
  const paths: PathSegment[][] = ['SITE-A', 'SITE-B', 'SITE-C', 'SITE-D', 'SITE-E', 'SITE-F']
    .map((value) => [{ dimension: 'Site', value }]);
  paths.forEach((path) => store.recordRecent(path));
  expect(store.listRecent()).toHaveLength(5);
  expect(store.listRecent().map(({ path }) => path[0]!.value)).toEqual(['SITE-F', 'SITE-E', 'SITE-D', 'SITE-C', 'SITE-B']);
  store.recordRecent(paths[2]!);
  expect(store.listRecent()).toHaveLength(5);
  expect(store.listRecent()[0]?.path).toEqual(paths[2]);
});

test('opening a saved investigation updates its recent timestamp without adding duplicate recents', () => {
  const store = createLocalInvestigationPersistence(memoryStorage());
  const saved = store.save('Review', multi);
  store.markOpened(saved.id);
  store.markOpened(saved.id);
  expect(store.listSaved()[0]?.lastOpenedAt).toBeTruthy();
  expect(store.listRecent()).toHaveLength(1);
  expect(store.listRecent()[0]?.path).toEqual(multi);
});

test('loaded metadata drops unexpected record-like fields before another write', () => {
  const storage = memoryStorage();
  storage.setItem('axeon-map-investigations-v1', JSON.stringify({
    schemaVersion: 1,
    saved: [{ id: 'saved-1', name: 'Review', path: site, filters: [null, { dimension: 'Unknown', values: ['x'] }], createdAt: '2026-01-01', rawRecords: [{ id: 'SYN-WO-0001' }] }],
    recent: [{ path: site, lastOpenedAt: '2026-01-01', candidateList: ['SITE-B'] }],
  }));
  const store = createLocalInvestigationPersistence(storage);
  store.markOpened('saved-1');
  const raw = [...storage.entries.values()][0]!;
  expect(raw).not.toMatch(/rawRecords|SYN-WO-0001|candidateList/);
  expect(store.listSaved()[0]?.path).toEqual(site);
  expect(store.listSaved()[0]?.filters).toEqual([]);
});

test('malformed persisted state fails closed without treating storage content as investigation data', () => {
  const storage = memoryStorage();
  storage.setItem('axeon-map-investigations-v1', '{ not valid JSON');
  const store = createLocalInvestigationPersistence(storage);
  expect(store.listSaved()).toEqual([]);
  expect(store.listRecent()).toEqual([]);
});
