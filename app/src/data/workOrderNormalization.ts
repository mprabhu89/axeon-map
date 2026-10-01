import type { WorkOrderExportRecord, WorkOrderPreviewRecord } from './maximoAdapter';
import type { WorkOrderAnalyticalEvidence } from './workOrderEvidence';

const textOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return text || null;
};

const category = (value: unknown): string => textOrNull(value) ?? '(Unspecified)';

export function normalizePriority(value: unknown): number | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return textOrNull(value);
}

export function normalizePreviewRecord(record: Readonly<Record<string, unknown>>): WorkOrderPreviewRecord {
  return {
    id: textOrNull(record.id), site: textOrNull(record.site), status: textOrNull(record.status),
    priority: normalizePriority(record.priority), classification: textOrNull(record.classification),
    location: textOrNull(record.location), asset: textOrNull(record.asset),
  };
}

export function normalizeExportRecord(record: Readonly<Record<string, unknown>>): WorkOrderExportRecord {
  return normalizePreviewRecord(record);
}

export function normalizeAnalyticalEvidence(record: Readonly<Record<string, unknown>>): WorkOrderAnalyticalEvidence {
  return {
    id: category(record.id), site: category(record.site), status: category(record.status),
    priority: normalizePriority(record.priority), classification: category(record.classification),
    location: category(record.location), asset: textOrNull(record.asset), workType: category(record.workType),
    reportDate: category(record.reportDate), statusDate: category(record.statusDate),
    targetStart: textOrNull(record.targetStart), targetFinish: textOrNull(record.targetFinish),
    actualStart: textOrNull(record.actualStart), actualFinish: textOrNull(record.actualFinish),
  };
}
