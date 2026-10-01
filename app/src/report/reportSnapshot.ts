import { dimensions, type Dimension, type PathSegment } from '../model/exploration';
import { filterDimensions, type InvestigationFilter } from '../model/investigationContext';
import type { InvestigationReport, ReportChart, ReportFinding, ReportKPI } from './contracts';
import { axeonLogger } from '../support/logger';

export const REPORT_SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const REPORT_SNAPSHOT_NAMESPACE = 'axeon:report-snapshot:';
export const REPORT_SNAPSHOT_INDEX_KEY = 'axeon:report-snapshots:index';
export const REPORT_SNAPSHOT_TTL_MS = 30 * 60 * 1_000;
export const REPORT_SNAPSHOT_LIMIT = 6;
export const REPORT_SNAPSHOT_MAX_BYTES = 256 * 1_024;

interface ReportSnapshotEnvelope {
  schemaVersion: typeof REPORT_SNAPSHOT_SCHEMA_VERSION;
  reportId: string;
  createdAt: number;
  expiresAt: number;
  report: InvestigationReport;
}

interface SnapshotIndexEntry { reportId: string; expiresAt: number }
export type ReportSnapshotRead = { status: 'ready'; report: InvestigationReport }
  | { status: 'missing' | 'invalid' | 'expired' };

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, maximum = 2_000): value is string => typeof value === 'string' && value.length > 0 && value.length <= maximum;
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const semanticVersion = (value: unknown): value is string => typeof value === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
const reportIdPattern = /^[0-9A-Za-z-]{8,80}$/;
const forbiddenSnapshotKeys = new Set(['records', 'credentials', 'tokens', 'passwords', 'secrets']);

function containsForbiddenSnapshotKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenSnapshotKey);
  if (!object(value)) return false;
  return Object.entries(value).some(([key, entry]) => forbiddenSnapshotKeys.has(key.toLowerCase()) || containsForbiddenSnapshotKey(entry));
}

function validPath(value: unknown): value is readonly PathSegment[] {
  if (!Array.isArray(value) || value.length > dimensions.length) return false;
  const used = new Set<string>();
  return value.every((item) => {
    if (!object(item) || !dimensions.includes(item.dimension as Dimension) || !text(item.value, 200) || used.has(item.dimension as string)) return false;
    used.add(item.dimension as string);
    return true;
  });
}

function validFilters(value: unknown): value is readonly InvestigationFilter[] {
  if (!Array.isArray(value) || value.length > filterDimensions.length) return false;
  const used = new Set<string>();
  return value.every((item) => {
    if (!object(item) || !filterDimensions.includes(item.dimension as InvestigationFilter['dimension']) || used.has(item.dimension as string)
      || !Array.isArray(item.values) || item.values.length === 0 || item.values.length > 50 || !item.values.every((entry) => text(entry, 200))) return false;
    used.add(item.dimension as string);
    return true;
  });
}

const validKPI = (value: unknown): value is ReportKPI => object(value) && text(value.id, 200) && text(value.label)
  && number(value.value) && text(value.displayValue) && text(value.detail);

const validChart = (value: unknown): value is ReportChart => object(value) && text(value.id, 200)
  && ['ranked-bar', 'composition', 'comparison'].includes(String(value.kind)) && text(value.title) && text(value.description)
  && text(value.ariaLabel, 5_000) && Array.isArray(value.values) && value.values.length <= 8
  && value.values.every((entry) => object(entry) && text(entry.label) && number(entry.value))
  && ['contextual-aggregate', 'deterministic-finding'].includes(String(value.source));

const validFinding = (value: unknown): value is ReportFinding => object(value) && text(value.id) && text(value.ruleId)
  && text(value.lens) && text(value.title) && ['info', 'attention', 'elevated'].includes(String(value.severity))
  && object(value.metric) && text(value.metric.key) && number(value.metric.value) && text(value.metric.unit)
  && number(value.affectedCount) && number(value.populationCount) && Array.isArray(value.thresholds) && value.thresholds.length <= 12
  && (value.comparison === undefined || (object(value.comparison) && text(value.comparison.key) && number(value.comparison.value) && text(value.comparison.unit)))
  && value.thresholds.every((threshold) => object(threshold) && text(threshold.key) && text(threshold.operator, 20)
    && (number(threshold.value) || text(threshold.value, 200)) && text(threshold.unit, 100))
  && object(value.evidence) && Object.keys(value.evidence).length <= 30
  && Object.values(value.evidence).every((entry) => number(entry) || text(entry, 2_000)) && text(value.referenceTime);

const validAIInterpretation = (value: unknown) => object(value) && text(value.question, 2_000) && text(value.answer, 10_000)
  && ['grounded', 'limited-evidence'].includes(String(value.groundingStatus))
  && Array.isArray(value.evidenceReferences) && value.evidenceReferences.length <= 20
  && value.evidenceReferences.every((reference) => object(reference) && text(reference.findingId) && text(reference.lens) && text(reference.title))
  && Array.isArray(value.nextChecks) && value.nextChecks.length <= 10 && value.nextChecks.every((entry) => text(entry, 2_000))
  && Array.isArray(value.limitations) && value.limitations.length <= 10 && value.limitations.every((entry) => text(entry, 5_000));

export function isValidInvestigationReport(value: unknown): value is InvestigationReport {
  if (!object(value) || containsForbiddenSnapshotKey(value)) return false;
  const context = value.context;
  const release = value.release;
  const security = value.securityScope;
  const provenance = value.provenance;
  return value.schemaVersion === 1 && value.title === 'Operational Investigation Report'
    && object(release) && release.productName === 'Axeon Map' && semanticVersion(release.version)
    && ['development', 'release-candidate', 'stable'].includes(String(release.channel))
    && object(context) && validPath(context.path) && validFilters(context.filters)
    && Array.isArray(context.pathLabels) && context.pathLabels.length === context.path.length + 1 && context.pathLabels.every((entry) => text(entry, 200))
    && (context.nodeType === 'Work Orders' || dimensions.includes(context.nodeType as Dimension)) && text(context.nodeLabel, 200)
    && number(context.population) && context.population >= 0
    && object(security) && security.kind === 'current-user' && text(security.enforcement, 50) && text(security.source, 50) && security.label === 'Current permitted data'
    && text(value.generatedAt) && Number.isFinite(Date.parse(value.generatedAt))
    && (value.referenceTime === null || (text(value.referenceTime) && Number.isFinite(Date.parse(value.referenceTime))))
    && object(provenance) && ['synthetic-local', 'real-maximo'].includes(String(provenance.mode)) && text(provenance.label)
    && typeof provenance.authorizedRealMaximoData === 'boolean'
    && Array.isArray(value.kpis) && value.kpis.length <= 12 && value.kpis.every(validKPI)
    && Array.isArray(value.charts) && value.charts.length <= 6 && value.charts.every(validChart)
    && Array.isArray(value.findings) && value.findings.length <= 20 && value.findings.every(validFinding)
    && (value.aiInterpretation === undefined || validAIInterpretation(value.aiInterpretation))
    && Array.isArray(value.suggestedNextAreas) && value.suggestedNextAreas.length <= 10 && value.suggestedNextAreas.every((entry) => text(entry))
    && Array.isArray(value.limitations) && value.limitations.length <= 10 && value.limitations.every((entry) => text(entry, 5_000));
}

const keyFor = (reportId: string) => `${REPORT_SNAPSHOT_NAMESPACE}${reportId}`;

function readIndex(storage: Storage): SnapshotIndexEntry[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(REPORT_SNAPSHOT_INDEX_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((entry): entry is SnapshotIndexEntry => object(entry)
      && reportIdPattern.test(String(entry.reportId)) && number(entry.expiresAt)) : [];
  } catch { return []; }
}

export function cleanupReportSnapshots(storage: Storage, now = Date.now()): void {
  const active = readIndex(storage).filter((entry) => {
    if (entry.expiresAt <= now) { storage.removeItem(keyFor(entry.reportId)); return false; }
    return storage.getItem(keyFor(entry.reportId)) !== null;
  });
  while (active.length > REPORT_SNAPSHOT_LIMIT) {
    const removed = active.shift();
    if (removed) storage.removeItem(keyFor(removed.reportId));
  }
  storage.setItem(REPORT_SNAPSHOT_INDEX_KEY, JSON.stringify(active));
}

export function writeReportSnapshot(storage: Storage, reportId: string, report: InvestigationReport, now = Date.now()): void {
  if (!reportIdPattern.test(reportId) || !isValidInvestigationReport(report)) {
    axeonLogger.security({ eventCode: 'AX-SEC-REPORT-SNAPSHOT-REJECTED', component: 'report', operation: 'write-snapshot', result: 'rejected' });
    throw new Error('Invalid report snapshot.');
  }
  cleanupReportSnapshots(storage, now);
  const envelope: ReportSnapshotEnvelope = { schemaVersion: REPORT_SNAPSHOT_SCHEMA_VERSION, reportId, createdAt: now, expiresAt: now + REPORT_SNAPSHOT_TTL_MS, report };
  const serialized = JSON.stringify(envelope);
  if (new TextEncoder().encode(serialized).byteLength > REPORT_SNAPSHOT_MAX_BYTES) {
    axeonLogger.security({ eventCode: 'AX-SEC-REPORT-SNAPSHOT-REJECTED', component: 'report', operation: 'write-snapshot', result: 'rejected' });
    throw new Error('Report snapshot exceeds the allowed size.');
  }
  storage.setItem(keyFor(reportId), serialized);
  const next = [...readIndex(storage).filter((entry) => entry.reportId !== reportId), { reportId, expiresAt: envelope.expiresAt }];
  while (next.length > REPORT_SNAPSHOT_LIMIT) {
    const removed = next.shift();
    if (removed) storage.removeItem(keyFor(removed.reportId));
  }
  storage.setItem(REPORT_SNAPSHOT_INDEX_KEY, JSON.stringify(next));
}

export function readReportSnapshot(storage: Storage, reportId: string, now = Date.now()): ReportSnapshotRead {
  if (!reportIdPattern.test(reportId)) {
    axeonLogger.security({ eventCode: 'AX-SEC-REPORT-SNAPSHOT-REJECTED', component: 'report', operation: 'read-snapshot', result: 'rejected' });
    return { status: 'invalid' };
  }
  const serialized = storage.getItem(keyFor(reportId));
  if (serialized === null) return { status: 'missing' };
  if (new TextEncoder().encode(serialized).byteLength > REPORT_SNAPSHOT_MAX_BYTES) {
    axeonLogger.security({ eventCode: 'AX-SEC-REPORT-SNAPSHOT-REJECTED', component: 'report', operation: 'read-snapshot', result: 'rejected' });
    return { status: 'invalid' };
  }
  try {
    const envelope: unknown = JSON.parse(serialized);
    if (!object(envelope) || envelope.schemaVersion !== REPORT_SNAPSHOT_SCHEMA_VERSION || envelope.reportId !== reportId
      || !number(envelope.createdAt) || !number(envelope.expiresAt) || !isValidInvestigationReport(envelope.report)) {
      axeonLogger.security({ eventCode: 'AX-SEC-REPORT-SNAPSHOT-REJECTED', component: 'report', operation: 'read-snapshot', result: 'rejected' });
      return { status: 'invalid' };
    }
    if (envelope.expiresAt <= now) { storage.removeItem(keyFor(reportId)); return { status: 'expired' }; }
    return { status: 'ready', report: envelope.report };
  } catch {
    axeonLogger.security({ eventCode: 'AX-SEC-REPORT-SNAPSHOT-REJECTED', component: 'report', operation: 'read-snapshot', result: 'rejected' });
    return { status: 'invalid' };
  }
}

export function createReportId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}
