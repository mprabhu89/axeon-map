import type { PathSegment } from '../model/exploration';
import { axeonLogger } from '../support/logger';
import type { WorkOrderExportRecord } from './maximoAdapter';

type ExportRecord = WorkOrderExportRecord;

const headers = ['Work Order', 'Site', 'Status', 'Priority', 'Classification', 'Location', 'Asset'];

function cell(value: string | number | null): string {
  const raw = value === null ? '' : String(value);
  // Prevent spreadsheet formula execution when future Maximo text is exported.
  const formulaLike = /^[\s]*[=+@-]/.test(raw);
  if (formulaLike) {
    axeonLogger.security({
      eventCode: 'AX-SEC-CSV-FORMULA-SANITIZED', component: 'export', operation: 'serialize-csv-cell', result: 'sanitized',
    });
  }
  const safe = formulaLike ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function slug(value: string): string {
  return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'value';
}

export function exportFileName(path: readonly PathSegment[]): string {
  const context = path.map(({ dimension, value }) => `${slug(dimension)}-${slug(value)}`).join('-').slice(0, 100);
  return `axeon-work-orders${context ? `-${context}` : ''}.csv`;
}

export function csvHeader(): string {
  return headers.map(cell).join(',');
}

export function csvRecord(record: ExportRecord): string {
  return [record.id, record.site, record.status, record.priority, record.classification, record.location, record.asset]
    .map(cell).join(',');
}

export function csvDocument(rows: readonly string[]): string {
  return `\uFEFF${csvHeader()}\r\n${rows.join('\r\n')}${rows.length > 0 ? '\r\n' : ''}`;
}
