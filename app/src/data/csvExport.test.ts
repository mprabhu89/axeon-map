import { expect, test } from 'vitest';
import { csvDocument, csvRecord, exportFileName } from './csvExport';

test('CSV quotes commas, double quotes, line breaks and protects spreadsheet formulas', () => {
  const row = csvRecord({
    id: '=2+2', site: 'SITE,"A"', status: 'WAPPR', priority: 1,
    classification: 'Line 1\nLine 2', location: '@unsafe', asset: 'A-PUMP-01',
  });
  expect(row).toBe("\"'=2+2\",\"SITE,\"\"A\"\"\",\"WAPPR\",\"1\",\"Line 1\nLine 2\",\"'@unsafe\",\"A-PUMP-01\"");
  expect(csvDocument([row])).toBe('\uFEFF' + '"Work Order","Site","Status","Priority","Classification","Location","Asset"' + '\r\n' + row + '\r\n');
});

test('CSV neutralizes every formula-leading character, including whitespace-prefixed values', () => {
  const row = csvRecord({
    id: '+SUM(A1:A2)', site: '-1+2', status: ' @unsafe', priority: 1,
    classification: ' =cmd()', location: 'SITE-A', asset: 'A-PUMP-01',
  });
  expect(row).toContain("\"'+SUM(A1:A2)\"");
  expect(row).toContain("\"'-1+2\"");
  expect(row).toContain("\"' @unsafe\"");
  expect(row).toContain("\"' =cmd()\"");
});

test('filename sanitizes path values', () => {
  expect(exportFileName([{ dimension: 'Site', value: '../SITE A: \\danger' }])).toBe('axeon-work-orders-site-site-a-danger.csv');
});
