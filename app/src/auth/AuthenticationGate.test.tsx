import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AuthenticationGate } from './AuthenticationGate';

const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => { vi.unstubAllGlobals(); });

test('authentication gate requires a session, signs in explicitly, and signs out without browser storage', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(response(401, { error: { code: 'session-expired', message: 'Your session has expired. Please sign in again.' } }))
    .mockResolvedValueOnce(response(200, { principal: { subjectId: 'admin-1', username: 'axeon.admin', role: 'administrator', authenticationMethod: 'password-session', issuedAt: '2026-01-01T00:00:00.000Z' }, csrfToken: 'csrf-token' }))
    .mockResolvedValueOnce(response(204, undefined));
  vi.stubGlobal('fetch', fetch);
  render(<AuthenticationGate><p>Protected investigation</p></AuthenticationGate>);
  expect(await screen.findByText('Your session has expired. Please sign in again.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'axeon.admin' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A-strong-local-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Protected investigation')).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({ method: 'POST', credentials: 'same-origin' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign out of Axeon Map' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in to Axeon Map' })).toBeTruthy());
  expect(fetch).toHaveBeenLastCalledWith('/api/v1/auth/logout', expect.objectContaining({ headers: { 'X-CSRF-Token': 'csrf-token' } }));
  expect(localStorage.length).toBe(0);
});
