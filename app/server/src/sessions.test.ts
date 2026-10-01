// @vitest-environment node
import { expect, test } from 'vitest';
import { createSessionManager, csrfTokenMatches } from './sessions.js';

const principal = { subjectId: 'user-1', username: 'axeon.user', role: 'user' as const, authenticationMethod: 'password-session' as const, issuedAt: '2026-01-01T00:00:00.000Z' };
test('server sessions expire after inactivity, rotate identifiers, and validate CSRF tokens', () => {
  let clock = 1_000;
  const sessions = createSessionManager({ maxLifetimeMs: 10_000, inactivityTimeoutMs: 1_000, now: () => clock });
  const first = sessions.create(principal); const second = sessions.create(principal);
  expect(first.id).not.toBe(second.id); expect(first.csrfToken).not.toBe(second.csrfToken);
  expect(csrfTokenMatches(first, first.csrfToken)).toBe(true); expect(csrfTokenMatches(first, 'wrong-token')).toBe(false);
  clock += 1_001;
  expect(sessions.resolve(first.id)).toMatchObject({ status: 'expired' });
  sessions.destroy(second.id); expect(sessions.resolve(second.id)).toMatchObject({ status: 'missing' });
});

test('server sessions also enforce their absolute expiry despite valid activity', () => {
  let clock = 0;
  const sessions = createSessionManager({ maxLifetimeMs: 1_000, inactivityTimeoutMs: 10_000, now: () => clock });
  const session = sessions.create(principal);
  clock = 999; expect(sessions.resolve(session.id)).toMatchObject({ status: 'active' });
  clock = 1_000; expect(sessions.resolve(session.id)).toMatchObject({ status: 'expired' });
});
