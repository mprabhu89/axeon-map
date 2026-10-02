import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { existsSync } from 'node:fs';
import type { AuthenticatedPrincipal } from './authentication.js';
import { generateSyntheticWorkOrders, SYNTHETIC_REFERENCE_DATE } from '../../shared/syntheticWorkOrders.js';

export interface AuthorizedSiteAggregate { readonly totalCount: number; readonly groups: readonly Readonly<{ site: string; count: number }>[]; }
export interface AuthorizedWorkOrderPreview { readonly totalCount: number; readonly records: readonly Readonly<{ id: string; site: string; status: string; priority: number; classification: string; location: string; asset: string | null; workType: string }>[]; }
export interface WorkOrderInvestigationDataPort { aggregateBySite(principal: AuthenticatedPrincipal): AuthorizedSiteAggregate; previewWorkOrders(principal: AuthenticatedPrincipal, request: Readonly<{ site?: string; offset: number }>): AuthorizedWorkOrderPreview; close(): void; }
export class SyntheticDatabaseError extends Error { constructor(readonly code: 'unavailable' | 'unauthorized' | 'invalid-request') { super(code); } }

const ORGANIZATION = 'ORG-ALPHA';
const PREVIEW_LIMIT = 20;
const profileScopes: readonly Readonly<{ username: string; allowed: number; sites: readonly string[] }>[] = [
  { username: 'axeon.admin', allowed: 1, sites: ['SITE-A', 'SITE-B', 'SITE-C', 'SITE-D', 'SITE-E', 'SITE-F'] },
  { username: 'site.a.user', allowed: 1, sites: ['SITE-A'] },
  { username: 'multi.site.user', allowed: 1, sites: ['SITE-A', 'SITE-C'] },
  { username: 'no.workorder.user', allowed: 0, sites: [] },
];

/** Explicit development operation: recreates only a deterministic fictitious SQLite fixture. */
export function initializeSyntheticDatabase(filePath: string): Readonly<{ workOrderCount: number; referenceTime: string }> {
  const database = new DatabaseSync(filePath);
  try {
    database.exec(`DROP TABLE IF EXISTS synthetic_principal_site_scope; DROP TABLE IF EXISTS synthetic_principal_authorization; DROP TABLE IF EXISTS work_orders;
      CREATE TABLE work_orders (wonum TEXT PRIMARY KEY, orgid TEXT NOT NULL, siteid TEXT NOT NULL, status TEXT NOT NULL, priority INTEGER NOT NULL, classification TEXT NOT NULL, location TEXT NOT NULL, asset TEXT, worktype TEXT NOT NULL, reportdate TEXT NOT NULL, statusdate TEXT NOT NULL, targetstart TEXT, targetfinish TEXT, actualstart TEXT, actualfinish TEXT);
      CREATE TABLE synthetic_principal_authorization (principal_username TEXT PRIMARY KEY, organization_id TEXT NOT NULL, can_investigate_work_orders INTEGER NOT NULL CHECK (can_investigate_work_orders IN (0, 1)));
      CREATE TABLE synthetic_principal_site_scope (principal_username TEXT NOT NULL, siteid TEXT NOT NULL, PRIMARY KEY (principal_username, siteid));
      CREATE INDEX work_orders_org_site_idx ON work_orders(orgid, siteid, wonum);`);
    const insertWorkOrder = database.prepare('INSERT INTO work_orders (wonum, orgid, siteid, status, priority, classification, location, asset, worktype, reportdate, statusdate, targetstart, targetfinish, actualstart, actualfinish) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertProfile = database.prepare('INSERT INTO synthetic_principal_authorization (principal_username, organization_id, can_investigate_work_orders) VALUES (?, ?, ?)');
    const insertScope = database.prepare('INSERT INTO synthetic_principal_site_scope (principal_username, siteid) VALUES (?, ?)');
    database.exec('BEGIN');
    try {
      for (const record of generateSyntheticWorkOrders()) insertWorkOrder.run(record.id, ORGANIZATION, record.site, record.status, record.priority, record.classification, record.location, record.asset, record.workType, record.reportDate, record.statusDate, record.targetStart, record.targetFinish, record.actualStart, record.actualFinish);
      for (const profile of profileScopes) { insertProfile.run(profile.username, ORGANIZATION, profile.allowed); for (const site of profile.sites) insertScope.run(profile.username, site); }
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
    return Object.freeze({ workOrderCount: generateSyntheticWorkOrders().length, referenceTime: SYNTHETIC_REFERENCE_DATE });
  } finally { database.close(); }
}

export function createSyntheticSqliteWorkOrderRepository(filePath: string): WorkOrderInvestigationDataPort {
  if (!existsSync(filePath)) throw new SyntheticDatabaseError('unavailable');
  let database: DatabaseSync;
  try { database = new DatabaseSync(filePath, { readOnly: true }); database.exec('PRAGMA query_only = ON; PRAGMA busy_timeout = 2000;'); } catch { throw new SyntheticDatabaseError('unavailable'); }
  const authorize = (principal: AuthenticatedPrincipal): readonly string[] => {
    const authorization = database.prepare('SELECT organization_id AS organizationId, can_investigate_work_orders AS allowed FROM synthetic_principal_authorization WHERE principal_username = ?').get(principal.username) as { organizationId?: string; allowed?: number } | undefined;
    if (!authorization || authorization.organizationId !== ORGANIZATION || authorization.allowed !== 1) throw new SyntheticDatabaseError('unauthorized');
    const sites = database.prepare('SELECT siteid AS site FROM synthetic_principal_site_scope WHERE principal_username = ? ORDER BY siteid').all(principal.username) as unknown as readonly { site: string }[];
    if (!sites.length || sites.some((row) => !/^[A-Z0-9-]{1,32}$/.test(row.site))) throw new SyntheticDatabaseError('unauthorized');
    return sites.map((row) => row.site);
  };
  const scopedWhere = (sites: readonly string[]) => ({ clause: `orgid = ? AND siteid IN (${sites.map(() => '?').join(', ')})`, values: [ORGANIZATION, ...sites] as SQLInputValue[] });
  return Object.freeze({
    aggregateBySite(principal: AuthenticatedPrincipal): AuthorizedSiteAggregate {
      const scope = scopedWhere(authorize(principal));
      const total = database.prepare(`SELECT COUNT(*) AS count FROM work_orders WHERE ${scope.clause}`).get(...scope.values) as { count: number };
      const groups = database.prepare(`SELECT siteid AS site, COUNT(*) AS count FROM work_orders WHERE ${scope.clause} GROUP BY siteid ORDER BY siteid`).all(...scope.values) as unknown as readonly { site: string; count: number }[];
      return Object.freeze({ totalCount: total.count, groups: Object.freeze(groups.map((group) => Object.freeze(group))) });
    },
    previewWorkOrders(principal: AuthenticatedPrincipal, request: Readonly<{ site?: string; offset: number }>): AuthorizedWorkOrderPreview {
      if (!Number.isInteger(request.offset) || request.offset < 0 || request.offset > 100_000 || (request.site !== undefined && !/^[A-Z0-9-]{1,32}$/.test(request.site))) throw new SyntheticDatabaseError('invalid-request');
      const sites = authorize(principal); if (request.site && !sites.includes(request.site)) throw new SyntheticDatabaseError('unauthorized');
      const scope = scopedWhere(request.site ? [request.site] : sites);
      const total = database.prepare(`SELECT COUNT(*) AS count FROM work_orders WHERE ${scope.clause}`).get(...scope.values) as { count: number };
      const rows = database.prepare(`SELECT wonum AS id, siteid AS site, status, priority, classification, location, asset, worktype AS workType FROM work_orders WHERE ${scope.clause} ORDER BY wonum LIMIT ? OFFSET ?`).all(...scope.values, PREVIEW_LIMIT, request.offset) as unknown as readonly { id: string; site: string; status: string; priority: number; classification: string; location: string; asset: string | null; workType: string }[];
      return Object.freeze({ totalCount: total.count, records: Object.freeze(rows.map((row) => Object.freeze(row))) });
    },
    close() { database.close(); },
  });
}
