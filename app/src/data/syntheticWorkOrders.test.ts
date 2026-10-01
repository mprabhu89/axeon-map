import { expect, test } from 'vitest';
import { availableDimensions } from '../model/exploration';
import { createMockMaximoAdapter } from './mockMaximoAdapter';
import { MOCK_SECURITY_CONTEXT } from './maximoAdapter';
import { generateSyntheticWorkOrders, SYNTHETIC_REFERENCE_DATE } from './syntheticWorkOrders';

const records = generateSyntheticWorkOrders();
const referenceTime = Date.parse(SYNTHETIC_REFERENCE_DATE);
const daysOld = (date: string) => (referenceTime - Date.parse(date)) / 86_400_000;

test('synthetic evidence is repeatable and preserves the existing exploration population', () => {
  expect(records).toHaveLength(2000);
  expect(generateSyntheticWorkOrders()).toEqual(records);
  expect(records.filter((record) => record.site === 'SITE-A')).toHaveLength(560);
  expect(availableDimensions([])).toEqual(['Site', 'Status', 'Priority', 'Classification', 'Location', 'Asset']);
  expect(availableDimensions([])).not.toContain('Work Type');
});

test('work types vary without dominating every site', () => {
  const counts = ['PM', 'CM', 'EM'].map((type) => records.filter((record) => record.workType === type).length);
  expect(records.every((record) => ['PM', 'CM', 'EM'].includes(record.workType))).toBe(true);
  expect(counts.reduce((sum, count) => sum + count, 0)).toBe(2000);
  expect(counts[1]).toBeGreaterThan(counts[0]!);
  expect(counts[0]).toBeGreaterThan(counts[2]!);
  expect(records.filter((record) => record.site === 'SITE-A' && record.workType === 'PM').length).toBeGreaterThan(0);
  expect(records.filter((record) => record.site === 'SITE-D' && record.workType === 'PM').length).toBeGreaterThan(0);
});

test('report, status, target, and actual dates respect lifecycle order and allow unavailable values', () => {
  expect(records.some((record) => record.targetStart === null && record.targetFinish === null)).toBe(true);
  expect(records.some((record) => record.targetFinish && Date.parse(record.targetFinish) > referenceTime)).toBe(true);
  expect(records.some((record) => record.targetFinish && Date.parse(record.targetFinish) < referenceTime)).toBe(true);
  for (const record of records) {
    const report = Date.parse(record.reportDate);
    const status = Date.parse(record.statusDate);
    expect(Number.isFinite(report) && Number.isFinite(status)).toBe(true);
    expect(report).toBeLessThanOrEqual(status);
    expect(status).toBeLessThanOrEqual(referenceTime);
    if (record.targetStart) {
      expect(Date.parse(record.targetStart)).toBeGreaterThanOrEqual(report);
      expect(record.targetFinish).not.toBeNull();
      expect(Date.parse(record.targetFinish!)).toBeGreaterThan(Date.parse(record.targetStart));
    } else {
      expect(record.targetFinish).toBeNull();
    }
    if (record.status === 'WAPPR' || record.status === 'WSCH') {
      expect(record.actualStart).toBeNull();
      expect(record.actualFinish).toBeNull();
    } else {
      expect(record.actualStart).not.toBeNull();
      expect(Date.parse(record.actualStart!)).toBeGreaterThanOrEqual(report);
      expect(Date.parse(record.actualStart!)).toBeLessThanOrEqual(status);
      if (record.status === 'COMP') {
        expect(record.actualFinish).not.toBeNull();
        expect(Date.parse(record.actualFinish!)).toBeGreaterThanOrEqual(Date.parse(record.actualStart!));
        expect(Date.parse(record.actualFinish!)).toBeLessThanOrEqual(status);
      } else {
        expect(record.actualFinish).toBeNull();
      }
    }
  }
});

test('a plausible subset of SITE-A Electrical approvals carries an aging signal', () => {
  const population = records.filter((record) => record.site === 'SITE-A'
    && record.classification === 'Electrical' && record.status === 'WAPPR');
  const aged = population.filter((record) => daysOld(record.statusDate) >= 90
    && record.targetFinish && Date.parse(record.targetFinish) < referenceTime);
  expect(aged.length).toBeGreaterThan(15);
  expect(aged.length).toBeLessThan(population.length / 2);
  expect(population.some((record) => daysOld(record.statusDate) < 45)).toBe(true);
  expect(generateSyntheticWorkOrders().filter((record) => record.site === 'SITE-A'
    && record.classification === 'Electrical' && record.status === 'WAPPR'
    && daysOld(record.statusDate) >= 90)).toHaveLength(aged.length);
});

test('A-PUMP-01 has repeat reactive work within a short historical window', () => {
  const assetHistory = records.filter((record) => record.asset === 'A-PUMP-01');
  const recentReactive = assetHistory.filter((record) => record.workType !== 'PM'
    && daysOld(record.reportDate) <= 31);
  expect(recentReactive.length).toBeGreaterThan(8);
  expect(recentReactive.length).toBeLessThan(assetHistory.length);
  expect(new Set(recentReactive.map((record) => record.id)).size).toBe(recentReactive.length);
});

test('a SITE-C scheduled PM subset has a long current-status interval', () => {
  const scheduled = records.filter((record) => record.site === 'SITE-C' && record.status === 'WSCH');
  const longPm = scheduled.filter((record) => record.workType === 'PM'
    && daysOld(record.statusDate) >= 75);
  expect(longPm.length).toBeGreaterThan(5);
  expect(longPm.length).toBeLessThan(scheduled.length);
  expect(scheduled.some((record) => daysOld(record.statusDate) < 45)).toBe(true);
});

test('SITE-D has a higher reactive share than the overall population', () => {
  const siteD = records.filter((record) => record.site === 'SITE-D');
  const reactiveShare = (sample: typeof records) => sample.filter((record) => record.workType !== 'PM').length / sample.length;
  expect(reactiveShare(siteD)).toBeGreaterThan(reactiveShare(records) + 0.08);
  expect(reactiveShare(siteD)).toBeLessThan(0.95);
});

test('analytical evidence stays behind the adapter and existing preview/export DTOs stay unchanged', async () => {
  const adapter = createMockMaximoAdapter(records);
  const preview = await adapter.previewRecords({ path: [], maxRecords: 20, offset: 0, securityScope: MOCK_SECURITY_CONTEXT });
  expect(preview.totalCount).toBe(2000);
  expect(preview.records).toHaveLength(20);
  expect(Object.keys(preview.records[0]!).sort()).toEqual(['asset', 'classification', 'id', 'location', 'priority', 'site', 'status']);
  const exported = await adapter.exportRecords({ path: [{ dimension: 'Site', value: 'SITE-A' }], securityScope: MOCK_SECURITY_CONTEXT });
  expect(exported.recordCount).toBe(560);
  expect(exported.content.split('\r\n')[0]).toBe('\uFEFF"Work Order","Site","Status","Priority","Classification","Location","Asset"');
  expect(exported.content).not.toContain('reportDate');
  expect(exported.content).not.toContain('workType');
});

