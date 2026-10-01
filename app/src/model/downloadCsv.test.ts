import { expect, test, vi } from 'vitest';
import { downloadCsv } from './downloadCsv';

test('download helper creates a CSV file link only when invoked', async () => {
  const create = vi.fn(() => 'blob:axeon-test');
  const revoke = vi.fn();
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('axeon-work-orders-site-site-a.csv');
    expect(this.href).toBe('blob:axeon-test');
  });
  try {
    expect(create).not.toHaveBeenCalled();
    downloadCsv({
      fileName: 'axeon-work-orders-site-site-a.csv',
      contentType: 'text/csv',
      content: '\uFEFF"Work Order"\r\n"WO-1"\r\n',
      recordCount: 1,
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revoke).toHaveBeenCalledWith('blob:axeon-test');
  } finally {
    click.mockRestore();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreate });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevoke });
  }
});
