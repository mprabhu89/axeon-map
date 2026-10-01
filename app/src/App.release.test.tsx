import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { App } from './App';
import { mockMaximoAdapter } from './data/mockMaximoAdapter';
import { AXEON_RELEASE, axeonVersionLabel } from './product/releaseMetadata';

afterEach(cleanup);

test('main application displays the central Axeon product version unobtrusively', async () => {
  render(<App adapter={mockMaximoAdapter} />);
  await screen.findByRole('button', { name: 'Select Work Orders, 2,000 Work Orders' });
  const footer = screen.getByRole('contentinfo', { name: 'Product version' });
  expect(footer.textContent).toBe(axeonVersionLabel());
  expect(footer.textContent).toContain(AXEON_RELEASE.version);
});
