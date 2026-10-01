import { expect, test } from 'vitest';
import packageMetadata from '../../package.json';
import appFooterSource from '../components/AppFooter.tsx?raw';
import reportSource from '../components/InvestigationReport.tsx?raw';
import { AXEON_RELEASE, axeonVersionLabel, type ProductReleaseMetadata } from './releaseMetadata';

test('central release metadata identifies the development product version', () => {
  const typed: ProductReleaseMetadata = AXEON_RELEASE;
  expect(typed).toEqual({ productName: 'Axeon Map', version: '1.0.0-dev', channel: 'development' });
  expect(packageMetadata.version).toBe(typed.version);
  expect(axeonVersionLabel()).toBe('AXEON MAP · Version 1.0.0-dev');
});

test('application and report presentation contain no independent version literal', () => {
  expect(appFooterSource).toContain('axeonVersionLabel');
  expect(reportSource).toContain('load.report.release.version');
  expect(appFooterSource).not.toContain('1.0.0-dev');
  expect(reportSource).not.toContain('1.0.0-dev');
});
