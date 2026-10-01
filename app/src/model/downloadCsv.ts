import type { RecordExportResponse } from '../data/maximoAdapter';

export function downloadCsv(exported: RecordExportResponse): void {
  const blob = new Blob([exported.content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exported.fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
