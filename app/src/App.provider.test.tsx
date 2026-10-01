import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { mockMaximoAdapter } from './data/mockMaximoAdapter';

afterEach(cleanup);
const panel = () => screen.getByRole('complementary', { name: 'Selected node details' });

async function inspectSiteD() {
  fireEvent.click(await screen.findByRole('button', { name: 'Site' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Select SITE-D, [\d,]+ Work Orders$/ }));
  await within(panel()).findByText('85.4% reactive');
}

test('provider status surface shows Mock active and all future adapters not configured without credential entry', () => {
  render(<App adapter={mockMaximoAdapter} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open AI provider settings' }));
  const dialog = screen.getByRole('dialog', { name: 'AI Provider' });
  expect(within(dialog).getAllByText('Mock AI Provider').length).toBeGreaterThan(0);
  expect(within(dialog).getAllByText('ACTIVE').length).toBeGreaterThan(0);
  for (const name of ['IBM watsonx', 'Azure OpenAI', 'OpenAI', 'AWS Bedrock', 'Google Vertex AI', 'Compatible Enterprise Provider']) {
    expect(within(dialog).getByText(name)).toBeTruthy();
  }
  expect(within(dialog).getAllByText('Not configured')).toHaveLength(6);
  expect(within(dialog).queryByRole('textbox')).toBeNull();
  expect(within(dialog).queryByText(/API key|client secret|password/i)).toBeNull();
});

test('AI disabled leaves deterministic findings and investigation available while execution controls are disabled', async () => {
  render(<App adapter={mockMaximoAdapter} aiConfiguration={{ enabled: false, selectedProviderId: 'mock' }} />);
  await inspectSiteD();
  expect(within(panel()).getByText('85.4% reactive')).toBeTruthy();
  expect(within(panel()).getByRole('button', { name: 'Open Records' }).hasAttribute('disabled')).toBe(false);
  expect(within(panel()).getByRole('button', { name: 'Ask Axeon' }).hasAttribute('disabled')).toBe(true);
  expect(within(panel()).getByRole('button', { name: 'Focus Axeon question' }).hasAttribute('disabled')).toBe(true);
  expect(within(panel()).getAllByText(/Generative AI is disabled/).length).toBeGreaterThan(0);
  expect(screen.getByRole('navigation', { name: 'Investigation path' }).textContent).toBe('Work Orders');
});

test('unconfigured provider is identified honestly and does not execute Mock AI', async () => {
  render(<App adapter={mockMaximoAdapter} aiConfiguration={{ enabled: true, selectedProviderId: 'openai' }} />);
  await inspectSiteD();
  expect(screen.getByRole('button', { name: 'Open AI provider settings' }).textContent).toContain('OpenAI');
  expect(within(panel()).getAllByText('OpenAI is not configured for this deployment.').length).toBeGreaterThan(0);
  expect(within(panel()).getByRole('button', { name: 'Ask Axeon' }).hasAttribute('disabled')).toBe(true);
  expect(within(panel()).getByLabelText('Axeon AI response').textContent).not.toContain('Deterministic Mock AI Provider');
  fireEvent.click(screen.getByRole('button', { name: 'Open AI provider settings' }));
  expect(within(screen.getByRole('dialog', { name: 'AI Provider' })).getAllByText('NOT CONFIGURED').length).toBeGreaterThan(0);
});
