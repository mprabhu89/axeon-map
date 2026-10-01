import { expect, test } from 'vitest';
import styles from '../styles.css?raw';

const printStyles = styles.slice(styles.indexOf('@media print'));

test('Investigation Report print contract targets A4 and hides application chrome and report actions', () => {
  expect(printStyles).toMatch(/@page\s*{\s*size:\s*A4;/);
  expect(printStyles).toContain('.app-shell > :not(.investigation-report-backdrop) { display: none !important; }');
  expect(printStyles).toContain('.report-screen-only { display: none !important; }');
});

test('print contract keeps headings with content and protects report cards from page splits', () => {
  expect(printStyles).toContain('.report-section-heading { break-after: avoid-page; page-break-after: avoid; }');
  expect(printStyles).toContain('.report-section-heading + * { break-before: avoid-page; page-break-before: avoid; }');
  expect(printStyles).toContain('.report-kpis { break-inside: avoid-page; page-break-inside: avoid; }');
  expect(printStyles).toContain('.report-kpi, .report-chart, .report-finding, .report-ai-section, .report-next-areas, .report-limitations { break-inside: avoid-page; page-break-inside: avoid; box-shadow: none; }');
});

test('compact closing content can flow into available page space', () => {
  expect(printStyles).toContain('.report-closing { break-inside: auto; page-break-inside: auto; }');
  expect(printStyles).toContain('.report-limitations { break-before: auto; page-break-before: auto; }');
  expect(printStyles).not.toMatch(/\.report-page-section\s*{[^}]*break-before:\s*page/);
});
