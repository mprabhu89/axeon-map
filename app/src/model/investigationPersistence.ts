import type { PathSegment } from './exploration';
import { copyFilters, filtersKey, normalizeFilters, type InvestigationFilter } from './investigationContext';
import { axeonLogger } from '../support/logger';

export interface SavedInvestigation {
  id: string;
  name: string;
  path: readonly PathSegment[];
  filters?: readonly InvestigationFilter[];
  createdAt: string;
  lastOpenedAt?: string;
}

export interface RecentInvestigation {
  path: readonly PathSegment[];
  filters?: readonly InvestigationFilter[];
  lastOpenedAt: string;
}

export interface InvestigationPersistence {
  listSaved(): SavedInvestigation[];
  save(name: string, path: readonly PathSegment[], filters?: readonly InvestigationFilter[]): SavedInvestigation;
  deleteSaved(id: string): void;
  markOpened(id: string): void;
  listRecent(): RecentInvestigation[];
  recordRecent(path: readonly PathSegment[], filters?: readonly InvestigationFilter[]): void;
}

interface StoredInvestigations {
  schemaVersion: 2;
  saved: SavedInvestigation[];
  recent: RecentInvestigation[];
}

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
const storageKey = 'axeon-map-investigations-v1';
const recentLimit = 5;
const emptyStore = (): StoredInvestigations => ({ schemaVersion: 2, saved: [], recent: [] });
const copyPath = (path: readonly PathSegment[]): PathSegment[] =>
  path.map(({ dimension, value }) => ({ dimension, value }));
const pathKey = (path: readonly PathSegment[], filters: readonly InvestigationFilter[] = []) => JSON.stringify([path, filtersKey(filters)]);
const isPath = (value: unknown): value is PathSegment[] =>
  Array.isArray(value) && value.length <= 6 && value.every((segment) =>
    segment && typeof segment === 'object'
    && typeof segment.dimension === 'string' && typeof segment.value === 'string'
    && segment.dimension.length <= 32 && segment.value.length <= 200);
const storedFilters = (value: unknown): InvestigationFilter[] => Array.isArray(value)
  ? normalizeFilters(value as readonly InvestigationFilter[]) : [];

export function defaultInvestigationName(path: readonly PathSegment[]): string {
  return path.length ? path.map(({ value }) => value).join(' / ').slice(0, 80) : 'Work Orders';
}

export function createLocalInvestigationPersistence(storage: StoragePort): InvestigationPersistence {
  const read = (): StoredInvestigations => {
    const raw = storage.getItem(storageKey);
    if (!raw) return emptyStore();
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !('schemaVersion' in parsed) || (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2)
        || !('saved' in parsed) || !Array.isArray(parsed.saved)
        || !('recent' in parsed) || !Array.isArray(parsed.recent)) {
        axeonLogger.security({ eventCode: 'AX-SEC-PERSISTED-STATE-REJECTED', component: 'persistence', operation: 'read-investigations', result: 'rejected' });
        return emptyStore();
      }
      const data = parsed as StoredInvestigations;
      return {
        schemaVersion: 2,
        saved: data.saved.filter((item) => item && typeof item.id === 'string'
          && typeof item.name === 'string' && typeof item.createdAt === 'string'
          && isPath(item.path)).map((item) => ({
            id: item.id,
            name: item.name.slice(0, 80),
            path: copyPath(item.path),
            ...('filters' in item ? { filters: copyFilters(storedFilters(item.filters)) } : {}),
            createdAt: item.createdAt,
            ...(typeof item.lastOpenedAt === 'string' ? { lastOpenedAt: item.lastOpenedAt } : {}),
          })),
        recent: data.recent.filter((item) => item && typeof item.lastOpenedAt === 'string'
          && isPath(item.path)).slice(0, recentLimit)
          .map((item) => ({ path: copyPath(item.path), ...('filters' in item ? { filters: copyFilters(storedFilters(item.filters)) } : {}), lastOpenedAt: item.lastOpenedAt })),
      };
    } catch {
      axeonLogger.security({ eventCode: 'AX-SEC-PERSISTED-STATE-REJECTED', component: 'persistence', operation: 'read-investigations', result: 'rejected' });
      return emptyStore();
    }
  };
  const write = (data: StoredInvestigations) => storage.setItem(storageKey, JSON.stringify(data));
  const recordRecentIn = (data: StoredInvestigations, path: readonly PathSegment[], filters: readonly InvestigationFilter[] = []): void => {
    const normalizedFilters = normalizeFilters(filters);
    if (!path.length && !normalizedFilters.length) return;
    const key = pathKey(path, normalizedFilters);
    data.recent = [
      { path: copyPath(path), ...(normalizedFilters.length ? { filters: copyFilters(normalizedFilters) } : {}), lastOpenedAt: new Date().toISOString() },
      ...data.recent.filter((entry) => pathKey(entry.path, entry.filters) !== key),
    ].slice(0, recentLimit);
  };
  return {
    listSaved: () => read().saved,
    save(name, path, filters = []) {
      const trimmed = name.trim();
      const normalizedFilters = normalizeFilters(filters);
      if ((!path.length && !normalizedFilters.length) || !trimmed || trimmed.length > 80) throw new Error('Invalid investigation');
      const data = read();
      const saved: SavedInvestigation = {
        id: crypto.randomUUID(),
        name: trimmed,
        path: copyPath(path),
        ...(normalizedFilters.length ? { filters: copyFilters(normalizedFilters) } : {}),
        createdAt: new Date().toISOString(),
      };
      data.saved.unshift(saved);
      recordRecentIn(data, path, normalizedFilters);
      write(data);
      return saved;
    },
    deleteSaved(id) {
      const data = read();
      data.saved = data.saved.filter((entry) => entry.id !== id);
      write(data);
    },
    markOpened(id) {
      const data = read();
      const item = data.saved.find((entry) => entry.id === id);
      if (!item) return;
      item.lastOpenedAt = new Date().toISOString();
      recordRecentIn(data, item.path, item.filters);
      write(data);
    },
    listRecent: () => read().recent.slice(0, recentLimit),
    recordRecent(path, filters = []) {
      if (!path.length && !filters.length) return;
      const data = read();
      recordRecentIn(data, path, filters);
      write(data);
    },
  };
}

export function createBrowserInvestigationPersistence(): InvestigationPersistence {
  return createLocalInvestigationPersistence(window.localStorage);
}
